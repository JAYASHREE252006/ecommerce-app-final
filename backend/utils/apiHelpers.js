function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

module.exports = { asyncHandler, ApiError, ok };
