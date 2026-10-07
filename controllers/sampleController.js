const llmService = require('../services/llmService');

exports.sampleCall = async (req, res, next) => {
  try {
    const data = await llmService.invoke('Hello world');
    res.json({ data: data });
  } catch (err) {
    next(err);
  }
};
