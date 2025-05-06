const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

async function cloneRepo(repoUrl, targetDir) {
  const git = simpleGit();
  await git.clone(repoUrl, targetDir);
}

function extractEntitiesFromCDS(content) {
  const regex = /entity\s+([A-Za-z_][A-Za-z0-9_]*)[^\{]*\{/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function scanForEntities(projectDir) {
  const entities = new Set();

  function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.cds')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        extractEntitiesFromCDS(content).forEach(e => entities.add(e));
      }
    });
  }

  walk(projectDir);
  return Array.from(entities);
}

module.exports = { cloneRepo, scanForEntities }; 