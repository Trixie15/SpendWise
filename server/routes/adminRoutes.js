const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/adminController');

// Every admin route requires login AND the admin role
router.use(protect, authorize('admin'));

router.get('/stats', c.getStats);

router.get(
  '/users',
  [query('search').optional().isLength({ max: 100 }).withMessage('Search is too long')],
  validate,
  c.getUsers
);

router.patch(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  ],
  validate,
  c.updateUser
);

module.exports = router;
