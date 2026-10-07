const express = require('express');
const router = express.Router();
const validateNotes = require('../middleware/validateNotes');
const validateQuestionCount = require('../middleware/validateQuestionCount');
const quizController = require('../controllers/quizController');

router.post('/', validateNotes, validateQuestionCount, quizController.create);

module.exports = router;
