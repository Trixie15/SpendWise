const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { MAX_AMOUNT } = require('../utils/constants');
const c = require('../controllers/budgetController');

router.use(protect);
const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const limitRule = body('limit')
  .isFloat({ min: 1, max: MAX_AMOUNT }).withMessage('Limit must be between 1 and 1,000,000,000')
  .toFloat();

router.get(
  '/',
  [query('month').optional().matches(monthRegex).withMessage('Month must be YYYY-MM')],
  validate,
  c.getBudgets
);

router.post(
  '/',
  [
    body('category').isMongoId().withMessage('Valid category is required'),
    limitRule,
    body('month').optional().matches(monthRegex).withMessage('Month must be YYYY-MM'),
  ],
  validate,
  c.setBudget
);

router.put('/:id', [param('id').isMongoId().withMessage('Invalid budget ID'), limitRule], validate, c.updateBudget);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid budget ID')], validate, c.deleteBudget);

module.exports = router;
