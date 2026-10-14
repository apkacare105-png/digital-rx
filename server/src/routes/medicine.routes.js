const router = require('express').Router();
const c = require('../controllers/medicine.controller');
const { authenticate } = require('../middleware/auth');

// Read-only search for any logged-in user. Admin create/update/delete live under /api/admin/medicines (phase 3).
router.get('/', authenticate, c.search);

module.exports = router;
