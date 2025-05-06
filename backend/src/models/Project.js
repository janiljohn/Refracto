const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  repoUrl: { type: String, required: true },
  localPath: { type: String, required: true },
  entities: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema); 