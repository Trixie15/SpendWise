// Same rules as server/utils/passwordPolicy.js (the server always re-checks)
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (! @ # $ % etc.)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (p) => p.length <= 128 && PASSWORD_RULES.every((r) => r.test(p));
