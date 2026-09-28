const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { noHtml } = require('../utils/validators');
const c = require('../controllers/categoryController');

router.use(protect);
const idRule = param('id').isMongoId().withMessage('Invalid category ID');

const nameRule = (optional) => {
  const rule = body('name');
  return (optional ? rule.optional() : rule)
    .isString().withMessage('Name is required').bail()
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('Name must be 1 to 30 characters')
    .custom(noHtml);
};
const iconRule = body('icon').optional().isString().isLength({ min: 1, max: 8 }).withMessage('Icon must be a single emoji').custom(noHtml);
const colorRule = body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be a hex code like #ff0000');

router.get(
  '/',
  [query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense')],
  validate,
  c.getCategories
);

router.post(
  '/',
  [nameRule(false), body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'), iconRule, colorRule],
  validate,
  c.createCategory
);

router.put('/:id', [idRule, nameRule(true), iconRule, colorRule], validate, c.updateCategory);
router.delete('/:id', [idRule], validate, c.deleteCategory);

module.exports = router;
