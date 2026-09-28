const { validationResult } = require('express-validator');

// Returns 400 with the first error. Submitted values are NOT echoed back,
// so passwords and other sensitive input never appear in responses.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return res.status(400).json({ message: errors[0].message, errors });
  }
  next();
};
