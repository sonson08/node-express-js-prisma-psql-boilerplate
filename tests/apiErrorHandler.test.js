const createError = require('http-errors');
const apiErrorHandler = require('../middleware/apiErrorHandler');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const handle = (err) => {
  const res = mockRes();
  apiErrorHandler(err, {}, res, jest.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

describe('apiErrorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('maps oversized bodies to 413 PAYLOAD_TOO_LARGE', () => {
    expect(handle({ type: 'entity.too.large' })).toEqual({
      status: 413,
      body: { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } },
    });
  });

  test('maps malformed JSON to 400 VALIDATION_ERROR', () => {
    expect(handle({ type: 'entity.parse.failed' })).toEqual({
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
    });
  });

  test('passes through http-errors that carry a status and code', () => {
    const err = createError(502, 'Could not generate a summary. Please try again.', { code: 'LLM_ERROR' });
    expect(handle(err)).toEqual({
      status: 502,
      body: { error: { code: 'LLM_ERROR', message: 'Could not generate a summary. Please try again.' } },
    });
  });

  test('maps a plain 404 to NOT_FOUND', () => {
    expect(handle(createError(404))).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Not found' } },
    });
  });

  test('hides details of a non-http error that has a code but no status', () => {
    const err = Object.assign(new Error('db connection string leaked'), { code: 'P1001' });
    expect(handle(err)).toEqual({
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    });
    expect(console.error).toHaveBeenCalledWith(err);
  });

  test('maps unknown errors to 500 INTERNAL_ERROR', () => {
    expect(handle(new Error('boom'))).toEqual({
      status: 500,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
    });
  });
});
