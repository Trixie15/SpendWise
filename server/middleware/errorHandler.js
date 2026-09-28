const notFound = (req, res, next) => {
  res.status(404);
  next(new Error('The requested resource was not found'));
};

// Central error handler: never crashes the server and never sends stack traces,
// database details, or internal messages to the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = res.statusCode >= 400 ? res.statusCode : err.status || err.statusCode || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON format in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request is too large';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    status = 400;
    message = err.keyValue?.email ? 'Email is already registered' : 'That name is already in use';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session has expired. Please log in again.';
  }

  if (status >= 500) {
    // Full details go to the server log only (path without query string, no request body)
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl.split('?')[0]}`, err);
    message = 'Something went wrong on our end. Please try again later.';
  }

  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
