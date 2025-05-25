const express = require('express');
const router = express.Router();
const { importProject, checkProject } = require('../controllers/projectController');

router.post('/import', importProject);
router.get('/check', checkProject);

module.exports = router; 