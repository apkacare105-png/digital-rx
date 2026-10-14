const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/patient.controller');
const { validate } = require('../middleware/common');
const { authenticate, requireDoctor } = require('../middleware/auth');

router.use(authenticate, requireDoctor);

const idRule = param('id').isMongoId().withMessage('Invalid id');
const rules = (creating) => [
  creating ? body('name').isString().trim().notEmpty().isLength({ max: 120 }) : body('name').optional().isString().trim().notEmpty().isLength({ max: 120 }),
  body('age').optional().isInt({ min: 0, max: 130 }).toInt(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('phone').optional({ values: 'falsy' }).matches(/^\+?[0-9\s\-()]{7,16}$/).withMessage('Invalid phone'),
  body(['allergies', 'chronicConditions']).optional().isString().trim().isLength({ max: 500 }),
];

router.get('/', c.list);
router.post('/', rules(true), validate, c.create);
router.get('/:id', idRule, validate, c.get);
router.put('/:id', idRule, rules(false), validate, c.update);
router.delete('/:id', idRule, validate, c.remove);

module.exports = router;
