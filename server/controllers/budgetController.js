const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { currentMonth, monthRange } = require('../utils/dateUtils');
const { buildSummary, basicRecommendations, aiRecommendations } = require('../utils/aiBudget');

// @route  GET /api/budgets?month=2026-09
// Returns each budget with how much has been spent, remaining, % used, and status
exports.getBudgets = asyncHandler(async (req, res) => {
  const month = req.query.month || currentMonth();
  const { start, end } = monthRange(month);

  const budgets = await Budget.find({ user: req.user._id, month }).populate(
    'category',
    'name icon color'
  );

  const spending = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type: 'expense',
        date: { $gte: start, $lt: end },
        category: { $in: budgets.map((b) => b.category._id) },
      },
    },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } },
  ]);

  const spentMap = Object.fromEntries(spending.map((s) => [s._id.toString(), s.spent]));

  const result = budgets.map((b) => {
    const spent = spentMap[b.category._id.toString()] || 0;
    const percentage = Math.round((spent / b.limit) * 100);
    return {
      _id: b._id,
      category: b.category,
      month: b.month,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      percentage,
      status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'ok',
    };
  });

  res.json(result);
});

// @route  POST /api/budgets  (creates, or updates if one exists for that category+month)
exports.setBudget = asyncHandler(async (req, res) => {
  const { category, limit } = req.body;
  const month = req.body.month || currentMonth();

  const cat = await Category.findOne({ _id: category, user: req.user._id });
  if (!cat || cat.type !== 'expense') {
    res.status(400);
    throw new Error('Budgets can only be set on your expense categories');
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, category, month },
    { limit },
    { new: true, upsert: true, runValidators: true }
  ).populate('category', 'name icon color');

  res.json(budget);
});

// @route  PUT /api/budgets/:id
exports.updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { limit: req.body.limit },
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }
  res.json(budget);
});

// @route  DELETE /api/budgets/:id
exports.deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }
  res.json({ message: 'Budget deleted' });
});

// @route  POST /api/budgets/recommendations   body: { month? }
// Suggests a monthly limit per category based on the last 3 months of spending.
exports.getRecommendations = asyncHandler(async (req, res) => {
  const month = req.body.month || currentMonth();
  const currency = req.user.currency || 'PHP';
  const summary = await buildSummary(req.user._id, month);

  if (!summary.categories.length) {
    res.status(400);
    throw new Error('Not enough data yet. Log some expenses first, then try again.');
  }

  let result = null;
  let source = 'basic';
  let notice = null;

  if (process.env.GEMINI_API_KEY) {
    try {
      result = await aiRecommendations(summary, currency, month);
      source = 'ai';
    } catch (err) {
      console.error('AI budget recommendation failed:', err.message);
      notice = 'The AI service is unavailable right now, so these suggestions were calculated from your spending averages.';
    }
  } else {
    notice = 'AI is not connected yet, so these suggestions were calculated from your spending averages.';
  }
  if (!result) result = basicRecommendations(summary, currency);

  res.json({
    source,
    model: source === 'ai' ? result.model : undefined,
    month,
    basedOn: summary.months,
    partialMonth: summary.partialMonth,
    averageIncome: Math.round(summary.averageIncome),
    tip: result.tip,
    notice,
    recommendations: result.recommendations.map((r) => ({
      category: r.category,
      averageSpent: Math.round(r.average),
      suggestedLimit: r.limit,
      currentLimit: r.currentLimit,
      reason: r.reason,
    })),
  });
});
