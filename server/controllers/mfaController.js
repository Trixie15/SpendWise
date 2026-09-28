const QRCode = require('qrcode');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { encrypt, randomBackupCode } = require('../utils/crypto');
const { authenticator, checkTotp, hashBackupCode, methodOf, verifySecondFactor } = require('../utils/mfa');
const { issueEmailOtp, verifyEmailOtp } = require('../utils/emailOtp');
const { maskEmail } = require('../utils/email');

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// Turns MFA on with the chosen method and returns fresh one-time backup codes
const turnOn = async (userId, method, extra = {}) => {
  const backupCodes = Array.from({ length: 8 }, randomBackupCode);
  await User.updateOne(
    { _id: userId },
    {
      $set: { mfaEnabled: true, mfaMethod: method, mfaBackupCodes: backupCodes.map(hashBackupCode), ...extra },
      $unset: { mfaTempSecret: 1, emailOtp: 1 },
    }
  );
  return backupCodes; // plain codes shown ONCE; only hashes are stored
};

// ===== Authenticator app (TOTP) =====

// @route  POST /api/auth/mfa/setup
exports.setup = asyncHandler(async (req, res) => {
  if (req.user.mfaEnabled) fail(res, 400, 'Two-factor authentication is already enabled');

  const secret = authenticator.generateSecret();
  await User.updateOne({ _id: req.user._id }, { mfaTempSecret: encrypt(secret) });

  const otpauth = authenticator.keyuri(req.user.email, process.env.MFA_ISSUER || 'SpendWise', secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  res.json({ qrCode, secret });
});

// @route  POST /api/auth/mfa/enable
exports.enable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaTempSecret');
  if (user.mfaEnabled) fail(res, 400, 'Two-factor authentication is already enabled');
  if (!user.mfaTempSecret) fail(res, 400, 'Start the setup first');

  if (!checkTotp(user.mfaTempSecret, String(req.body.code))) {
    fail(res, 400, "Invalid code. Check that your phone's time is correct and try again.");
  }

  const backupCodes = await turnOn(user._id, 'totp', { mfaSecret: user.mfaTempSecret });
  res.json({ message: 'Two-factor authentication enabled', method: 'totp', backupCodes });
});

// ===== Email code =====

// @route  POST /api/auth/mfa/email/setup   (sends a code to confirm the email works)
exports.emailSetup = asyncHandler(async (req, res) => {
  if (req.user.mfaEnabled) fail(res, 400, 'Two-factor authentication is already enabled');
  const user = await User.findById(req.user._id).select('+emailOtp');
  await issueEmailOtp(user, 'setup');
  res.json({ message: `We sent a code to ${maskEmail(user.email)}`, emailHint: maskEmail(user.email) });
});

// @route  POST /api/auth/mfa/email/enable
exports.emailEnable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+emailOtp');
  if (user.mfaEnabled) fail(res, 400, 'Two-factor authentication is already enabled');

  const result = await verifyEmailOtp(user, String(req.body.code), 'setup');
  if (!result.ok) fail(res, 400, result.message);

  const backupCodes = await turnOn(user._id, 'email', {});
  // Remove any leftover authenticator secret
  await User.updateOne({ _id: user._id }, { $unset: { mfaSecret: 1 } });
  res.json({ message: 'Two-factor authentication enabled', method: 'email', backupCodes });
});

// ===== Turning off =====

// @route  POST /api/auth/mfa/disable/send-code   (email method: sends a code to confirm)
exports.sendDisableCode = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+emailOtp');
  if (!user.mfaEnabled || methodOf(user) !== 'email') fail(res, 400, 'Email codes are not enabled');
  await issueEmailOtp(user, 'disable');
  res.json({ message: `We sent a code to ${maskEmail(user.email)}` });
});

// @route  POST /api/auth/mfa/disable   (requires password AND a current code)
exports.disable = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +mfaSecret +mfaBackupCodes +emailOtp');
  if (!user.mfaEnabled) fail(res, 400, 'Two-factor authentication is not enabled');
  if (!(await user.matchPassword(req.body.password))) fail(res, 400, 'Password is incorrect');

  const result = await verifySecondFactor(user, req.body.code, 'disable');
  if (!result.ok) fail(res, 400, result.message || 'Invalid verification code');

  await User.updateOne(
    { _id: user._id },
    {
      $set: { mfaEnabled: false },
      $unset: { mfaMethod: 1, mfaSecret: 1, mfaBackupCodes: 1, mfaTempSecret: 1, emailOtp: 1 },
    }
  );
  res.json({ message: 'Two-factor authentication disabled' });
});
