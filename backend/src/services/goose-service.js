import express from 'express';
import { spawn } from 'node:child_process';
import { log } from 'node:console';
import stripAnsi from 'strip-ansi';

const app = express();
app.use(express.json());

// Session management
const activeSessions = new Map();

// Helper to clean output
const cleanOutput = (output) => {
    return stripAnsi(output)
        .replace(/[\u2500-\u257F]+/g, '')
        .split('\n')
        .filter(line => !(
            line.includes('starting session') ||
            line.includes('logging to') ||
            line.includes('working directory')
        ))
        .join('\n')
        .trim();
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
    const args = ['session'];
    if (session.history.length > 0) {
        args.push('--resume');
    }
    args.push('--name', session.name);

    const proc = spawn('goose', args, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const inputCommands = `${prompt}\nexit\n`;
    proc.stdin.write(inputCommands);
    proc.stdin.end();

    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => stdout += data);
        proc.stderr.on('data', (data) => stderr += data);

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr));
            } else {
                const cleanedOutput = cleanOutput(stdout);
                session.history.push({ role: 'user', content: prompt });
                session.history.push({ role: 'assistant', content: cleanedOutput });
                resolve(cleanedOutput);
            }
        });

        setTimeout(() => {
            proc.kill();
            reject(new Error('Session command timed out.'));
        }, timeout);
    });
};

// ```// filepath: /home/mellow/Desktop/refracto/Refracto/backend/src/services/goose-service.js
// const executeGooseCommand = async (session, prompt, timeout = 120000) => {
//     const args = ['session'];
//     if (session.history.length > 0) {
//         args.push('--resume');
//     }
//     args.push('--name', session.name);

//     const proc = spawn('goose', args, {
//         stdio: ['pipe', 'pipe', 'pipe']
//     });

//     const inputCommands = `${prompt}\nexit\n`;
//     proc.stdin.write(inputCommands);
//     proc.stdin.end();

//     return new Promise((resolve, reject) => {
//         let stdout = '';
//         let stderr = '';

//         proc.stdout.on('data', (data) => stdout += data);
//         proc.stderr.on('data', (data) => stderr += data);

//         proc.on('close', (code) => {
//             if (code !== 0) {
//                 reject(new Error(stderr));
//             } else {
//                 const cleanedOutput = cleanOutput(stdout);
//                 session.history.push({ role: 'user', content: prompt });
//                 session.history.push({ role: 'assistant', content: cleanedOutput });
//                 resolve(cleanedOutput);
//             }
//         });

//         setTimeout(() => {
//             proc.kill();
//             reject(new Error('Session command timed out.'));
//         }, timeout);
//     });
// };
// const executeGooseCommand = async (session, prompt, timeout = 120000) => {
//     const proc = spawn('goose', ['session', '--name', session.name], {
//         stdio: ['pipe', 'pipe', 'pipe']
//     });

//     const inputCommands = `${prompt}\nexit\n`;
//     proc.stdin.write(inputCommands);
//     proc.stdin.end();

//     return new Promise((resolve, reject) => {
//         let stdout = '';
//         let stderr = '';

//         proc.stdout.on('data', (data) => stdout += data);
//         proc.stderr.on('data', (data) => stderr += data);

//         proc.on('close', (code) => {
//             if (code !== 0) {
//                 reject(new Error(stderr));
//             } else {
//                 const cleanedOutput = cleanOutput(stdout);
//                 session.history.push({ role: 'user', content: prompt });
//                 session.history.push({ role: 'assistant', content: cleanedOutput });
//                 resolve(cleanedOutput);
//             }
//         });

//         setTimeout(() => {
//             proc.kill();
//             reject(new Error('Session command timed out.'));
//         }, timeout);
//     });
// };

// API Endpoints
app.post('/generate', async (req, res) => {
    const { sessionId, prompt } = req.body;

    console.log(prompt['task']);
    
    
    try {
        const session = await getOrCreateSession(sessionId);
        // const fullPrompt = context ? 
        //     `${JSON.stringify(context, null, 2)}\n\n${prompt}` : 
        //     prompt;

        const response = await executeGooseCommand(session, prompt['task']);
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