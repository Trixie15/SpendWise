const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/account/export
// Privacy: right of access / data portability. Download everything we store about you.
exports.exportData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [categories, transactions, budgets] = await Promise.all([
    Category.find({ user: userId }).select('name type icon color createdAt').lean(),
    Transaction.find({ user: userId })
      .populate('category', 'name')
      .select('type amount category date note paymentMethod createdAt')
      .sort('-date')
      .lean(),
    Budget.find({ user: userId }).populate('category', 'name').select('category limit month').lean(),
  ]);

  const u = req.user;
  res.setHeader('Content-Disposition', 'attachment; filename="spendwise-my-data.json"');
  res.json({
    exportedAt: new Date(),
    profile: {
      name: u.name,
      email: u.email,
      currency: u.currency,
      role: u.role,
      mfaEnabled: u.mfaEnabled,
      mfaMethod: u.mfaEnabled ? u.mfaMethod || 'totp' : null,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      consent: u.consent,
    },
    categories,
    transactions,
    budgets,
  });
});

// @route  DELETE /api/account
// Privacy: right to erasure. Permanently deletes the account and ALL its data.
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.password))) {
    res.status(400);
    throw new Error('Password is incorrect');
  }

  await Promise.all([
    Transaction.deleteMany({ user: user._id }),
    Budget.deleteMany({ user: user._id }),
    Category.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();

  res.json({ message: 'Your account and all your data have been permanently deleted' });
});
