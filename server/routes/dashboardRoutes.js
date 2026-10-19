const router = require('express').Router();
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/dashboardController');

// Personal finance data is for regular users only; admins monitor accounts, not finances
router.use(protect, authorize('user'));

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthRule = (field) => query(field).optional().matches(monthRegex).withMessage('Month must be YYYY-MM');

router.get('/summary', [monthRule('month')], validate, c.getSummary);
router.get(
  '/by-category',
  [monthRule('month'), query('type').optional().isIn(['income', 'expense']).withMessage('Invalid type')],
  validate,
  c.getCategoryBreakdown
);
router.get(
  '/monthly-trend',
  [monthRule('end'), query('months').optional().isInt({ min: 1, max: 24 }).withMessage('months must be 1 to 24')],
  validate,
  c.getMonthlyTrend
);

module.exports = router;
