const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { currentMonth, monthRange, endOfDay } = require('../utils/dateUtils');

const sumByType = async (match) => {
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const income = rows.find((r) => r._id === 'income')?.total || 0;
  const expense = rows.find((r) => r._id === 'expense')?.total || 0;
  return { income, expense };
};

// @route  GET /api/dashboard/summary
// All-time balance, this month's totals, and 5 most recent transactions
exports.getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = monthRange(currentMonth());

  const [allTime, thisMonth, recent] = await Promise.all([
    sumByType({ user: userId }),
    sumByType({ user: userId, date: { $gte: start, $lt: end } }),
    Transaction.find({ user: userId })
      .populate('category', 'name icon color')
      .sort('-date -createdAt')
      .limit(5),
  ]);

  res.json({
    balance: allTime.income - allTime.expense,
    totalIncome: allTime.income,
    totalExpense: allTime.expense,
    monthIncome: thisMonth.income,
    monthExpense: thisMonth.expense,
    recentTransactions: recent,
  });
});

// @route  GET /api/dashboard/by-category?type=expense&month=2026-09
//         or ?startDate=2026-01-01&endDate=2026-03-31
// Used for the pie chart
exports.getCategoryBreakdown = asyncHandler(async (req, res) => {
  const type = req.query.type || 'expense';
  const match = { user: req.user._id, type };

  if (req.query.startDate || req.query.endDate) {
    match.date = {};
    if (req.query.startDate) match.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) match.date.$lte = endOfDay(req.query.endDate);
  } else {
    const { start, end } = monthRange(req.query.month || currentMonth());
    match.date = { $gte: start, $lt: end };
  }

  const data = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    {
      $project: {
        _id: 0,
        categoryId: '$_id',
        name: '$category.name',
        icon: '$category.icon',
        color: '$category.color',
        total: 1,
        count: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json(data);
});

// @route  GET /api/dashboard/monthly-trend?months=6
// Income vs expense per month, used for the bar/line chart
exports.getMonthlyTrend = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 24);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const rows = await Transaction.aggregate([
    { $match: { user: req.user._id, date: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Build every month in range so months with no data still show as 0
  const result = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const find = (type) =>
      rows.find((r) => r._id.year === year && r._id.month === month && r._id.type === type)
        ?.total || 0;
    result.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      income: find('income'),
      expense: find('expense'),
    });
  }

  res.json(result);
});
