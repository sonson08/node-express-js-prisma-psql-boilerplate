const validateQuestionCount = require('../middleware/validateQuestionCount');

const run = (body) => {
  const req = { body: body };
  const next = jest.fn();
  validateQuestionCount(req, {}, next);
  return { req: req, next: next, err: next.mock.calls[0][0] };
};

describe('validateQuestionCount', () => {
  test('defaults questionCount to 10 when missing', () => {
    const { req, next, err } = run({});
    expect(next).toHaveBeenCalledTimes(1);
    expect(err).toBeUndefined();
    expect(req.body.questionCount).toBe(10);
  });

  test.each([1, 10, 20])('accepts %p', (questionCount) => {
    const { req, err } = run({ questionCount: questionCount });
    expect(err).toBeUndefined();
    expect(req.body.questionCount).toBe(questionCount);
  });

  test.each([0, 21, -1, 2.5, '5', null, true, [5]])('rejects %p', (questionCount) => {
    const { next, err } = run({ questionCount: questionCount });
    expect(next).toHaveBeenCalledTimes(1);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('questionCount must be an integer between 1 and 20');
  });
});
