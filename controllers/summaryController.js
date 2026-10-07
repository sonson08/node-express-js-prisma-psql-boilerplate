const createError = require('http-errors');
const summaryService = require('../services/summaryService');

exports.create = async (req, res, next) => {
  let data;
  try {
    data = await summaryService.generateSummary(req.body.notes);
  } catch (err) {
    console.error(err);
    return next(createError(502, 'Could not generate a summary. Please try again.', { code: 'LLM_ERROR' }));
  }
  res.json({ data: data });
};
