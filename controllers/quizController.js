const createError = require('http-errors');
const quizService = require('../services/quizService');

exports.create = async (req, res, next) => {
  let data;
  try {
    data = await quizService.generateQuiz(req.body.notes, req.body.questionCount);
  } catch (err) {
    console.error(err);
    return next(createError(502, 'Could not generate a quiz. Please try again.', { code: 'LLM_ERROR' }));
  }
  res.json({ data: data });
};
