const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/prescription.controller');
const { validate } = require('../middleware/common');
const { authenticate, requireDoctor } = require('../middleware/auth');

router.use(authenticate, requireDoctor);

const idRule = param('id').isMongoId().withMessage('Invalid id');
const short = (f) => body(f).optional({ values: 'null' }).isString().trim().isLength({ max: 100 });

const rxRules = (creating) => [
  creating ? body('patientId').isMongoId() : body('patientId').optional().isMongoId(),
  body('status').optional().isIn(['draft', 'issued']),
  body('note').optional({ values: 'null' }).isString().trim().isLength({ max: 5000 }),
  body('diagnosis').optional().isString().trim().isLength({ max: 2000 }),
  body('advice').optional().isString().trim().isLength({ max: 2000 }),
  body('items').optional().isArray({ max: 30 }),
  body('items.*.brandName').isString().trim().notEmpty().isLength({ max: 200 }).withMessage('Medicine name is required'),
  body('items.*.medicineId').optional({ values: 'null' }).isMongoId(),
  short('items.*.genericName'),
  short('items.*.strength'),
  short('items.*.dose'),
  short('items.*.duration'),
  short('items.*.timing'),
];

router.get('/', c.list);
router.post('/', rxRules(true), validate, c.create);
router.get('/:id', idRule, validate, c.get);
router.put('/:id', idRule, rxRules(false), validate, c.update);
router.delete('/:id', idRule, validate, c.remove);
router.post('/:id/cancel', idRule, validate, c.cancel);
router.post('/:id/pdf-event', [idRule, body('action').isIn(['download', 'share'])], validate, c.pdfEvent);

module.exports = router;
