const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const c = require('../controllers/support.controller');
const { validate } = require('../middleware/common');
const { authenticate, requireDoctor } = require('../middleware/auth');
const { isProd } = require('../config/env');

router.use(authenticate, requireDoctor);

// Spam guard: 5 reports per hour per doctor
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'You have sent several reports already. Please wait a while, or contact support directly.' },
});

router.post(
  '/',
  reportLimiter,
  [
    body('type').optional().isIn(['login', 'prescription', 'medicine', 'whatsapp', 'other']),
    body('message').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('Please describe the problem (at least 5 characters)'),
    body('page').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }),
  ],
  validate,
  c.create
);

module.exports = router;
