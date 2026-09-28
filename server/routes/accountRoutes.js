const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const c = require('../controllers/accountController');

router.use(protect);

router.get('/export', c.exportData);

router.delete(
  '/',
  [
    body('password').isString().notEmpty().withMessage('Password is required'),
    body('confirm').equals('DELETE').withMessage('Type DELETE to confirm'),
  ],
  validate,
  c.deleteAccount
);

module.exports = router;
