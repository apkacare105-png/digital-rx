const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const AuditLog = require('../models/AuditLog');
const SupportRequest = require('../models/SupportRequest');
const RefreshToken = require('../models/RefreshToken');
const { normalizeMedicine, findOrCreateMedicine, importMedicines } = require('../services/medicineService');
const { ApiError, asyncHandler, pick, escapeRegex, paginate, audit } = require('../utils/helpers');

const revokeSessions = (userId) => RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
const cleanPhone = (p) => (p ? String(p).replace(/[\s\-()]/g, '') : undefined);
const page = (items, total, limit, pg) => ({ success: true, items, total, page: pg, pages: Math.ceil(total / limit) });

/* ------------------------------ Doctors ------------------------------ */

const DOCTOR_FIELDS = ['name', 'phone', 'clinicName', 'registrationNo', 'qualification', 'clinicAddress', 'clinicPhone'];
const doctorOnly = (id) => ({ _id: id, role: 'doctor' }); // admins cannot be edited/disabled through this API

// GET /api/admin/users?q=&status=&page=
exports.listUsers = asyncHandler(async (req, res) => {
  const { page: pg, limit, skip } = paginate(req);
  const filter = { role: 'doctor' };
  if (['pending', 'active', 'disabled'].includes(req.query.status)) filter.status = req.query.status;
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { clinicName: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(page(items, total, limit, pg));
});

// POST /api/admin/users  — add a doctor (active immediately)
exports.createUser = asyncHandler(async (req, res) => {
  const user = new User({
    ...pick(req.body, [...DOCTOR_FIELDS, 'email']),
    phone: cleanPhone(req.body.phone),
    role: 'doctor',
    status: 'active',
  });
  await user.setPassword(req.body.password);
  await user.save();
  audit(req, 'user.create', 'User', user._id, { name: user.name, email: user.email });
  res.status(201).json({ success: true, user });
});

// PUT /api/admin/users/:id  — edit details, change status (approve / disable / re-enable), optional password reset
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne(doctorOnly(req.params.id));
  if (!user) throw new ApiError(404, 'Doctor not found');

  const before = user.status;
  const data = pick(req.body, DOCTOR_FIELDS);
  if (data.phone !== undefined) data.phone = cleanPhone(data.phone); // '' -> unset (phone is unique when present)
  user.set(data);
  if (req.body.status) user.status = req.body.status;
  if (req.body.password) await user.setPassword(req.body.password);
  await user.save();

  if (user.status === 'disabled' || req.body.password) await revokeSessions(user._id);

  let action = 'user.update';
  if (before !== user.status) {
    action = user.status === 'disabled' ? 'user.disable' : before === 'pending' ? 'user.approve' : 'user.enable';
  } else if (req.body.password) action = 'user.password_reset';
  audit(req, action, 'User', user._id, { name: user.name, email: user.email });
  res.json({ success: true, user });
});

// DELETE /api/admin/users/:id  — SOFT delete: status=disabled. Prescriptions are never removed.
exports.disableUser = asyncHandler(async (req, res) => {
  const user = await User.findOne(doctorOnly(req.params.id));
  if (!user) throw new ApiError(404, 'Doctor not found');
  user.status = 'disabled';
  await user.save();
  await revokeSessions(user._id);
  audit(req, 'user.disable', 'User', user._id, { name: user.name, email: user.email });
  res.json({ success: true, user });
});

/* ----------------------------- Medicines ----------------------------- */

const MEDICINE_FIELDS = ['brandName', 'genericName', 'genericNameHindi', 'strength', 'form', 'manufacturer', 'schedule'];

// GET /api/admin/medicines?q=&verified=true|false&active=true|false|all&source=&page=
exports.listMedicines = asyncHandler(async (req, res) => {
  const { page: pg, limit, skip } = paginate(req, 100);
  const filter = {};
  const active = req.query.active ?? 'true';
  if (active !== 'all') filter.isActive = active === 'true';
  if (req.query.verified === 'true' || req.query.verified === 'false') filter.isVerified = req.query.verified === 'true';
  if (['admin', 'import', 'doctor'].includes(req.query.source)) filter.source = req.query.source;
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ brandName: rx }, { genericName: rx }, { manufacturer: rx }];
  }
  const sort = filter.isVerified === false ? { createdAt: -1 } : { brandName: 1 };
  const [items, total] = await Promise.all([
    Medicine.find(filter).collation({ locale: 'en' }).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name role'),
    Medicine.countDocuments(filter),
  ]);
  res.json(page(items, total, limit, pg));
});

// POST /api/admin/medicines
exports.createMedicine = asyncHandler(async (req, res) => {
  const { medicine, created } = await findOrCreateMedicine(pick(req.body, MEDICINE_FIELDS), {
    createdBy: req.user.id,
    source: 'admin',
    isVerified: true,
  });
  if (!created) {
    if (medicine.isActive) throw new ApiError(409, 'This medicine already exists');
    medicine.isActive = true; // it was removed earlier: bring it back
    medicine.isVerified = true;
    await medicine.save();
  }
  audit(req, 'medicine.create', 'Medicine', medicine._id, { brandName: medicine.brandName, restored: !created });
  res.status(201).json({ success: true, medicine });
});

// PUT /api/admin/medicines/:id  — editing also marks the medicine verified (admin has reviewed it)
exports.updateMedicine = asyncHandler(async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) throw new ApiError(404, 'Medicine not found');
  const merged = normalizeMedicine({ ...pick(med.toObject(), MEDICINE_FIELDS), ...pick(req.body, MEDICINE_FIELDS) });
  if (!merged.brandName) throw new ApiError(422, 'Brand name is required');
  med.set(merged);
  if (req.body.isActive !== undefined) med.isActive = Boolean(req.body.isActive);
  med.isVerified = req.body.isVerified !== undefined ? Boolean(req.body.isVerified) : true;
  await med.save();
  audit(req, 'medicine.update', 'Medicine', med._id, { brandName: med.brandName });
  res.json({ success: true, medicine: med });
});

