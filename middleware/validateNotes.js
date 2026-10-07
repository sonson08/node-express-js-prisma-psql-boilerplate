const createError = require('http-errors');

const MAX_NOTES_LENGTH = 20000;

const validateNotes = (req, res, next) => {
  const notes = req.body.notes;
  const fail = (message) => next(createError(400, message, { code: 'VALIDATION_ERROR' }));

  if (notes === undefined || notes === null) return fail('notes is required');
  if (typeof notes !== 'string') return fail('notes must be a string');

  const trimmed = notes.trim();
  if (trimmed.length === 0) return fail('notes must not be empty');
  if (trimmed.length > MAX_NOTES_LENGTH) return fail('notes must be at most 20,000 characters');

  req.body.notes = trimmed;
  next();
};

module.exports = validateNotes;
