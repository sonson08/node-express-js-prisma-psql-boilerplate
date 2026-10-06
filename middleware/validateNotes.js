var createError = require('http-errors');

var MAX_NOTES_LENGTH = 20000;

/* Check req.body.notes and replace it with the trimmed text. */
var validateNotes = (req, res, next) => {
  var notes = req.body.notes;
  var fail = (message) => next(createError(400, message, { code: 'VALIDATION_ERROR' }));

  if (notes === undefined || notes === null) return fail('notes is required');
  if (typeof notes !== 'string') return fail('notes must be a string');

  var trimmed = notes.trim();
  if (trimmed.length === 0) return fail('notes must not be empty');
  if (trimmed.length > MAX_NOTES_LENGTH) return fail('notes must be at most 20,000 characters');

  req.body.notes = trimmed;
  next();
};

module.exports = validateNotes;
