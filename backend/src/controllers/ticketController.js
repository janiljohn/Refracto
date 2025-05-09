const Ticket = require('../models/Ticket');
const { MultiServerMCPClient } = require("@langchain/mcp-adapters");
const { ChatAnthropic } = require("@langchain/anthropic");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");

// Store active sessions
const activeSessions = new Map();

async function getOrCreateSession(ticketId) {
  if (activeSessions.has(ticketId)) {
    return activeSessions.get(ticketId);
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",

    mcpServers: {
      fetch: {
        transport: "stdio",
        command: "uvx",
        args: ["mcp-server-fetch"],
        restart: {
          enabled: true,
          maxAttempts: 3,
          delayMs: 1000,
        },
      },

      filesystem: {
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", process.env.CAP_REPO_PATH],
      },
      graph: {
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
      },
      qdrant: {
        transport: "stdio",
        command: "uv",
        // args: ["run", "/Users/C5395253/Desktop/Qdrant_docs/qdrant-docs/.venv/bin/qdrant-docs"]
        args: ["run", process.env.QDRANT_BIN]
      }
    },
  });
  const tools = await client.getTools();
  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20240620",
    temperature: 0,
  });

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  const session = { agent, client, conversationHistory: [] };
  activeSessions.set(ticketId, session);
  return session;
}

async function generateCode(ticketId) {
  try {
    await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    const session = await getOrCreateSession(ticketId);
    const ticket = await Ticket.findById(ticketId);

    // Generate code using the ticket details
    const response = await session.agent.invoke({
      messages: [{
        role: "user",
        content: JSON.stringify({
          intent: ticket.intent,
          trigger: ticket.trigger,
          rules: ticket.rules,
          output: ticket.output,
          notes: ticket.notes
        })
      }]
    });

    // Store conversation history
    session.conversationHistory = response.messages;

    await Ticket.findByIdAndUpdate(ticketId, {
      status: 'completed',
      generatedCode: response.messages[response.messages.length - 1].content,
      testCases: '// Test cases will be generated in a separate step'
    });

  } catch (error) {
    console.error('Code generation failed:', error);
    await Ticket.findByIdAndUpdate(ticketId, { 
      status: 'failed',
      generatedCode: `// Error: ${error.message}`
    });
  }
}

// Refine code with chat
async function refineCode(ticketId, prompt) {
  try {
    const session = await getOrCreateSession(ticketId);
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const response = await session.agent.invoke({
      messages: [
        ...session.conversationHistory,
        {
          role: "user",
          content: prompt
        }
      ]
    });

    // Update conversation history
    session.conversationHistory = response.messages;

    // Update ticket with refined code
    await Ticket.findByIdAndUpdate(ticketId, {
      generatedCode: response.messages[response.messages.length - 1].content
    });

    return { success: true, message: 'Code refined successfully' };
  } catch (error) {
    console.error('Code refinement failed:', error);
    return { success: false, error: error.message };
  }
}

// Cleanup session when ticket is deleted
async function cleanupSession(ticketId) {
  const session = activeSessions.get(ticketId);
  if (session) {
    await session.client.close();
    activeSessions.delete(ticketId);
  }
}

// Get all tickets
ticketController = {
  getTickets: async (req, res) => {
    try {
      const tickets = await Ticket.find();
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Get single ticket
  getTicket: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Create ticket
  createTicket: async (req, res) => {
    try {
      console.log('Received body:', req.body);
      const ticket = new Ticket(req.body);
      await ticket.save();
      // Kick off async code generation
      generateCode(ticket._id);
      res.status(201).json(ticket);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Refine code
  refineTicket: async (req, res) => {
    try {
      const prompt = req.body.toString();
      const result = await refineCode(req.params.id, prompt);
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Update ticket
  updateTicket: async (req, res) => {
    try {
      const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      res.json(ticket);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Delete ticket
  deleteTicket: async (req, res) => {
    try {
      const ticket = await Ticket.findByIdAndDelete(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      await cleanupSession(req.params.id);
      res.json({ message: 'Ticket deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = ticketController; 