const jwt = require('jsonwebtoken');

// Session token. "v" is the user's tokenVersion: bumping it on the server
// (logout, password change, account disabled) instantly invalidates old tokens.
const generateToken = (user) =>
  jwt.sign({ id: user._id, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

// Short-lived token that only proves the password step passed. It can't access
// any data; it can only be exchanged for a session token with a valid MFA code.
const generateMfaToken = (userId) =>
  jwt.sign({ id: userId, purpose: 'mfa' }, process.env.JWT_SECRET, { expiresIn: '5m' });

module.exports = { generateToken, generateMfaToken };
