const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// Authentication: requires a valid, unrevoked session token
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) fail(res, 401, 'Please log in to continue');

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    fail(res, 401, 'Your session has expired. Please log in again.');
  }

  // MFA-pending tokens cannot be used to access data
  if (decoded.purpose) fail(res, 401, 'Please log in to continue');

  const user = await User.findById(decoded.id).select('+tokenVersion');
  if (!user) fail(res, 401, 'Please log in to continue');
  if (decoded.v !== user.tokenVersion) fail(res, 401, 'Your session has ended. Please log in again.');
  if (!user.isActive) fail(res, 403, 'This account has been disabled. Contact the administrator.');

  req.user = user;
  next();
});

// Authorization: restricts a route to specific roles, e.g. authorize('admin')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    return next(new Error('You do not have permission to do this'));
  }
  next();
};

module.exports = { protect, authorize };
