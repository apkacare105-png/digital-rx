const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/doctor.controller');
const upload = require('../middleware/upload');
const { validate } = require('../middleware/common');
const { authenticate, requireDoctor } = require('../middleware/auth');

router.use(authenticate, requireDoctor);

router.get('/me', c.getMe);
router.put(
  '/me',
  [
    body('name').optional().isString().trim().notEmpty().isLength({ max: 120 }),
    body('phone').optional({ values: 'falsy' }).matches(/^\+?[0-9\s\-()]{7,16}$/).withMessage('Invalid phone'),
    body(['clinicName', 'registrationNo', 'qualification', 'clinicPhone']).optional().isString().trim().isLength({ max: 200 }),
    body('clinicAddress').optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  c.updateMe
);
router.post('/me/logo', upload.single('logo'), c.saveImage('logo', 'logoUrl'));
router.post('/me/signature', upload.single('signature'), c.saveImage('signature', 'signatureUrl'));

module.exports = router;
