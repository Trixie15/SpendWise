// Password rules. Mirrored in client/src/utils/passwordPolicy.js for the live checklist.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, message: 'at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), message: 'a lowercase letter' },
  { test: (p) => /[0-9]/.test(p), message: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'a special character (e.g. ! @ # $ %)' },
];
const MAX_PASSWORD_LENGTH = 128;

// Returns an error message, or null if the password is strong enough
const checkPassword = (password) => {
  if (typeof password !== 'string') return 'Password must be text';
  if (password.length > MAX_PASSWORD_LENGTH) return `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`;
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message);
  if (missing.length) return `Password must contain ${missing.join(', ')}`;
  return null;
};

module.exports = { PASSWORD_RULES, MAX_PASSWORD_LENGTH, checkPassword };
