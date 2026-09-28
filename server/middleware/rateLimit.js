const rateLimit = require('express-rate-limit');

const limiter = (minutes, limit, message, options = {}) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
    ...options,
  });

// General limit for the whole API
exports.apiLimiter = limiter(15, 300, 'Too many requests. Please wait a few minutes and try again.');

// Strict limit for login, register and MFA (only failed attempts count)
exports.authLimiter = limiter(
  15,
  10,
  'Too many attempts from this device. Please try again in 15 minutes.',
  { skipSuccessfulRequests: true }
);
