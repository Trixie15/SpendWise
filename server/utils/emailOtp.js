const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('./email');

const CODE_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODE_ATTEMPTS = 5;

// Keyed hash (HMAC): even if the database leaks, codes can't be recovered without the server key
const hashCode = (code) => crypto.createHmac('sha256', process.env.ENCRYPTION_KEY).update(code).digest('hex');

class OtpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Creates a new code, stores its hash, and emails it.
// "user" must be loaded with +emailOtp.
const issueEmailOtp = async (user, purpose, { reuseIfRecent = false } = {}) => {
  const existing = user.emailOtp;
  if (existing?.sentAt) {
    const secondsSince = (Date.now() - existing.sentAt.getTime()) / 1000;
    if (secondsSince < RESEND_COOLDOWN_SECONDS) {
      // At login, a recent unexpired code for the same purpose is simply reused
      if (reuseIfRecent && existing.purpose === purpose && existing.expiresAt > new Date()) return;
      throw new OtpError(429, `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince)} seconds before requesting a new code`);
    }
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0'); // cryptographically secure
  await User.updateOne(
    { _id: user._id },
    {
      emailOtp: {
        hash: hashCode(code),
        purpose,
        attempts: 0,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60000),
      },
    }
  );

  try {
    await sendOtpEmail(user.email, user.name, code, purpose);
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    await User.updateOne({ _id: user._id }, { $unset: { emailOtp: 1 } });
    throw new OtpError(502, 'We could not send the email right now. Please try again in a moment.');
  }
};

// Returns { ok, message }. "user" must be loaded with +emailOtp.
const verifyEmailOtp = async (user, code, purpose) => {
  const otp = user.emailOtp;
  if (!otp?.hash || otp.purpose !== purpose || otp.expiresAt < new Date()) {
    return { ok: false, message: 'This code has expired. Please request a new one.' };
  }
  if (otp.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false, message: 'Too many wrong codes. Please request a new one.' };
  }

  const matches = crypto.timingSafeEqual(Buffer.from(hashCode(code)), Buffer.from(otp.hash));
  if (!matches) {
    await User.updateOne({ _id: user._id }, { $inc: { 'emailOtp.attempts': 1 } });
    return { ok: false, message: 'Invalid verification code' };
  }

  // One-time use: delete the code as soon as it's used
  await User.updateOne({ _id: user._id }, { $unset: { emailOtp: 1 } });
  return { ok: true };
};

module.exports = { issueEmailOtp, verifyEmailOtp, OtpError, RESEND_COOLDOWN_SECONDS };
