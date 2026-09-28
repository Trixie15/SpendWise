// Blocks NoSQL injection (e.g. { "email": { "$gt": "" } }) and prototype pollution
const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || BLOCKED_KEYS.includes(key)) {
        delete value[key];
      } else {
        value[key] = clean(value[key]);
      }
    }
  }
  return value;
};

module.exports = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  // Query values must be plain strings. Drops ?type[$ne]=x and ?type=a&type=b (parameter pollution)
  for (const key of Object.keys(req.query)) {
    if (typeof req.query[key] !== 'string') delete req.query[key];
  }
  next();
};
