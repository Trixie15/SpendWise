const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { generateToken, generateMfaToken } = require('../utils/generateToken');
const { verifySecondFactor, methodOf } = require('../utils/mfa');
const { issueEmailOtp, OtpError } = require('../utils/emailOtp');
const { maskEmail } = require('../utils/email');
const defaultCategories = require('../utils/defaultCategories');
const { POLICY_VERSION, MAX_LOGIN_ATTEMPTS, LOCK_MINUTES } = require('../utils/constants');

// Used when the email doesn't exist so the response time is the same either way
// (prevents attackers from discovering which emails are registered by timing)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

const lockMessage = (lockUntil) => {
  const minutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
  return `Account temporarily locked after too many failed attempts. Try again in ${minutes} minute(s).`;
};

// Counts a failed attempt and locks the account after too many
const recordFailure = async (user) => {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    await User.updateOne(
      { _id: user._id },
      { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
    );
    return true;
  }
  await User.updateOne({ _id: user._id }, { failedLoginAttempts: attempts });
  return false;
};

const clearFailures = (userId) =>
  User.updateOne({ _id: userId }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });

const completeLogin = async (res, userId) => {
  const user = await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true }).select('+tokenVersion');
  res.json({ user, token: generateToken(user) });
};

// @route  POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (await User.findOne({ email })) fail(res, 400, 'Email is already registered');

  // Only these fields are accepted. "role" and other fields in the request are ignored,
  // so nobody can register themselves as an admin.
  const user = await User.create({
    name,
    email,
    password,
    consent: { acceptedAt: new Date(), policyVersion: POLICY_VERSION },
  });
  await Category.insertMany(defaultCategories.map((c) => ({ ...c, user: user._id })));

  res.status(201).json({ user, token: generateToken(user) });
});

// @route  POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    fail(res, 401, 'Invalid email or password');
  }
  if (user.isLocked()) fail(res, 423, lockMessage(user.lockUntil));

  if (!(await user.matchPassword(password))) {
    const locked = await recordFailure(user);
    if (locked) fail(res, 423, `Too many failed attempts. Your account is locked for ${LOCK_MINUTES} minutes.`);
    fail(res, 401, 'Invalid email or password');
  }

  if (!user.isActive) fail(res, 403, 'This account has been disabled. Contact the administrator.');
  await clearFailures(user._id);

  // Password was correct, but MFA users must also enter a code
  if (user.mfaEnabled) {
    const method = methodOf(user);
    const response = { mfaRequired: true, mfaToken: generateMfaToken(user._id), method };

    if (method === 'email') {
      response.emailHint = maskEmail(user.email);
      response.emailSent = true;
      try {
        const withOtp = await User.findById(user._id).select('+emailOtp');
        await issueEmailOtp(withOtp, 'login', { reuseIfRecent: true });
      } catch (err) {
        // Still continue: the user can press "Resend" or use a backup code
        if (!(err instanceof OtpError)) throw err;
        response.emailSent = false;
      }
    }
    return res.json(response);
  }

  await completeLogin(res, user._id);
});

// @route  POST /api/auth/mfa/verify  (second login step)
exports.verifyMfaLogin = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
  } catch {
    fail(res, 401, 'Verification timed out. Please log in again.');
  }
  if (decoded.purpose !== 'mfa') fail(res, 401, 'Verification failed. Please log in again.');

  const user = await User.findById(decoded.id).select(
    '+mfaSecret +mfaBackupCodes +emailOtp +failedLoginAttempts +lockUntil'
  );
  if (!user || !user.mfaEnabled || !user.isActive) fail(res, 401, 'Verification failed. Please log in again.');
  if (user.isLocked()) fail(res, 423, lockMessage(user.lockUntil));

  const result = await verifySecondFactor(user, code, 'login');
  if (!result.ok) {
    const locked = await recordFailure(user);
    if (locked) fail(res, 423, `Too many failed attempts. Your account is locked for ${LOCK_MINUTES} minutes.`);
    fail(res, 401, result.message || 'Invalid verification code');
  }

  // Backup codes work only once
  if (result.backupIndex >= 0) {
    user.mfaBackupCodes.splice(result.backupIndex, 1);
    await User.updateOne({ _id: user._id }, { mfaBackupCodes: user.mfaBackupCodes });
  }

  await clearFailures(user._id);
  await completeLogin(res, user._id);
});

// @route  POST /api/auth/mfa/resend  (email method only, during login)
exports.resendLoginCode = asyncHandler(async (req, res) => {
  let decoded;
  try {
    decoded = jwt.verify(req.body.mfaToken, process.env.JWT_SECRET);
  } catch {
    fail(res, 401, 'Verification timed out. Please log in again.');
  }
  if (decoded.purpose !== 'mfa') fail(res, 401, 'Verification failed. Please log in again.');

  const user = await User.findById(decoded.id).select('+emailOtp +lockUntil');
  if (!user || !user.mfaEnabled || !user.isActive || methodOf(user) !== 'email') {
    fail(res, 400, 'Email codes are not enabled for this account');
  }
  if (user.isLocked()) fail(res, 423, lockMessage(user.lockUntil));

  await issueEmailOtp(user, 'login');
  res.json({ message: `A new code was sent to ${maskEmail(user.email)}` });
});

// @route  POST /api/auth/logout
// Revokes the session on the server, not just in the browser
exports.logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ message: 'Logged out' });
});

// @route  GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @route  PUT /api/auth/me
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, currency } = req.body;
  if (name !== undefined) req.user.name = name;
  if (currency !== undefined) req.user.currency = currency;
  await req.user.save();
  res.json(req.user);
});

// @route  PUT /api/auth/password
// Signs out all other sessions and returns a fresh token for this one
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password +tokenVersion');

  if (!(await user.matchPassword(currentPassword))) fail(res, 400, 'Current password is incorrect');
  if (await user.matchPassword(newPassword)) fail(res, 400, 'New password must be different from your current password');

  user.password = newPassword;
  user.tokenVersion += 1;
  await user.save();

  res.json({ message: 'Password changed. Other devices have been signed out.', token: generateToken(user) });
});
