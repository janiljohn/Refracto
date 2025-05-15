import express from 'express';
import { spawn } from 'node:child_process';
import { log } from 'node:console';
import stripAnsi from 'strip-ansi';

import 'dotenv/config'
const app = express();
app.use(express.json());

const GOOSE_WORKING_DIR = process.env.GOOSE_WORKING_DIR
log("GOOSE_WORKING_DIR:", GOOSE_WORKING_DIR);
// Session management
const activeSessions = new Map();

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

    // Try to parse the response into code and reasoning
    // try {
    //     // Look for code blocks and reasoning sections
    //     const codeMatch = cleaned.match(/```(?:java)?\n([\s\S]*?)```/);
    //     const reasoningMatch = cleaned.match(/Reasoning:([\s\S]*?)(?=```|$)/i);

    //     return {
    //         code: codeMatch ? codeMatch[1].trim() : cleaned,
    //         reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided'
    //     };
    // } catch (error) {
    //     console.error('Error parsing output:', error);
    //     return {
    //         code: cleaned,
    //         reasoning: 'Error parsing response'
    //     };
    // }
};

// Create or get session
const getOrCreateSession = async (sessionId) => {
    if (activeSessions.has(sessionId)) {
        return activeSessions.get(sessionId);
    }

    const sessionName = `session_${sessionId}`;
    const session = {
        id: sessionId,
        name: sessionName,
        history: []
    };
    activeSessions.set(sessionId, session);
    return session;
};

// Execute goose command
const executeGooseCommand = async (session, prompt, timeout = 120000) => {
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

    

    // const inputCommands = `${JSON.stringify(prompt)}\nexit\n`;
    const inputCommands = `${JSON.stringify(prompt)}\nexit\n`;

    log("Input Commands:", inputCommands);
    proc.stdin.write(inputCommands);
    proc.stdin.end();

    // console.log("Here......");
    

    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        // Log output as soon as it is available
        proc.stdin.on('data', (data) => {
            console.log("Input:", data.toString());
        });
        proc.stdout.on('data', (data) => {
            console.log("Child stdout:", data.toString());
        });
        proc.stderr.on('data', (data) => {
            console.error("Child stderr:", data.toString());
        });

        proc.stdout.on('data', (data) => stdout += data);
        proc.stderr.on('data', (data) => stderr += data);

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr));
            } else {
                const parsedOutput = cleanOutput(stdout);
                session.history.push({ role: 'user', content: prompt });
                session.history.push({ role: 'assistant', content: parsedOutput });
                resolve(parsedOutput);
                proc.kill()
            }
        });

        setTimeout(() => {
            proc.kill();
            reject(new Error('Session command timed out.'));
        }, timeout);
    });
};


// API Endpoints
app.post('/generate', async (req, res) => {    
    const { sessionId, prompt, context } = req.body;

    // Only include non-empty fields
    const task = prompt.task != '' ? `TASK: ${prompt.task}` : '';
    const requirements = prompt.intent != '' ? `REQUIREMENTS: ${prompt.intent}` : '';
    const trigger = prompt.trigger != '' ? `TRIGGER: ${prompt.trigger}` : '';
    const rules = prompt.rules != '' ? `RULES: ${prompt.rules}` : '';
    const output = prompt.output !=  '' ? `OUTPUT: ${prompt.output}` : '';

    const fullPrompt = context ? 
        `${context} ${task} ${requirements} ${trigger} ${rules} ${output}` :
        `${task} ${requirements} ${trigger} ${rules} ${output}`;

    console.log('Prompt:', fullPrompt);

    console.log(fullPrompt);
    
    
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
    
    try {
        const session = await getOrCreateSession(sessionId);
        const response = await executeGooseCommand(session, prompt);
        res.json({ 
            response,
            sessionId: session.id,
            history: session.history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// app.delete('/session/:sessionId', (req, res) => {
//     const { sessionId } = req.params;
//     activeSessions.delete(sessionId);
//     res.json({ message: 'Session deleted' });
// });

app.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    const proc = spawn('goose', ['session', 'remove', '-i', session.name], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);

    proc.on('close', (code) => {
        activeSessions.delete(sessionId);
        if (code !== 0) {
            return res.status(500).json({ error: stderr });
        }
        res.json({ message: 'Session deleted', output: stdout });
    });
});

const PORT = process.env.GOOSE_SERVICE_PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Goose service running on http://0.0.0.0:${PORT}`);
});

export { getOrCreateSession, executeGooseCommand }; 