jest.mock('../services/summaryService', () => ({ generateSummary: jest.fn() }));

const summaryService = require('../services/summaryService');
const summaryController = require('../controllers/summaryController');

describe('summaryController.create', () => {
  beforeEach(() => {
    summaryService.generateSummary.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('responds with the summary wrapped in data', async () => {
    const summary = { summary: 's', keyPoints: [], terms: [] };
    summaryService.generateSummary.mockResolvedValue(summary);
    const res = { json: jest.fn() };
    const next = jest.fn();

    await summaryController.create({ body: { notes: 'notes' } }, res, next);

    expect(summaryService.generateSummary).toHaveBeenCalledWith('notes');
    expect(res.json).toHaveBeenCalledWith({ data: summary });
    expect(next).not.toHaveBeenCalled();
  });

  test('forwards a 502 LLM_ERROR and logs the original error when generation fails', async () => {
    const cause = new Error('Bedrock throttled');
    summaryService.generateSummary.mockRejectedValue(cause);
    const res = { json: jest.fn() };
    const next = jest.fn();

    await summaryController.create({ body: { notes: 'notes' } }, res, next);

    expect(res.json).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(cause);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(502);
    expect(err.code).toBe('LLM_ERROR');
    expect(err.message).toBe('Could not generate a summary. Please try again.');
  });
});
