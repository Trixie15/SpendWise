const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Purpose limitation: admins MONITOR and MANAGE ACCOUNTS only. They never see anyone's
// transactions, amounts, budgets or categories (and can't call those APIs at all).
const ADMIN_VISIBLE_FIELDS = 'firstName lastName name email role isActive mfaEnabled mfaMethod createdAt lastLoginAt +lockUntil';

const withLockStatus = (u) => {
  const locked = u.isLocked();
  return { ...u.toJSON(), isLocked: locked, lockUntil: locked ? u.lockUntil : null };
};

// @route  GET /api/admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [totalUsers, activeUsers, disabledUsers, lockedUsers, admins, mfaUsers, newUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ lockUntil: { $gt: now } }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ mfaEnabled: true }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);
  res.json({ totalUsers, activeUsers, disabledUsers, lockedUsers, admins, mfaUsers, newUsers });
});

// @route  GET /api/admin/users?search=&page=
exports.getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = 20;
  const filter = {};
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).select(ADMIN_VISIBLE_FIELDS).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users: users.map(withLockStatus), page, pages: Math.ceil(total / limit) || 1, total });
});

// @route  PATCH /api/admin/users/:id   body: { isActive?, role? }
exports.updateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot change your own role or status');
  }

  const updates = {};
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  if (req.body.role !== undefined) updates.role = req.body.role;

  // Disabling an account or changing its role ends all of that user's sessions
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updates, $inc: { tokenVersion: 1 } },
    { new: true, runValidators: true }
  ).select(ADMIN_VISIBLE_FIELDS);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(withLockStatus(user));
});

// @route  POST /api/admin/users/:id/unlock
// Lets an admin unlock an account that was locked after too many failed logins
exports.unlockUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } },
    { new: true }
  ).select(ADMIN_VISIBLE_FIELDS);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(withLockStatus(user));
});
