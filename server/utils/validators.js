const { body } = require('express-validator');
const { checkPassword } = require('./passwordPolicy');

// Rejects anything that looks like HTML/script injection
const noHtml = (value) => {
  if (/[<>]/.test(value)) throw new Error('HTML tags and < > characters are not allowed');
  return true;
};

// Letters (any language), spaces, dots, apostrophes, hyphens
const NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;

const strongPassword = (field) =>
  body(field).custom((value) => {
    const error = checkPassword(value);
    if (error) throw new Error(error);
    return true;
  });

// Dates must be real and within a sensible range
const reasonableDate = (value) => {
  const d = new Date(value);
  const min = new Date('2000-01-01');
  const max = new Date();
  max.setFullYear(max.getFullYear() + 1);
  if (d < min || d > max) throw new Error('Date must be between the year 2000 and one year from now');
  return true;
};

module.exports = { noHtml, NAME_PATTERN, strongPassword, reasonableDate };
