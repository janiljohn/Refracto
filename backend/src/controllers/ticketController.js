const Ticket = require('../models/Ticket');
const { MultiServerMCPClient } = require("@langchain/mcp-adapters");
const { ChatAnthropic } = require("@langchain/anthropic");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const fs = require('fs').promises;
const path = require('path');

// Store active sessions
const activeSessions = new Map();

// Global context management
let GLOBAL_CONTEXT = null;

// Function to load context from file
async function loadContext(contextFilePath) {
  try {
    const fileContent = await fs.readFile(contextFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading context file:', error.message);
    console.log('Using default context instead.');
    return {
      projectInfo: {
        name: "Default Project",
        version: "1.0.0",
        environment: "development"
      },
      systemInstructions: "You are an AI assistant. Please help the user with their queries."
    };
  }
}

// Function to generate system message from context
function generateSystemMessage(context) {
  if (context.systemInstructions) {
    return context.systemInstructions + '\n\nProject Context:\n' +
           JSON.stringify(context, null, 2);
  }
  return `You are an AI assistant with access to the following context:
${JSON.stringify(context, null, 2)}

Please use this context when providing assistance and ensure all operations comply with any specified rules.`;
}

// Initialize global context
async function initializeGlobalContext() {
  const contextPath = path.join(process.cwd(), 'agent-context.json');
  GLOBAL_CONTEXT = await loadContext(contextPath);
  console.log('Global context initialized from:', contextPath);
}

// Call initialization
initializeGlobalContext().catch(console.error);

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

  // Initialize conversation history with system message
  const systemMessage = generateSystemMessage(GLOBAL_CONTEXT);
  const session = { 
    agent, 
    client, 
    conversationHistory: [{ role: "system", content: systemMessage }] 
  };
  activeSessions.set(ticketId, session);
  return session;
}

async function generateCode(ticketId) {
  try {
    await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    const session = await getOrCreateSession(ticketId);
    const ticket = await Ticket.findById(ticketId);

    // Generate code using the ticket details and context
    const codeResponse = await session.agent.invoke({
      messages: [
        ...session.conversationHistory,
        {
          role: "user",
          content: JSON.stringify({
            intent: ticket.intent,
            trigger: ticket.trigger,
            rules: ticket.rules,
            output: ticket.output,
            notes: ticket.notes,
            globalContext: GLOBAL_CONTEXT
          })
        }
      ]
    });

    // Store conversation history
    session.conversationHistory = codeResponse.messages;

    // Generate test cases using the same session
    const testResponse = await session.agent.invoke({
      messages: [
        ...session.conversationHistory,
        {
          role: "user",
          content: JSON.stringify({
            task: "Generate test cases for the following code:",
            code: codeResponse.messages[codeResponse.messages.length - 1].content,
            globalContext: GLOBAL_CONTEXT
          })
        }
      ]
    });

    // Update conversation history with test generation
    session.conversationHistory = testResponse.messages;

    await Ticket.findByIdAndUpdate(ticketId, {
      status: 'completed',
      generatedCode: codeResponse.messages[codeResponse.messages.length - 1].content,
      testCases: testResponse.messages[testResponse.messages.length - 1].content
    });

  } catch (error) {
    console.error('Code generation failed:', error);
    await Ticket.findByIdAndUpdate(ticketId, { 
      status: 'failed',
      generatedCode: `// Error: ${error.message}`,
      testCases: `// Error: ${error.message}`
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
          content: JSON.stringify({
            prompt,
            globalContext: GLOBAL_CONTEXT
          })
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