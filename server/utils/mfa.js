const { authenticator } = require('otplib');
const { decrypt, sha256 } = require('./crypto');

// Accept the previous/next 30-second code to allow for small clock differences
authenticator.options = { window: 1 };

const checkTotp = (encryptedSecret, code) => {
  try {
    return authenticator.verify({ token: code, secret: decrypt(encryptedSecret) });
  } catch {
    return false;
  }
};

const hashBackupCode = (code) => sha256(code.replace(/-/g, '').toUpperCase());

const methodOf = (user) => user.mfaMethod || 'totp';

// Checks a 6-digit code (authenticator app OR email, depending on the user's method)
// or an 8-character backup code. Returns { ok, message, backupIndex }.
// "user" must be loaded with +mfaSecret +mfaBackupCodes +emailOtp.
const verifySecondFactor = async (user, rawCode, purpose) => {
  const { verifyEmailOtp } = require('./emailOtp'); // lazy to avoid a circular import
  const code = String(rawCode || '').replace(/[\s-]/g, '').toUpperCase();

  if (/^\d{6}$/.test(code)) {
    if (methodOf(user) === 'email') {
      const result = await verifyEmailOtp(user, code, purpose);
      return { ...result, backupIndex: -1 };
    }
    const ok = checkTotp(user.mfaSecret, code);
    return { ok, message: ok ? undefined : 'Invalid verification code', backupIndex: -1 };
  }

  if (/^[0-9A-F]{8}$/.test(code)) {
    const index = (user.mfaBackupCodes || []).indexOf(sha256(code));
    return { ok: index >= 0, message: index >= 0 ? undefined : 'Invalid backup code', backupIndex: index };
  }

  return { ok: false, message: 'Enter the 6-digit code or a backup code', backupIndex: -1 };
};

module.exports = { authenticator, checkTotp, hashBackupCode, methodOf, verifySecondFactor };
