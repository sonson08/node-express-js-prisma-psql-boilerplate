jest.mock('../services/llmService', () => ({ invoke: jest.fn() }));

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

const reply = (questions) => JSON.stringify({ questions: questions });

describe('quizService.generateQuiz', () => {
  beforeEach(() => {
    llmService.invoke.mockReset();
  });

  test('sends the notes wrapped in <notes> tags and the question count to the LLM', async () => {
    llmService.invoke.mockResolvedValue(reply([llmQuestion]));

    await quizService.generateQuiz('Photosynthesis happens in chloroplasts.', 7);

    expect(llmService.invoke).toHaveBeenCalledTimes(1);
    const prompt = llmService.invoke.mock.calls[0][0];
    expect(prompt).toContain('<notes>\nPhotosynthesis happens in chloroplasts.\n</notes>');
    expect(prompt).toContain('Create 7 multiple-choice quiz questions');
  });

  test('returns questions with sequential ids and choices as a keyed array', async () => {
    llmService.invoke.mockResolvedValue(reply([llmQuestion, llmQuestion]));

    await expect(quizService.generateQuiz('notes', 2)).resolves.toEqual({
      questions: [expectedQuestion(1), expectedQuestion(2)],
    });
  });

  test('extracts the JSON object when the LLM wraps it in extra text', async () => {
    llmService.invoke.mockResolvedValue(`Here is your quiz:\n\`\`\`json\n${reply([llmQuestion])}\n\`\`\`\nGood luck!`);

    await expect(quizService.generateQuiz('notes', 1)).resolves.toEqual({ questions: [expectedQuestion(1)] });
  });

  test('keeps only the requested number of questions', async () => {
    llmService.invoke.mockResolvedValue(reply([llmQuestion, llmQuestion, llmQuestion]));

    const result = await quizService.generateQuiz('notes', 2);

    expect(result.questions).toHaveLength(2);
  });

  test('accepts fewer questions than requested', async () => {
    llmService.invoke.mockResolvedValue(reply([llmQuestion]));

    const result = await quizService.generateQuiz('notes', 5);

    expect(result.questions).toEqual([expectedQuestion(1)]);
  });

  test('drops fields the LLM adds beyond the expected shape', async () => {
    llmService.invoke.mockResolvedValue(
      JSON.stringify({ questions: [{ ...llmQuestion, id: 99, difficulty: 'easy' }], extra: 'ignored' })
    );

    await expect(quizService.generateQuiz('notes', 1)).resolves.toEqual({ questions: [expectedQuestion(1)] });
  });

  test('throws when the reply contains no JSON', async () => {
    llmService.invoke.mockResolvedValue('Sorry, I cannot help with that.');

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow(SyntaxError);
  });

  test('throws when the reply contains malformed JSON', async () => {
    llmService.invoke.mockResolvedValue('{"questions": [');

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow();
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
    llmService.invoke.mockResolvedValue(JSON.stringify(body));

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow('LLM returned an invalid quiz format');
  });

  test('propagates errors from the LLM call', async () => {
    llmService.invoke.mockRejectedValue(new Error('Bedrock throttled'));

    await expect(quizService.generateQuiz('notes', 1)).rejects.toThrow('Bedrock throttled');
  });
});
