const { ApiError } = require('../utils/apiHelpers');

function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, error: 'Duplicate record' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'Invalid identifier' });
  }
  console.error('[error]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
