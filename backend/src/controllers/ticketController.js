const Ticket = require('../models/Ticket');
const axios = require('axios');

const GOOSE_SERVICE_URL = process.env.GOOSE_SERVICE_URL || 'http://localhost:8080';

function extractCodeAndReasoningLoosely(rawText) {
  // Clean up: remove any "Goose Response:" prefixes
  const cleanedText = rawText
    .split('\n')
    .filter(line => !line.startsWith('Goose Response:'))
    .join('\n');

  // Extract code inside ```java ... ```
  const codeMatch = cleanedText.match(/"code":\s*```(?:java|cds)?\n([\s\S]*?)```/);
  const reasoningMatch = cleanedText.match(/"reasoning":\s*"([\s\S]*?)"\s*}/);

  if (!codeMatch || !reasoningMatch) {
    throw new Error("Could not extract 'code' or 'reasoning'. Check formatting.");
  }

  const code = codeMatch[1]; // full code with preserved whitespace
  const reasoning = reasoningMatch[1].replace(/\\"/g, '"').trim();

  return { code, reasoning };
}

async function handleApproveAndApply(ticketId) {
  try {
    // await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    const ticket = await Ticket.findById(ticketId);

    // Generate code using goose service
    const codeResponse = await axios.post(`${GOOSE_SERVICE_URL}/approve`, {
      sessionId: ticketId,
      prompt: {
        task: "Perform the following Git operations based on the ticket details:",
        intent: ticket.intent,
        // notes: ticket.notes,
        // cds: ticket.cds,
        // trigger: ticket.trigger,
        // rules: ticket.rules,
        // output: ticket.output
      },
      context: `1. Create and switch to a new branch named feature/${ticketId}.
2. Stage all modified and new files.
3. Commit them with appropriate message based on the requirements.
4. Push the branch to the remote ${ticket.githubUrl}.
5. Open a pull request against main:
   - Title: same as the commit message.
   - Description: list each changed file and explain the purpose of changes, plus note how to run any new tests.
   - Add inline comments summarizing the core logic updates.
Output each Git command you would run, then the PR payload or CLI command you'd use to create the pull request.`
    });

    console.log('Goose Response:', codeResponse.data.response);
    // const { code: generatedCode, reasoning: codeReasoning } = extractCodeAndReasoningLoosely(codeResponse.data.response);
    // console.log('Extracted Code:', generatedCode);
    // console.log('Extracted Reasoning:', codeReasoning);
} catch (error) {
    console.error('Code Push operation failed:', error);
    await Ticket.findByIdAndUpdate(ticketId, { 
      status: 'failed',
      generatedCode: `// Error: ${error.message}`,
      testCases: `// Error: ${error.message}`,
      agentReasoning: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}


async function generateCode(ticketId) {
  try {
    await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    const ticket = await Ticket.findById(ticketId);

    // Generate code using goose service
    const codeResponse = await axios.post(`${GOOSE_SERVICE_URL}/generate`, {
      sessionId: ticketId,
      prompt: {
        task: "Generate SAP CAP Java implementation based on the following ticket details:",
        intent: ticket.intent,
        notes: ticket.notes,
        cds: ticket.cds,
        trigger: ticket.trigger,
        rules: ticket.rules,
        output: ticket.output
      },
      context: `Please respond ONLY in the following JSON format:
{
  "code": "<complete code block>",
  "reasoning": "<clear explanation of how and why this code was implemented this way>"
}
Do not include any extra text outside the JSON.`
    });

    console.log('Goose Response:', codeResponse.data.response);
    const { code: generatedCode, reasoning: codeReasoning } = extractCodeAndReasoningLoosely(codeResponse.data.response);
    console.log('Extracted Code:', generatedCode);
    console.log('Extracted Reasoning:', codeReasoning);

    // Generate test cases
    const testResponse = await axios.post(`${GOOSE_SERVICE_URL}/generate`, {
      sessionId: ticketId,
      prompt: {
        task: "Generate test cases for the generated SAP CAP Java code. "
      },
      context: `Please respond ONLY in the following JSON format:
{
  "code": "<complete test code block>",
  "reasoning": "<clear explanation of how and why this code was implemented this way>"
}
Do not include any extra text outside the JSON.`
    });

    console.log('Goose Test Response:', testResponse.data.response);
    const { code: generatedTests, reasoning: testReasoning } = extractCodeAndReasoningLoosely(testResponse.data.response);
    console.log('Extracted Test Code:', generatedTests);
    console.log('Extracted Test Reasoning:', testReasoning);

    await Ticket.findByIdAndUpdate(ticketId, {
      status: 'completed',
      generatedCode: generatedCode,
      testCases: generatedTests,
      agentReasoning: {
        codeGeneration: codeReasoning,
        testGeneration: testReasoning,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Code generation failed:', error);
    await Ticket.findByIdAndUpdate(ticketId, { 
      status: 'failed',
      generatedCode: `// Error: ${error.message}`,
      testCases: `// Error: ${error.message}`,
      agentReasoning: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Refine code with chat
async function refineCode(ticketId, prompt) {
  try {
    const response = await axios.post(`${GOOSE_SERVICE_URL}/refine`, {
      sessionId: ticketId,
      prompt
    });

    const { code: generatedCode, reasoning: codeReasoning } = extractCodeAndReasoningLoosely(response.data.code);
    const { code: generatedTests, reasoning: testReasoning } = extractCodeAndReasoningLoosely(response.data.tests);

    // Update only code, tests and reasoning
    await Ticket.findByIdAndUpdate(ticketId, {
      generatedCode,
      testCases: generatedTests,
      agentReasoning: {
        codeGeneration: codeReasoning,
        testGeneration: testReasoning,
        timestamp: new Date().toISOString()
      }
    });

    return { success: true, message: 'Code and tests refined successfully' };
  } catch (error) {
    console.error('Code refinement failed:', error);
    return { success: false, error: error.message };
  }
}

// Cleanup session when ticket is deleted
async function cleanupSession(ticketId) {
  try {
    // Delete main session
    try {
      await axios.delete(`${GOOSE_SERVICE_URL}/session/${ticketId}`);
    } catch (error) {
      console.error('Main session cleanup failed:', error.message);
    }

    // Delete test session
    try {
      await axios.delete(`${GOOSE_SERVICE_URL}/session/${ticketId}_tests`);
    } catch (error) {
      console.error('Test session cleanup failed:', error.message);
    }
  } catch (error) {
    console.error('Session cleanup failed:', error.message);
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

  // Git stuff
  handleApprove: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      handleApproveAndApply(ticket._id);
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