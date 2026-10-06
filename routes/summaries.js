const express = require('express');
const router = express.Router();
const validateNotes = require('../middleware/validateNotes');
const summaryController = require('../controllers/summaryController');

router.post('/', validateNotes, summaryController.create);

module.exports = router;
