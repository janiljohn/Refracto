import express from 'express';
import { spawn } from 'node:child_process';
import { log } from 'node:console';
import stripAnsi from 'strip-ansi';
import Session from '../models/Session.js';
import connectDB from '../config/db.js';

import timeout from 'connect-timeout'

import 'dotenv/config'
const app = express();
app.use(express.json());

// app.setTimeout(10 * 60 * 1000); // Set a default timeout of 2 minutes for all requests

app.use(timeout('600000s'))
const GOOSE_WORKING_DIR = process.env.GOOSE_WORKING_DIR
log("GOOSE_WORKING_DIR:", GOOSE_WORKING_DIR);

// Connect to MongoDB before starting server
let isDBConnected = false;

// Initialize server only after DB connection
const startServer = async () => {
    try {
        await connectDB();
        isDBConnected = true;
        log("MongoDB connected for goose service");

        const PORT = process.env.GOOSE_SERVICE_PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
            log(`Goose service running on http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        log("MongoDB connection failed:", err);
        process.exit(1);
    }
};

// Start the server
startServer();

// Helper to clean output
const cleanOutput = (output) => {
    const cleaned = stripAnsi(output)
        .replace(/[\u2500-\u257F]+/g, '')
        .split('\n')
        .filter(line => !(
            line.includes('starting session') ||
            line.includes('logging to') ||
            line.includes('working directory')
        ))
        .join('\n')
        .trim();

    return cleaned;
};

// Create or get session
const getOrCreateSession = async (sessionId) => {
    if (!isDBConnected) {
        throw new Error("Database not connected");
    }
    
    try {
        let session = await Session.findOne({ sessionId });
        
        if (!session) {
            const sessionName = `session_${sessionId}`;
            session = new Session({
                sessionId,
                name: sessionName,
                history: []
            });
            await session.save();
        }
        
        return session;
    } catch (error) {
        console.error('Session error:', error);
        throw error;
    }
};

// Execute goose command
const executeGooseCommand = async (session, prompt, timeout = 600000) => {
    const arg = ['session'];
    if (session.history.length > 0) {
        arg.push('--resume');
    }
    arg.push('--name', session.name);

    const argString = arg.join(' ');  // This will convert ['session', '--name', 'session_school'] to "session --name session_school"

    const args = ['-c', `cd ${GOOSE_WORKING_DIR} && goose ${argString}`];
    const proc = spawn('bash', args, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const inputCommands = `${JSON.stringify(prompt)}\n`;

    proc.stdin.write(inputCommands);
    proc.stdin.end();

    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        // Log output as soon as it is available
        proc.stdin.on('data', (data) => {
            console.log("Input:", data.toString());
        });
        proc.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        proc.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        proc.stdout.on('data', (data) => stdout += data);
        proc.stderr.on('data', (data) => stderr += data);

        proc.on('close', async (code) => {
            if (code !== 0) {
                reject(new Error(stderr));
            } else {
                const parsedOutput = cleanOutput(stdout);
                
                // Update session history in MongoDB
                session.history.push({ 
                    role: 'user', 
                    content: prompt,
                    timestamp: new Date()
                });
                session.history.push({ 
                    role: 'assistant', 
                    content: parsedOutput,
                    timestamp: new Date()
                });
                
                try {
                    await session.save();
                } catch (error) {
                    console.error('Failed to save session:', error);
                }
                
                resolve(parsedOutput);
                proc.kill();
            }
        });

        setTimeout(() => {
            proc.kill();
            reject(new Error('Session command timed out.'));
        }, timeout);
    });
};

app.post('/approve', async (req, res) => {
    const { sessionId, prompt, context } = req.body;
    
    const task = prompt.task != '' ? `${prompt.task}` : '';
    const requirements = prompt.intent != '' ? `Requirement we want to implement: ${prompt.intent}` : '';
    // const rules = prompt.rules != '' ? `Constraints to enforce : ${prompt.rules}` : '';
    // const output = prompt.output != '' ? `Desired Output should look like: ${prompt.output}` : '';

    const fullPrompt = [task, context]
        .filter(Boolean)  // Remove empty strings
        .join(' ');

    console.log("//////////////////////")
    console.log('Prompt in goose backend:', fullPrompt);
    console.log("//////////////////////")
    
    try {
        const session = await getOrCreateSession(sessionId);
        const response = await executeGooseCommand(session, fullPrompt);
        res.json({ 
            response,
            sessionId: session.id,
            history: session.history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.post('/gooseGit', async (req, res) => {
    const { sessionId, prompt, context } = req.body;
    
    const task = prompt.task != '' ? `${prompt.task}` : '';
    const fullPrompt = [task, context]
        .filter(Boolean)
        .join(' ');

    console.log("//////////////////////")
    console.log('Git Prompt in goose backend:', fullPrompt);
    console.log("//////////////////////")
    
    try {
        const session = await getOrCreateSession(sessionId);
        const response = await executeGooseCommand(session, fullPrompt);
        res.json({ 
            response,
            sessionId: session.id,
            history: session.history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Endpoints
app.post('/generate', async (req, res) => {    
    const { sessionId, prompt, context } = req.body;

    // Only include non-empty fields
    const approval = "Consider that you have full access to codebase and dont need to ask for ANY APPROVAL WHATSOVER"
    const task = prompt.task != '' ? `${prompt.task}` : '';
    const requirements = prompt.intent && prompt.intent != '' ? `Requirement we want to implement: ${prompt.intent}` : '';
    const trigger = prompt.trigger && prompt.trigger != '' ? `Trigger conditions to enforce: ${prompt.trigger}` : '';
    const rules = prompt.rules && prompt.rules != '' ? `Constraints to enforce : ${prompt.rules}` : '';
    const output = prompt.output && prompt.output != '' ? `Desired Output should look like: ${prompt.output}` : '';
    const notes = prompt.notes && prompt.notes != '' ? `Additional notes to be considered: ${prompt.notes}` : '';
    const cds = prompt.cds && prompt.cds.entities != [] ? `CDS entities that may be involved: ${prompt.cds.entities.join(", ")}` : '';

    const fullPrompt = [approval, context, task, requirements, cds, trigger, rules, notes, output]
        .filter(Boolean)  // Remove empty strings
        .join(' ');

    console.log("//////////////////////")
    console.log('Prompt in goose backend:', fullPrompt);
    console.log("//////////////////////")
    
    try {
        const session = await getOrCreateSession(sessionId);
        const response = await executeGooseCommand(session, fullPrompt);
        res.json({ 
            response,
            sessionId: session.id,
            history: session.history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/refine', async (req, res) => {
    const { sessionId, prompt } = req.body;
    console.log('Goose Service: Received refine request:', {
        sessionId,
        promptLength: prompt?.length,
        prompt: prompt?.substring(0, 100) + '...'
    });
    
    try {
        const session = await getOrCreateSession(sessionId);
        console.log('Goose Service: Session retrieved:', {
            sessionId: session.sessionId,
            historyLength: session.history?.length
        });

        const approval = `If you have any questions, please ask them in the following JSON format:
{
  "questions": "<list of questions>"
}
If you have no questions, please respond ONLY in the following JSON format:
{
    "confirm": "yes"
}
Do not include any extra text outside the JSON.`;

        const initPrompt = `I want to make a refinement to the previously generated code based on this request: ${prompt}\n\n${approval}`;
        console.log('Goose Service: Sending initial prompt to AI');
        const initResponse = await executeGooseCommand(session, initPrompt);
        console.log('Goose Service: Received initial AI response:', {
            responseLength: initResponse?.length,
            response: initResponse?.substring(0, 100) + '...'
        });

        // Extract JSON from response
        const extractJson = (text) => {
            // Clean up: remove any "Goose Response:" prefixes and extra whitespace
            const cleanedText = text
                .split('\n')
                .filter(line => !line.startsWith('Goose Response:'))
                .join('\n')
                .trim();

            // Extract JSON object using regex
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('Goose Service: No JSON object found in text:', {
                    textLength: cleanedText.length,
                    firstChars: cleanedText.substring(0, 100)
                });
                return null;
            }

            try {
                const parsed = JSON.parse(jsonMatch[0]);
                // Validate expected fields based on response type
                if (parsed.questions || parsed.confirm || (parsed.code && parsed.reasoning)) {
                    console.log('Goose Service: Successfully extracted JSON:', {
                        type: parsed.questions ? 'questions' : 
                              parsed.confirm ? 'confirm' : 'code',
                        length: jsonMatch[0].length
                    });
                    return parsed;
                }
                console.error('Goose Service: JSON missing expected fields:', parsed);
                return null;
            } catch (e) {
                console.error('Goose Service: JSON parse error:', {
                    error: e.message,
                    jsonText: jsonMatch[0].substring(0, 100) + '...'
                });
                return null;
            }
        };

        // Try to extract valid JSON from the response
        const parsedInit = extractJson(initResponse);
        if (!parsedInit) {
            console.error('Goose Service: No valid JSON found in initial response');
            return res.status(400).json({ 
                error: "No valid JSON found in response", 
                raw: initResponse
            });
        }

        console.log('Goose Service: Parsed initial response:', {
            hasQuestions: !!parsedInit?.questions,
            hasConfirm: parsedInit?.confirm === 'yes'
        });

        // Branch logic
        if (parsedInit?.questions) {
            console.log('Goose Service: Returning questions to user');
            return res.json({
                sessionId: session.id,
                questions: parsedInit.questions,
                history: session.history
            });
        }

        if (parsedInit?.confirm !== 'yes') {
            console.error('Goose Service: Invalid confirmation response:', parsedInit);
            return res.status(400).json({
                error: "Expected 'confirm': 'yes' to proceed, or 'questions' array to clarify",
                raw: initResponse,
                parsed: parsedInit
            });
        }

        console.log('Goose Service: Proceeding with code refinement');
        const context = `Please respond ONLY in the following JSON format:
{
  "code": "<complete code block as a java code markdown>",
  "reasoning": "<clear explanation of how and why this code was implemented this way>"
}
Do not include any extra text outside the JSON.`;

        const fullPrompt = `${context}\n\nRefine the following code based on this request: ${prompt}`;
        console.log('Goose Service: Sending code refinement prompt to AI');
        const response = await executeGooseCommand(session, fullPrompt);
        console.log('Goose Service: Received code refinement response:', {
            responseLength: response?.length,
            response: response?.substring(0, 100) + '...'
        });
        
        // Generate test cases
        console.log('Goose Service: Generating test cases');
        const testContext = `Please respond ONLY in the following JSON format:
{
  "code": "<complete test code block as a java code markdown>",
  "reasoning": "<clear explanation of how and why this code was implemented this way>"
}
Do not include any extra text outside the JSON.`;

        const testPrompt = `${testContext}\n\nGenerate test cases for the refined code: ${prompt}`;
        const testResponse = await executeGooseCommand(session, testPrompt);
        console.log('Goose Service: Received test cases response:', {
            responseLength: testResponse?.length,
            response: testResponse?.substring(0, 100) + '...'
        });

        console.log('Goose Service: Sending final response to client');
        res.json({ 
            code: response,
            tests: testResponse,
            sessionId: session.id,
            history: session.history
        });
    } catch (error) {
        console.error('Goose Service: Error in refine endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    if (!isDBConnected) {
        return res.status(503).json({ error: 'Database not connected. Please try again.' });
    }
    
    try {
        const session = await Session.findOne({ sessionId });
        if (!session) {
            // If session not found in DB, still try to remove goose session
            const proc = spawn('goose', ['session', 'remove', '-i', `session_${sessionId}`], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => stdout += data);
            proc.stderr.on('data', (data) => stderr += data);

            proc.on('close', (code) => {
                if (code !== 0) {
                    return res.status(404).json({ message: 'Session not found' });
                }
                res.json({ message: 'Goose session removed', output: stdout });
            });
            return;
        }

        const proc = spawn('goose', ['session', 'remove', '-i', session.name], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => stdout += data);
        proc.stderr.on('data', (data) => stderr += data);

        proc.on('close', async (code) => {
            if (code !== 0) {
                return res.status(500).json({ error: stderr });
            }
            
            try {
                await Session.deleteOne({ sessionId });
                res.json({ message: 'Session deleted', output: stdout });
            } catch (error) {
                console.error('Failed to delete session from database:', error);
                res.status(500).json({ error: 'Failed to delete session from database' });
            }
        });
    } catch (error) {
        console.error('Session deletion error:', error);
        res.status(500).json({ error: error.message });
    }
});

export { getOrCreateSession, executeGooseCommand }; 