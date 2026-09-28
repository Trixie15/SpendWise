const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { endOfDay } = require('../utils/dateUtils');

const ALLOWED_SORTS = ['date', '-date', 'amount', '-amount'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Make sure the category exists, belongs to the user, and matches the type
const checkCategory = async (res, categoryId, userId, type) => {
  const category = await Category.findOne({ _id: categoryId, user: userId });
  if (!category) {
    res.status(400);
    throw new Error('Invalid category');
  }
  if (category.type !== type) {
    res.status(400);
    throw new Error(`Category "${category.name}" is for ${category.type}, not ${type}`);
  }
};

// @route  GET /api/transactions
// Query: type, category, startDate, endDate, search, page, limit, sort
exports.getTransactions = asyncHandler(async (req, res) => {
  const { type, category, startDate, endDate, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const sort = ALLOWED_SORTS.includes(req.query.sort) ? req.query.sort : '-date';

  const filter = { user: req.user._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = endOfDay(endDate);
  }
  if (search) filter.note = { $regex: escapeRegex(search), $options: 'i' };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name icon color type')
      .sort(`${sort} -createdAt`)
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({ transactions, page, pages: Math.ceil(total / limit), total });
});

// @route  GET /api/transactions/:id
exports.getTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate('category', 'name icon color type');

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  res.json(transaction);
});

// @route  POST /api/transactions
exports.createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, category, date, note, paymentMethod } = req.body;
  await checkCategory(res, category, req.user._id, type);

  const transaction = await Transaction.create({
    user: req.user._id,
    type,
    amount,
    category,
    date,
    note,
    paymentMethod,
  });
  await transaction.populate('category', 'name icon color type');
  res.status(201).json(transaction);
});

// @route  PUT /api/transactions/:id
exports.updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  const fields = ['type', 'amount', 'category', 'date', 'note', 'paymentMethod'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) transaction[f] = req.body[f];
  });

  if (req.body.type !== undefined || req.body.category !== undefined) {
    await checkCategory(res, transaction.category, req.user._id, transaction.type);
  }

  await transaction.save();
  await transaction.populate('category', 'name icon color type');
  res.json(transaction);
});

// @route  DELETE /api/transactions/:id
exports.deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  res.json({ message: 'Transaction deleted' });
});
