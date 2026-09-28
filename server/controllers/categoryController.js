const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/categories?type=expense
exports.getCategories = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.type) filter.type = req.query.type;
  const categories = await Category.find(filter).sort({ type: 1, name: 1 });
  res.json(categories);
});

// @route  POST /api/categories
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;
  const category = await Category.create({ user: req.user._id, name, type, icon, color });
  res.status(201).json(category);
});

// @route  PUT /api/categories/:id  (type cannot be changed once created)
exports.updateCategory = asyncHandler(async (req, res) => {
  const updates = {};
  ['name', 'icon', 'color'].forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json(category);
});

// @route  DELETE /api/categories/:id
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.user._id });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const used = await Transaction.countDocuments({ category: category._id });
  if (used > 0) {
    res.status(400);
    throw new Error(
      `This category is used by ${used} transaction(s). Move or delete them first.`
    );
  }

  await Budget.deleteMany({ category: category._id });
  await category.deleteOne();
  res.json({ message: 'Category deleted' });
});
