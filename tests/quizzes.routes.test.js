// app.js loads every router, so llmService is stubbed to keep tests from building a real Bedrock client or Prisma connection.
jest.mock('../services/llmService', () => ({ invoke: jest.fn() }));
jest.mock('../services/quizService', () => ({ generateQuiz: jest.fn() }));

const request = require('supertest');
const app = require('../app');
const quizService = require('../services/quizService');

const validQuiz = {
  questions: [
    {
      id: 1,
      question: 'Where does photosynthesis take place?',
      choices: [
        { key: 'A', text: 'Mitochondria' },
        { key: 'B', text: 'Chloroplasts' },
        { key: 'C', text: 'Nucleus' },
        { key: 'D', text: 'Ribosomes' },
      ],
      correctAnswer: 'B',
      explanation: 'Chloroplasts contain chlorophyll.',
    },
  ],
};

describe('POST /api/v1/quizzes', () => {
  beforeEach(() => {
    quizService.generateQuiz.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns the generated quiz under data', async () => {
    quizService.generateQuiz.mockResolvedValue(validQuiz);

    const res = await request(app).post('/api/v1/quizzes').send({ notes: 'Photosynthesis notes' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: validQuiz });
  });

  test('passes trimmed notes and the default question count to the quiz service', async () => {
    quizService.generateQuiz.mockResolvedValue(validQuiz);

    await request(app).post('/api/v1/quizzes').send({ notes: '   Photosynthesis notes \n' });

    expect(quizService.generateQuiz).toHaveBeenCalledWith('Photosynthesis notes', 10);
  });

  test('passes the requested question count to the quiz service', async () => {
    quizService.generateQuiz.mockResolvedValue(validQuiz);

    await request(app).post('/api/v1/quizzes').send({ notes: 'Photosynthesis notes', questionCount: 3 });

    expect(quizService.generateQuiz).toHaveBeenCalledWith('Photosynthesis notes', 3);
  });

  test.each([
    [{}, 'notes is required'],
    [{ notes: 5 }, 'notes must be a string'],
    [{ notes: '   ' }, 'notes must not be empty'],
    [{ notes: 'a'.repeat(20001) }, 'notes must be at most 20,000 characters'],
    [{ notes: 'n', questionCount: 0 }, 'questionCount must be an integer between 1 and 20'],
    [{ notes: 'n', questionCount: 21 }, 'questionCount must be an integer between 1 and 20'],
    [{ notes: 'n', questionCount: 2.5 }, 'questionCount must be an integer between 1 and 20'],
    [{ notes: 'n', questionCount: '5' }, 'questionCount must be an integer between 1 and 20'],
  ])('returns 400 VALIDATION_ERROR for %#', async (body, message) => {
    const res = await request(app).post('/api/v1/quizzes').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: message } });
    expect(quizService.generateQuiz).not.toHaveBeenCalled();
  });

  test('returns 502 LLM_ERROR when the quiz service fails', async () => {
    quizService.generateQuiz.mockRejectedValue(new Error('LLM returned an invalid quiz format'));

    const res = await request(app).post('/api/v1/quizzes').send({ notes: 'Photosynthesis notes' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: { code: 'LLM_ERROR', message: 'Could not generate a quiz. Please try again.' },
    });
  });
});
