var express = require('express');
var router = express.Router();
var validateNotes = require('../middleware/validateNotes');
var summaryController = require('../controllers/summaryController');

/* POST generate a summary from notes. */
router.post('/', validateNotes, summaryController.create);

module.exports = router;
