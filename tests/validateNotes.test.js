const validateNotes = require('../middleware/validateNotes');

const run = (body) => {
  const req = { body: body };
  const next = jest.fn();
  validateNotes(req, {}, next);
  return { req: req, next: next, err: next.mock.calls[0][0] };
};

const expectValidationError = (body, message) => {
  const { next, err } = run(body);
  expect(next).toHaveBeenCalledTimes(1);
  expect(err.status).toBe(400);
  expect(err.code).toBe('VALIDATION_ERROR');
  expect(err.message).toBe(message);
};

describe('validateNotes', () => {
  test('rejects missing notes', () => {
    expectValidationError({}, 'notes is required');
  });

  test('rejects null notes', () => {
    expectValidationError({ notes: null }, 'notes is required');
  });

  test.each([123, true, ['a'], { text: 'a' }])('rejects non-string notes (%p)', (notes) => {
    expectValidationError({ notes: notes }, 'notes must be a string');
  });

  test.each(['', '   ', '\n\t '])('rejects empty or whitespace-only notes (%p)', (notes) => {
    expectValidationError({ notes: notes }, 'notes must not be empty');
  });

  test('rejects notes longer than 20,000 characters after trimming', () => {
    expectValidationError({ notes: 'a'.repeat(20001) }, 'notes must be at most 20,000 characters');
  });

  test('accepts notes of exactly 20,000 characters', () => {
    const { req, err } = run({ notes: 'a'.repeat(20000) });
    expect(err).toBeUndefined();
    expect(req.body.notes).toHaveLength(20000);
  });

  // Surrounding whitespace must not count toward the limit since it is trimmed away.
  test('measures length after trimming', () => {
    const { err } = run({ notes: `  ${'a'.repeat(20000)}  ` });
    expect(err).toBeUndefined();
  });

  test('replaces notes with the trimmed text and calls next with no error', () => {
    const { req, next, err } = run({ notes: '  photosynthesis notes \n' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(err).toBeUndefined();
    expect(req.body.notes).toBe('photosynthesis notes');
  });
});
