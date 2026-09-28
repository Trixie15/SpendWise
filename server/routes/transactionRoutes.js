const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { PAYMENT_METHODS } = require('../models/Transaction');
const { noHtml, reasonableDate } = require('../utils/validators');
const { MAX_AMOUNT } = require('../utils/constants');
const c = require('../controllers/transactionController');

router.use(protect);
const idRule = param('id').isMongoId().withMessage('Invalid transaction ID');

// Builds rules; "optional" for updates where any field may be left out
const rules = (optional) => {
  const f = (field) => (optional ? body(field).optional() : body(field));
  return [
    f('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    f('amount')
      .isFloat({ gt: 0, max: MAX_AMOUNT }).withMessage('Amount must be greater than 0 and at most 1,000,000,000')
      .toFloat(),
    f('category').isMongoId().withMessage('Valid category is required'),
    body('date').optional().isISO8601({ strict: true }).withMessage('Date must be YYYY-MM-DD').bail().custom(reasonableDate),
    body('note').optional().isString().bail().trim()
      .isLength({ max: 200 }).withMessage('Note cannot exceed 200 characters')
      .custom(noHtml),
    body('paymentMethod').optional().isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  ];
};

router.get(
  '/',
  [
    query('type').optional().isIn(['income', 'expense']).withMessage('Invalid type filter'),
    query('category').optional().isMongoId().withMessage('Invalid category ID'),
    query('startDate').optional().isISO8601().withMessage('startDate must be YYYY-MM-DD'),
    query('endDate').optional().isISO8601().withMessage('endDate must be YYYY-MM-DD'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search is too long'),
    query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1 to 100'),
  ],
  validate,
  c.getTransactions
);

router.get('/:id', [idRule], validate, c.getTransaction);
router.post('/', rules(false), validate, c.createTransaction);
router.put('/:id', [idRule, ...rules(true)], validate, c.updateTransaction);
router.delete('/:id', [idRule], validate, c.deleteTransaction);

module.exports = router;
