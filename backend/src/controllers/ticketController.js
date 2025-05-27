const Ticket = require('../models/Ticket');
const fetch = require('node-fetch');


const GOOSE_SERVICE_URL = process.env.GOOSE_SERVICE_URL || 'http://0.0.0.0:8080';



function extractCodeAndReasoningLoosely(rawText) {
  // Clean up: remove any "Goose Response:" prefixes and extra whitespace
  const cleanedText = rawText
    .split('\n')
    .filter(line => !line.startsWith('Goose Response:'))
    .join('\n')
    .trim();

  // Extract code and reasoning from the format:
  // "code": "actual code here",
  // "reasoning": "actual reasoning here"
  const codeMatch = cleanedText.match(/"code":\s*"([\s\S]*?)"(?=\s*,\s*"reasoning"|$)/);
  const reasoningMatch = cleanedText.match(/"reasoning":\s*"([\s\S]*?)"(?=\s*}|$)/);

  if (!codeMatch || !reasoningMatch) {
    console.error('Failed to match patterns. Text received:', cleanedText);
    throw new Error("Could not extract 'code' or 'reasoning'. Check formatting.");
  }

  // Extract and clean the code and reasoning
  const code = codeMatch[1]
    .replace(/\\"/g, '"')  // Unescape quotes
    .replace(/\\n/g, '\n') // Convert \n to actual newlines
    .trim();
    
  const reasoning = reasoningMatch[1]
    .replace(/\\"/g, '"')  // Unescape quotes
    .replace(/\\n/g, '\n') // Convert \n to actual newlines
    .trim();

  return { code, reasoning };
}

async function handleApproveAndApply(ticketId) {
  try {
    // // await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    const ticket = await Ticket.findById(ticketId);

    // Generate code using goose service
    const response = await fetch(`${GOOSE_SERVICE_URL}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any additional headers if needed
      },
      body: JSON.stringify({
        sessionId: ticketId,
        prompt: {
          task: "Perform the following Git operations based on the ticket details:",
          intent: ticket.intent
        },
        context: `1. Push the branch to the remote ${ticket.githubUrl}.
2. Open a pull request against main:
- Title: same as the commit message.
- Description: list each changed file and explain the purpose of changes, plus note how to run any new tests.
- Add inline comments summarizing the core logic updates.
Output each Git command you would run, then the PR payload or CLI command you'd use to create the pull request.`
      })
    });
    
    const codeResponse = await response.json();

    console.log('Goose Approve and Apply Response:', codeResponse.response);

} catch (error) {
    console.error('Git Approve and Apply operation failed:', error);
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

async function gooseGit(ticketId) {
  try {
    // // await Ticket.findByIdAndUpdate(ticketId, { status: 'in_progress' });
    // const ticket = await Ticket.findById(ticketId);

    // Generate code using goose service
    const response = await fetch(`${GOOSE_SERVICE_URL}/gooseGit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: ticketId,
        prompt: {
          task: "Perform the following Git operations"
        },
        context: `Create and switch to a new branch named feature/${ticketId}.`
      })
    });
    
    const codeResponse = await response.json();

    console.log('Goose Response:', codeResponse);


    console.log('Goose Response:', codeResponse.response);

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
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    gooseGit(ticketId);

    // Generate code using goose service
    const codeResponse = await fetch(`${GOOSE_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: ticketId,
        prompt: {
          task: "Implement the following ticket details to create the required functionality and apply the changes to the relevant files in the project.",
          intent: ticket.intent,
          notes: ticket.notes,
          cds: ticket.cds,
          trigger: ticket.trigger,
          rules: ticket.rules,
          output: ticket.output
        },
        context: `Please respond **ONLY** in the following JSON format (no extra text before or after):

{
  "code": "<complete, runnable code block exactly as it should appear in the file(s) you created or modified>",
  "reasoning": "<concise narrative explanation in plain text, using this structure:

Files read
- file1.ext
- file2.ext

Files changed
- file3.ext
- file4.ext

file3.ext – what & why
- Change 1 — one-line reason
- Change 2 — one-line reason
- …

file4.ext – what & why
- Change 1 — one-line reason
- …

Net result
Brief, one-sentence summary of the overall benefit.>"
}

Formatting rules for the **reasoning** field  
• Use the section headers exactly as shown: "Files read", "Files changed", each "<filename> – what & why", and "Net result".  
• Under each header, use short dash bullets (-) for maximum clarity; keep each bullet to a single sentence.  
• Match the succinct style of this prompt—no tables, no long prose paragraphs.

Do **not** include any markdown fencing, backticks, or explanatory text outside the JSON object.
`
      })
    });

    const codeData = await codeResponse.json();
    console.log('Goose Response:', codeData.response);
    const { code: generatedCode, reasoning: codeReasoning } = extractCodeAndReasoningLoosely(codeData.response);
    console.log('Extracted Code:', generatedCode);
    console.log('Extracted Reasoning:', codeReasoning);

    // Generate test cases
    const testResponse = await fetch(`${GOOSE_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: ticketId,
        prompt: {
          task: "Generate test cases for the generated SAP CAP Java code. "
        },
        context: `Please respond **ONLY** in the following JSON format (no extra text before or after):

{
  "code": "<complete, runnable code block exactly as it should appear in the file(s) you created or modified>",
  "reasoning": "<concise narrative explanation in plain text, using this structure:

Files read
- file1.ext
- file2.ext

Files changed
- file3.ext
- file4.ext

file3.ext – what & why
- Change 1 — one-line reason
- Change 2 — one-line reason
- …

file4.ext – what & why
- Change 1 — one-line reason
- …

Net result
Brief, one-sentence summary of the overall benefit.>"
}

Formatting rules for the **reasoning** field  
• Use the section headers exactly as shown: "Files read", "Files changed", each "<filename> – what & why", and "Net result".  
• Under each header, use short dash bullets (-) for maximum clarity; keep each bullet to a single sentence.  
• Match the succinct style of this prompt—no tables, no long prose paragraphs.

Do **not** include any markdown fencing, backticks, or explanatory text outside the JSON object.
`
      })
    });

    const testData = await testResponse.json();
    console.log('Goose Test Response:', testData.response);
    const { code: generatedTests, reasoning: testReasoning } = extractCodeAndReasoningLoosely(testData.response);
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
    const response = await fetch(`${GOOSE_SERVICE_URL}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: ticketId,
        prompt
      })
    });

    const data = await response.json();
    const { code: generatedCode, reasoning: codeReasoning } = extractCodeAndReasoningLoosely(data.code);
    const { code: generatedTests, reasoning: testReasoning } = extractCodeAndReasoningLoosely(data.tests);

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
      await fetch(`${GOOSE_SERVICE_URL}/session/${ticketId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Main session cleanup failed:', error.message);
    }

    // Delete test session
    try {
      await fetch(`${GOOSE_SERVICE_URL}/session/${ticketId}_tests`, {
        method: 'DELETE'
      });
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

  // Create ticket
  createTicket: async (req, res) => {
    try {
      console.log('Received body:', req.body);
      const ticket = new Ticket({
        ...req.body,
        status: 'in_progress'  // Set initial status
      });
      await ticket.save();
      
      // Start code generation but don't wait for it
      generateCode(ticket._id).catch(error => {
        console.error('Code generation failed:', error);
      });
      
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
  },

  // Approve and apply ticket
  approveTicket: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      console.log("Before approve and apply in ticket controller");
      
      await handleApproveAndApply(ticket._id);

      console.log("After approve and apply in ticket controller");
      
      // Fetch updated ticket
      const updatedTicket = await Ticket.findById(ticket._id);
      res.json(updatedTicket);
    } catch (err) {
      console.error('Approve and apply failed:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Terminate ticket
  terminateTicket: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      // Update ticket status to failed
      await Ticket.findByIdAndUpdate(ticket._id, {
        status: 'failed',
        agentReasoning: {
          error: 'Ticket terminated by user',
          timestamp: new Date().toISOString()
        }
      });

      // Cleanup any running sessions
      await cleanupSession(ticket._id);

      const updatedTicket = await Ticket.findById(ticket._id);
      res.json(updatedTicket);
    } catch (err) {
      console.error('Terminate ticket failed:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = ticketController; 