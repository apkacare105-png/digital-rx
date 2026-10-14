const Medicine = require('../models/Medicine');
const { asyncHandler, escapeRegex } = require('../utils/helpers');

// GET /api/medicines?q=dol&limit=10  — autocomplete for the prescription builder
exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
  if (q.length < 2) return res.json({ success: true, items: [] });

  const rx = new RegExp(escapeRegex(q), 'i');
  const found = await Medicine.find({ isActive: true, $or: [{ brandName: rx }, { genericName: rx }] })
    .select('brandName genericName strength form manufacturer schedule isVerified')
    .limit(50)
    .lean();

  // Brand-name prefix matches first, then alphabetical
  const lower = q.toLowerCase();
  const rank = (m) => (m.brandName.toLowerCase().startsWith(lower) ? 0 : m.brandName.toLowerCase().includes(lower) ? 1 : 2);
  found.sort((a, b) => rank(a) - rank(b) || a.brandName.localeCompare(b.brandName));

  res.json({ success: true, items: found.slice(0, limit) });
});
