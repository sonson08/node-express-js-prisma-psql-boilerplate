// app.js loads every router, so llmService is stubbed to keep tests from building a real Bedrock client or Prisma connection.
jest.mock('../services/llmService', () => ({ invoke: jest.fn() }));
jest.mock('../services/summaryService', () => ({ generateSummary: jest.fn() }));

const request = require('supertest');
const app = require('../app');
const summaryService = require('../services/summaryService');

const validSummary = {
  summary: 'Plants turn light into chemical energy.',
  keyPoints: ['Happens in chloroplasts'],
  terms: ['photosynthesis'],
};

describe('POST /api/v1/summaries', () => {
  beforeEach(() => {
    summaryService.generateSummary.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns the generated summary under data', async () => {
    summaryService.generateSummary.mockResolvedValue(validSummary);

    const res = await request(app).post('/api/v1/summaries').send({ notes: 'Photosynthesis notes' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: validSummary });
  });

  test('passes trimmed notes to the summary service', async () => {
    summaryService.generateSummary.mockResolvedValue(validSummary);

    await request(app).post('/api/v1/summaries').send({ notes: '   Photosynthesis notes \n' });

    expect(summaryService.generateSummary).toHaveBeenCalledWith('Photosynthesis notes');
  });

  test.each([
    [{}, 'notes is required'],
    [{ notes: 5 }, 'notes must be a string'],
    [{ notes: '   ' }, 'notes must not be empty'],
    [{ notes: 'a'.repeat(20001) }, 'notes must be at most 20,000 characters'],
  ])('returns 400 VALIDATION_ERROR for %#', async (body, message) => {
    const res = await request(app).post('/api/v1/summaries').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: message } });
    expect(summaryService.generateSummary).not.toHaveBeenCalled();
  });

  test('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/summaries')
      .set('Content-Type', 'application/json')
      .send('{"notes": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } });
  });

  // express.json() defaults to a 100kb limit.
  test('returns 413 PAYLOAD_TOO_LARGE for bodies over the JSON limit', async () => {
    const res = await request(app).post('/api/v1/summaries').send({ notes: 'a'.repeat(200 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  });

  test('returns 502 LLM_ERROR when the summary service fails', async () => {
    summaryService.generateSummary.mockRejectedValue(new Error('LLM returned an invalid summary format'));

    const res = await request(app).post('/api/v1/summaries').send({ notes: 'Photosynthesis notes' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: { code: 'LLM_ERROR', message: 'Could not generate a summary. Please try again.' },
    });
  });

  test('returns JSON 404 for unknown /api routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
