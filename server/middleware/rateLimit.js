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

// AI suggestions: limited per user to control cost and prevent abuse of the AI service
exports.aiLimiter = limiter(60, 15, 'You have asked for suggestions many times. Please try again in an hour.', {
  keyGenerator: (req) => `ai:${req.user._id}`,
});
