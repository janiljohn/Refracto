const express = require('express');
const router = express.Router();
const { importProject } = require('../controllers/projectController');

router.post('/import', importProject);

module.exports = router; 