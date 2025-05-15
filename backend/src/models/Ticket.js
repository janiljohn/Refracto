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
        enum: ['new', 'in_progress', 'completed', 'failed'],
        default: 'new'
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', TicketSchema); 