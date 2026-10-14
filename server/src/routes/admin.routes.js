const router = require('express').Router();
const multer = require('multer');
const { body, param } = require('express-validator');
const c = require('../controllers/admin.controller');
const { validate } = require('../middleware/common');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { ApiError } = require('../utils/helpers');

router.use(authenticate, requireAdmin);

const idRule = param('id').isMongoId().withMessage('Invalid id');
const phoneRule = body('phone').optional({ values: 'falsy' }).matches(/^\+?[0-9\s\-()]{7,16}$/).withMessage('Invalid phone');
const passwordRule = (optional) => {
  const r = body('password');
  return (optional ? r.optional({ values: 'falsy' }) : r)
    .isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');
};
const text = (fields, max = 200) => body(fields).optional().isString().trim().isLength({ max });

/* ---- doctors ---- */
router.get('/users', c.listUsers);
router.post(
  '/users',
  [body('name').isString().trim().notEmpty().isLength({ max: 120 }), body('email').isEmail().normalizeEmail(), phoneRule,
   text(['clinicName', 'registrationNo', 'qualification', 'clinicPhone']), text('clinicAddress', 500), passwordRule(false)],
  validate,
  c.createUser
);
router.put(
  '/users/:id',
  [idRule, body('name').optional().isString().trim().notEmpty().isLength({ max: 120 }), phoneRule,
   text(['clinicName', 'registrationNo', 'qualification', 'clinicPhone']), text('clinicAddress', 500),
   body('status').optional().isIn(['pending', 'active', 'disabled']), passwordRule(true)],
  validate,
  c.updateUser
);
router.delete('/users/:id', idRule, validate, c.disableUser);

/* ---- medicines ---- */
const medicineRules = (creating) => [
  creating ? body('brandName').isString().trim().notEmpty().isLength({ max: 200 }) : body('brandName').optional().isString().trim().notEmpty().isLength({ max: 200 }),
  text(['genericName', 'genericNameHindi'], 400),
  text(['strength', 'form', 'manufacturer'], 120),
  body('schedule').optional({ values: 'falsy' }).isIn(['H', 'H1', 'OTC']),
];

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    /\.csv$/i.test(file.originalname) ? cb(null, true) : cb(new ApiError(400, 'Only .csv files are allowed')),
});

router.get('/medicines', c.listMedicines);
router.post('/medicines', medicineRules(true), validate, c.createMedicine);
router.post('/medicines/bulk-import', csvUpload.single('file'), c.bulkImport);
router.put('/medicines/:id', [idRule, ...medicineRules(false)], validate, c.updateMedicine);
router.post('/medicines/:id/approve', idRule, validate, c.approveMedicine);
router.delete('/medicines/:id', idRule, validate, c.removeMedicine);

/* ---- support requests ---- */
router.get('/support', c.listSupport);
router.put('/support/:id', [idRule, body('status').isIn(['open', 'resolved'])], validate, c.updateSupport);

/* ---- dashboard & audit ---- */
router.get('/dashboard', c.dashboard);
router.get('/audit', c.audit);

module.exports = router;
