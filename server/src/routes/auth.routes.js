const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/auth.controller');
const { validate, authLimiter } = require('../middleware/common');
const { authenticate } = require('../middleware/auth');

const passwordRule = body('password')
  .isString()
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8–128 characters')
  .matches(/[A-Za-z]/)
  .withMessage('Password must contain a letter')
  .matches(/\d/)
  .withMessage('Password must contain a number');

router.use(authLimiter);

router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty().isLength({ max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').isString().trim().matches(/^\+?[0-9\s\-()]{7,16}$/).withMessage('Enter a valid phone number'),
    body(['clinicName', 'registrationNo', 'qualification']).optional().isString().trim().isLength({ max: 200 }),
    passwordRule,
  ],
  validate,
  c.register
);

router.post(
  '/login',
  [body('identifier').isString().trim().notEmpty(), body('password').isString().notEmpty()],
  validate,
  c.login
);

router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);

router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, c.forgotPassword);
router.post(
  '/reset-password',
  [body('token').isString().notEmpty().isLength({ max: 200 }), passwordRule],
  validate,
  c.resetPassword
);

module.exports = router;
