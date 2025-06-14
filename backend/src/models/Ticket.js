const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    intent: {
        type: String,
        required: true
    },
    cds: {
        entities: {
            type: [String],
            default: []
        }
    },
    trigger: {
        type: String,
        required: true
    },
    rules: {
        type: [String],
        default: []
    },
    output: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    githubUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'completed', 'failed', 'pr_created'],
        default: 'new'
    },
    prUrl: {
        type: String,
        default: null
    },
    generatedCode: {
        type: String,
        default: ''
    },
    testCases: {
        type: String,
        default: ''
    },
    agentReasoning: {
        codeGeneration: String,
        testGeneration: String,
        error: String,
        timestamp: Date
    },
    chatHistory: [{
        role: {
            type: String,
            enum: ['user', 'ai'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['message', 'question', 'confirmation'],
            default: 'message'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', TicketSchema); 