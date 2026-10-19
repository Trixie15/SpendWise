const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { NAME_PATTERN, strongPassword } = require('../utils/validators');
const { CURRENCIES } = require('../utils/constants');
const auth = require('../controllers/authController');
const mfa = require('../controllers/mfaController');

const emailRule = body('email')
  .isString().withMessage('Valid email is required').bail()
  .trim().toLowerCase()
  .isLength({ max: 254 }).withMessage('Email is too long')
  .isEmail().withMessage('Valid email is required');

const nameRule = (field, label, optional = false) => {
  const rule = body(field);
  return (optional ? rule.optional() : rule)
    .isString().withMessage(`${label} is required`).bail()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage(`${label} must be 1 to 50 characters`)
    .matches(NAME_PATTERN).withMessage(`${label} can only contain letters, spaces, dots, apostrophes and hyphens`);
};

const codeRule = body('code')
  .isString().withMessage('Verification code is required').bail()
  .trim()
  .isLength({ min: 6, max: 9 }).withMessage('Enter the 6-digit code or a backup code');

// ----- Public -----
router.post(
  '/register',
  authLimiter,
  [
    nameRule('firstName', 'First name'),
    nameRule('lastName', 'Last name'),
    emailRule,
    strongPassword('password'),
    body('consent').custom((v) => v === true).withMessage('You must agree to the Privacy Policy to create an account'),
  ],
  validate,
  auth.register
);

router.post(
  '/login',
  authLimiter,
  [
    emailRule,
    body('password').isString().withMessage('Password is required').bail()
      .notEmpty().withMessage('Password is required')
      .isLength({ max: 128 }).withMessage('Invalid email or password'),
  ],
  validate,
  auth.login
);

router.post(
  '/mfa/verify',
  authLimiter,
  [body('mfaToken').isString().notEmpty().withMessage('Verification session is missing'), codeRule],
  validate,
  auth.verifyMfaLogin
);

router.post(
  '/mfa/resend',
  authLimiter,
  [body('mfaToken').isString().notEmpty().withMessage('Verification session is missing')],
  validate,
  auth.resendLoginCode
);

// ----- Logged in -----
router.post('/logout', protect, auth.logout);
router.get('/me', protect, auth.getMe);

router.put(
  '/me',
  protect,
  [nameRule('firstName', 'First name', true), nameRule('lastName', 'Last name', true), body('currency').optional().isIn(CURRENCIES).withMessage('Unsupported currency')],
  validate,
  auth.updateMe
);

router.put(
  '/password',
  protect,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    strongPassword('newPassword'),
  ],
  validate,
  auth.changePassword
);

router.post('/mfa/setup', protect, mfa.setup);
router.post(
  '/mfa/enable',
  protect,
  [body('code').isString().bail().trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your app')],
  validate,
  mfa.enable
);
const sixDigits = body('code').isString().bail().trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code');

router.post('/mfa/email/setup', protect, mfa.emailSetup);
router.post('/mfa/email/enable', protect, [sixDigits], validate, mfa.emailEnable);
router.post('/mfa/disable/send-code', protect, mfa.sendDisableCode);

router.post(
  '/mfa/disable',
  protect,
  [body('password').isString().notEmpty().withMessage('Password is required'), codeRule],
  validate,
  mfa.disable
);

module.exports = router;
