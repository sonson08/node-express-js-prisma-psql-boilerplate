jest.mock('../services/llmService', () => ({ invokeTool: jest.fn() }));

const llmService = require('../services/llmService');
const quizService = require('../services/quizService');

const llmQuestion = {
  question: 'Where does photosynthesis take place?',
  choices: { A: 'Mitochondria', B: 'Chloroplasts', C: 'Nucleus', D: 'Ribosomes' },
  correctAnswer: 'B',
  explanation: 'Chloroplasts contain chlorophyll, which captures light energy.',
};

const expectedQuestion = (id) => ({
  id: id,
  question: 'Where does photosynthesis take place?',
  choices: [
    { key: 'A', text: 'Mitochondria' },
    { key: 'B', text: 'Chloroplasts' },
    { key: 'C', text: 'Nucleus' },
    { key: 'D', text: 'Ribosomes' },
  ],
  correctAnswer: 'B',
  explanation: 'Chloroplasts contain chlorophyll, which captures light energy.',
});

const reply = (questions) => ({ questions: questions });

describe('quizService.generateQuiz', () => {
  beforeEach(() => {
    llmService.invokeTool.mockReset();
  });

  test('sends the notes wrapped in <notes> tags and the question count to the LLM', async () => {
    llmService.invokeTool.mockResolvedValue(reply([llmQuestion]));

    await quizService.generateQuiz('Photosynthesis happens in chloroplasts.', 7);

    expect(llmService.invokeTool).toHaveBeenCalledTimes(1);
    const [prompt, tool] = llmService.invokeTool.mock.calls[0];
    expect(prompt).toContain('<notes>\nPhotosynthesis happens in chloroplasts.\n</notes>');
    expect(prompt).toContain('Create 7 multiple-choice quiz questions');
    expect(tool.name).toBe('submit_quiz');
    expect(tool.inputSchema.required).toEqual(['questions']);
  });

  test('returns questions with sequential ids and choices as a keyed array', async () => {
    llmService.invokeTool.mockResolvedValue(reply([llmQuestion, llmQuestion]));

    await expect(quizService.generateQuiz('notes', 2)).resolves.toEqual({
      questions: [expectedQuestion(1), expectedQuestion(2)],
    });
  });

  test('keeps only the requested number of questions', async () => {
    llmService.invokeTool.mockResolvedValue(reply([llmQuestion, llmQuestion, llmQuestion]));

    const result = await quizService.generateQuiz('notes', 2);

    expect(result.questions).toHaveLength(2);
  });

  test('accepts fewer questions than requested', async () => {
    llmService.invokeTool.mockResolvedValue(reply([llmQuestion]));

    const result = await quizService.generateQuiz('notes', 5);

    expect(result.questions).toEqual([expectedQuestion(1)]);
  });

  test('drops fields the LLM adds beyond the expected shape', async () => {
    llmService.invokeTool.mockResolvedValue({
      questions: [{ ...llmQuestion, id: 99, difficulty: 'easy' }],
      extra: 'ignored',
    });

    await expect(quizService.generateQuiz('notes', 1)).resolves.toEqual({ questions: [expectedQuestion(1)] });
  });

  test('keeps LaTeX and quotes in choice text intact', async () => {
    const choices = { A: 'Factoring', B: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', C: 'the "vertex"', D: '$D < 0$' };
    llmService.invokeTool.mockResolvedValue(reply([{ ...llmQuestion, choices: choices }]));

    const result = await quizService.generateQuiz('notes', 1);

    expect(result.questions[0].choices.map((choice) => choice.text)).toEqual(Object.values(choices));
  });

  test.each([
    ['questions is missing', {}],
    ['questions is not an array', { questions: 'q' }],
    ['questions is empty', { questions: [] }],
    ['a question is not an object', { questions: [null] }],
    ['question text is missing', { questions: [{ ...llmQuestion, question: undefined }] }],
    ['choices is missing', { questions: [{ ...llmQuestion, choices: undefined }] }],
    ['choice D is missing', { questions: [{ ...llmQuestion, choices: { A: 'a', B: 'b', C: 'c' } }] }],
    ['a choice is not a string', { questions: [{ ...llmQuestion, choices: { ...llmQuestion.choices, A: 1 } }] }],
    ['correctAnswer is not A-D', { questions: [{ ...llmQuestion, correctAnswer: 'E' }] }],
    ['explanation is missing', { questions: [{ ...llmQuestion, explanation: undefined }] }],
  ])('throws an invalid format error when %s', async (_, body) => {
    llmService.invokeTool.mockResolvedValue(body);

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow('LLM returned an invalid quiz format');
  });

  test('propagates errors from the LLM call', async () => {
    llmService.invokeTool.mockRejectedValue(new Error('Bedrock throttled'));

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow('Bedrock throttled');
  });
});
