/* Send errors under /api as { error: { code, message } }. */
var apiErrorHandler = (err, req, res, next) => {
  var send = (status, code, message) => res.status(status).json({ error: { code: code, message: message } });

  if (err.type === 'entity.too.large') return send(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  if (err.type === 'entity.parse.failed') return send(400, 'VALIDATION_ERROR', 'Request body must be valid JSON');
  // Only errors created with http-errors carry both status and code; other errors (Prisma, Node) may have a code too.
  if (err.status && err.code) return send(err.status, err.code, err.message);
  if (err.status === 404) return send(404, 'NOT_FOUND', 'Not found');

  console.error(err);
  send(500, 'INTERNAL_ERROR', 'Something went wrong');
};

module.exports = apiErrorHandler;
