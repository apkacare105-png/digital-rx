const router = require('express').Router();
const c = require('../controllers/verify.controller');
const { publicRxLimiter } = require('../middleware/common');

// Public (no login), rate-limited. The unguessable code is checked server-side before any data is returned.
router.use(publicRxLimiter);
router.get('/:code', c.view);

module.exports = router;
