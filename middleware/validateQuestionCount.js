const createError = require('http-errors');

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 20;

const validateQuestionCount = (req, res, next) => {
  const questionCount = req.body.questionCount;

  if (questionCount === undefined) {
    req.body.questionCount = DEFAULT_QUESTION_COUNT;
    return next();
  }

  const isValid =
    Number.isInteger(questionCount) &&
    questionCount >= MIN_QUESTION_COUNT &&
    questionCount <= MAX_QUESTION_COUNT;
  if (!isValid) {
    return next(createError(400, 'questionCount must be an integer between 1 and 20', { code: 'VALIDATION_ERROR' }));
  }

  next();
};

module.exports = validateQuestionCount;
