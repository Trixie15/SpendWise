const User = require('../models/User');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Purpose limitation: admins manage ACCOUNTS only. They see counts, never anyone's
// transactions, amounts, budgets or categories.
const ADMIN_VISIBLE_FIELDS = 'name email role isActive mfaEnabled mfaMethod createdAt lastLoginAt';

// @route  GET /api/admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [totalUsers, activeUsers, admins, mfaUsers, totalTransactions] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ mfaEnabled: true }),
    Transaction.estimatedDocumentCount(),
  ]);
  res.json({ totalUsers, activeUsers, admins, mfaUsers, totalTransactions });
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
  res.json({ users, page, pages: Math.ceil(total / limit) || 1, total });
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
  res.json(user);
});
