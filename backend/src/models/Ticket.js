const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'completed', 'failed'],
        default: 'new'
    },
    githubUrl: {
        type: String,
        required: true
    },
    generatedCode: {
        type: String,
        default: ''
    },
    testCases: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema); 