// POST /api/admin/medicines/:id/approve
exports.approveMedicine = asyncHandler(async (req, res) => {
  const med = await Medicine.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  if (!med) throw new ApiError(404, 'Medicine not found');
  audit(req, 'medicine.approve', 'Medicine', med._id, { brandName: med.brandName });
  res.json({ success: true, medicine: med });
});

// DELETE /api/admin/medicines/:id  — SOFT delete so old prescriptions keep working
exports.removeMedicine = asyncHandler(async (req, res) => {
  const med = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!med) throw new ApiError(404, 'Medicine not found');
  audit(req, 'medicine.delete', 'Medicine', med._id, { brandName: med.brandName });
  res.json({ success: true, medicine: med });
});

// Accepts friendly header names so lists from other sources still import
const HEADER_ALIASES = {
  brandname: 'brandName', brand: 'brandName', name: 'brandName', medicine: 'brandName', medicinename: 'brandName',
  genericname: 'genericName', generic: 'genericName', salt: 'genericName', composition: 'genericName',
  genericnamehindi: 'genericNameHindi', hindi: 'genericNameHindi',
  strength: 'strength', form: 'form', manufacturer: 'manufacturer', company: 'manufacturer', schedule: 'schedule',
};
const MAX_IMPORT_ROWS = 5000;

// POST /api/admin/medicines/bulk-import  (multipart, field "file", CSV)
exports.bulkImport = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a CSV file to upload');
  let rows;
  try {
    rows = parse(req.file.buffer.toString('utf8'), {
      columns: (header) => header.map((h) => HEADER_ALIASES[String(h).toLowerCase().replace(/[^a-z]/g, '')] || String(h).trim()),
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (e) {
    throw new ApiError(400, `Could not read the CSV file: ${e.message}`);
  }
  if (!rows.length) throw new ApiError(422, 'The CSV file has no rows');
  if (!('brandName' in rows[0])) throw new ApiError(422, 'The CSV must have a "brandName" column');
  if (rows.length > MAX_IMPORT_ROWS) throw new ApiError(422, `Too many rows (max ${MAX_IMPORT_ROWS} per upload)`);

  const summary = await importMedicines(rows, { createdBy: req.user.id, source: 'import', isVerified: true });
  audit(req, 'medicine.bulk_import', 'Medicine', undefined, {
    file: req.file.originalname, total: summary.total, created: summary.created, existing: summary.existing, failed: summary.failed.length,
  });
  res.json({ success: true, ...summary, failed: summary.failed.slice(0, 50) });
});

/* --------------------------- Support requests --------------------------- */

// GET /api/admin/support?status=open|resolved&page=
exports.listSupport = asyncHandler(async (req, res) => {
  const { page: pg, limit, skip } = paginate(req);
  const filter = {};
  if (['open', 'resolved'].includes(req.query.status)) filter.status = req.query.status;
  const [items, total, open] = await Promise.all([
    SupportRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SupportRequest.countDocuments(filter),
    SupportRequest.countDocuments({ status: 'open' }),
  ]);
  res.json({ ...page(items, total, limit, pg), open });
});

// PUT /api/admin/support/:id  { status }
exports.updateSupport = asyncHandler(async (req, res) => {
  const doc = await SupportRequest.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Request not found');
  doc.status = req.body.status;
  doc.resolvedAt = req.body.status === 'resolved' ? new Date() : undefined;
  await doc.save();
  audit(req, 'support.' + doc.status, 'SupportRequest', doc._id);
  res.json({ success: true, request: doc });
});

/* ------------------------- Dashboard & audit ------------------------- */

// GET /api/admin/dashboard
exports.dashboard = asyncHandler(async (_req, res) => {
  const [byStatus, issued, activeMeds, unverifiedMeds, top, openSupport] = await Promise.all([
    User.aggregate([{ $match: { role: 'doctor' } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Prescription.countDocuments({ issuedAt: mongoose.trusted({ $ne: null }) }), // everything ever issued (incl. dispensed/cancelled later)
    Medicine.countDocuments({ isActive: true }),
    Medicine.countDocuments({ isActive: true, isVerified: false }),
    Prescription.aggregate([
      { $match: { issuedAt: { $ne: null } } },
      { $unwind: '$items' },
      { $group: { _id: { $ifNull: ['$items.medicineId', { $toLower: '$items.brandName' }] }, name: { $first: '$items.brandName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: 1, count: 1 } },
    ]),
    SupportRequest.countDocuments({ status: 'open' }),
  ]);
  const d = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  res.json({
    success: true,
    doctors: { total: (d.active || 0) + (d.pending || 0) + (d.disabled || 0), active: d.active || 0, pending: d.pending || 0, disabled: d.disabled || 0 },
    prescriptions: { issued },
    medicines: { active: activeMeds, unverified: unverifiedMeds },
    topMedicines: top,
    openSupport,
  });
});

// GET /api/admin/audit?actorRole=admin|doctor|pharmacy|all&action=&page=   (default: admin actions only)
exports.audit = asyncHandler(async (req, res) => {
  const { page: pg, limit, skip } = paginate(req, 100);
  const filter = {};
  const role = req.query.actorRole || 'admin';
  if (['admin', 'doctor', 'pharmacy', 'system'].includes(role)) filter.actorRole = role;
  const action = String(req.query.action || '').trim();
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`, 'i');
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('actorId', 'name email'),
    AuditLog.countDocuments(filter),
  ]);
  res.json(page(items, total, limit, pg));
});
