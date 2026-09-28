const crypto = require('crypto');

// AES-256-GCM: encrypts data at rest (used for MFA secrets) and detects tampering
const ALGORITHM = 'aes-256-gcm';
const getKey = () => Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
};

exports.decrypt = (payload) => {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
};

// One-way hash, used for MFA backup codes
exports.sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Backup code like "A1B2-C3D4"
exports.randomBackupCode = () => {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
};
