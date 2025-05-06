const path = require('path');
const fs = require('fs');
const { cloneRepo, scanForEntities } = require('../utils/cloneAndExtractEntities');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');

exports.importProject = async (req, res) => {
  try {
    const { repoUrl } = req.body;
    const id = uuidv4();
    const localPath = path.join(__dirname, '..', 'repos', id);

    await cloneRepo(repoUrl, localPath);
    const entities = scanForEntities(localPath);

    const project = new Project({ repoUrl, localPath, entities });
    await project.save();

    res.status(201).json({ message: 'Project imported', entities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import project' });
  }
}; 