# 🧠 GitHub Project Importer + CDS Entity Tag Extractor for Ticketing System

This module enables users to start a new project by entering a GitHub repository URL. The system clones the repo, analyzes CDS files in a SAP CAP application, extracts all entity names, and makes them available as tags while creating or editing tickets.

---

## 🚀 Functionality Overview

- User enters a GitHub repo URL (optionally with a token) via a landing page.
- Backend clones the repo into a temporary project directory.
- CDS files (`.cds`) are scanned to identify entity definitions.
- Entity names are extracted and stored.
- Ticket creation/edit interface uses these entity names as selectable tags.

---

## 🖼️ Frontend - Landing Page

### UI Elements

- `Text Input`: GitHub repo URL
- `Optional Input`: GitHub token (for private repos)
- `Submit Button`: Labelled **"Start Project"**

### Behavior

- On submit, POST to `/api/projects/import`:
```json
{
  "repoUrl": "https://github.com/user/my-cap-project",
  "token": "ghp_abc..." // optional
}
````

---

## 🔧 Backend API - `/api/projects/import`

### Endpoint

```http
POST /api/projects/import
```

### Request Body

* `repoUrl`: string (required)
* `token`: string (optional)

### Steps

1. Clone the repository using `simple-git` or `child_process`.
2. Recursively search for `.cds` files in the repo.
3. Extract entity names using regex parsing.
4. Save the following to MongoDB:

   * Repo URL
   * Local path
   * Entity names
   * Created timestamp

---

## 🗃 MongoDB Project Schema

```ts
// models/Project.js

const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  repoUrl: { type: String, required: true },
  localPath: { type: String, required: true },
  entities: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
```

---

## 📂 Project Cloning and CDS Entity Extraction

```ts
// utils/cloneAndExtractEntities.js

const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

async function cloneRepo(repoUrl, targetDir) {
  const git = simpleGit();
  await git.clone(repoUrl, targetDir);
}

function extractEntitiesFromCDS(content) {
  const regex = /entity\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;
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
```

---

## 🌐 Express Controller - Project Import

```ts
// controllers/projectController.js

const path = require('path');
const fs = require('fs');
const { cloneRepo, scanForEntities } = require('../utils/cloneAndExtractEntities');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');

exports.importProject = async (req, res) => {
  try {
    const { repoUrl, token } = req.body;
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
```

---

## 📡 Express Route Setup

```ts
// routes/projectRoutes.js

const express = require('express');
const router = express.Router();
const { importProject } = require('../controllers/projectController');

router.post('/import', importProject);

module.exports = router;
```

---

## 🧑‍💻 Ticket Creation UI (Enhancement)

* Fetch entity tags from the selected project.
* Display entities as multi-select options (chips or dropdown).
* Store selected tags in ticket document:

```ts
tags: [String]
```
---

## ✅ Integration Checklist

* [ ] Landing page UI with GitHub URL form
* [ ] Backend `/import` API to clone repo and scan for entities
* [ ] Save entity list in MongoDB
* [ ] Show entities as selectable tags in ticket form
* [ ] Clean code structure: `models`, `controllers`, `utils`, `routes`


