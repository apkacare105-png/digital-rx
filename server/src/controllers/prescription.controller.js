const mongoose = require('mongoose');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const { findOrCreateMedicine } = require('../services/medicineService');
const { ApiError, asyncHandler, pick, randomToken, audit, escapeRegex, paginate } = require('../utils/helpers');

const ITEM_FIELDS = ['medicineId', 'brandName', 'genericName', 'strength', 'dose', 'duration', 'timing'];
const SHEET_PATIENT = 'name age gender phone allergies chronicConditions';
const SHEET_DOCTOR = 'name email phone qualification registrationNo clinicName clinicAddress clinicPhone logoUrl signatureUrl';

const own = (req, id) => ({ _id: id, doctorId: req.user.id });

async function assertOwnPatient(req, patientId) {
  if (!(await Patient.exists({ _id: patientId, doctorId: req.user.id }))) {
    throw new ApiError(404, 'Patient not found');
  }
}

/** Whitelists item fields and checks any referenced medicineId really exists. */
async function cleanItems(items = []) {
  const cleaned = items.map((i) => {
    const it = pick(i, ITEM_FIELDS);
    if (!it.medicineId) it.medicineId = null;
    return it;
  });
  const ids = cleaned.map((i) => i.medicineId).filter(Boolean);
  if (ids.length) {
    const found = await Medicine.countDocuments({ _id: mongoose.trusted({ $in: ids }) });
    if (found !== new Set(ids.map(String)).size) throw new ApiError(422, 'One or more medicines are invalid');
  }
  return cleaned;
}

/**
 * Auto-save: custom medicines (no medicineId) typed by the doctor are added to the master list on issue,
 * visible to all doctors, flagged unverified for admin review. Existing matches are reused, never duplicated.
 */
async function resolveCustomMedicines(items, doctorId) {
  for (const it of items) {
    if (it.medicineId) continue;
    const { medicine } = await findOrCreateMedicine(
      { brandName: it.brandName, genericName: it.genericName, strength: it.strength },
      { createdBy: doctorId, source: 'doctor', isVerified: false }
    );
    it.medicineId = medicine._id;
  }
  return items;
}

async function saveWithRxNo(doc) {
  for (let attempt = 0; attempt < 5; attempt++) {
    doc.rxNo = Prescription.generateRxNo();
    try {
      return await doc.save();
    } catch (e) {
      if (e.code === 11000 && e.keyPattern?.rxNo) continue; // astronomically rare; retry
      throw e;
    }
  }
  throw new ApiError(500, 'Could not generate prescription number');
}

async function issue(doc, req) {
  if (!doc.items.length) throw new ApiError(422, 'Add at least one medicine before issuing');
  doc.items = await resolveCustomMedicines(doc.items.map((i) => i.toObject()), req.user.id);
  doc.status = 'issued';
  doc.issuedAt = new Date();
  doc.verifyCode = randomToken(24);
}

async function sheet(rx) {
  const [patient, doctor] = await Promise.all([
    Patient.findById(rx.patientId).select(SHEET_PATIENT),
    User.findById(rx.doctorId).select(SHEET_DOCTOR),
  ]);
  return { prescription: rx, patient, doctor };
}

// POST /api/prescriptions   body.status: 'draft' (default) | 'issued'
exports.create = asyncHandler(async (req, res) => {
  await assertOwnPatient(req, req.body.patientId);
  const doc = new Prescription({
    doctorId: req.user.id,
    patientId: req.body.patientId,
    note: req.body.note,
    diagnosis: req.body.diagnosis,
    advice: req.body.advice,
    items: await cleanItems(req.body.items),
  });
  if (req.body.status === 'issued') await issue(doc, req);
  await saveWithRxNo(doc);
  audit(req, doc.status === 'issued' ? 'prescription.issue' : 'prescription.create_draft', 'Prescription', doc._id);
  res.status(201).json({ success: true, ...(await sheet(doc)) });
});

// GET /api/prescriptions?status=&patientId=&q=&page=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const filter = { doctorId: req.user.id };
  if (['draft', 'issued', 'dispensed', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.patientId) filter.patientId = String(req.query.patientId);
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const patientIds = await Patient.find({ doctorId: req.user.id, name: rx }).distinct('_id');
    filter.$or = [{ rxNo: rx }, { patientId: mongoose.trusted({ $in: patientIds }) }];
  }
  const [items, total] = await Promise.all([
    Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('rxNo status note diagnosis issuedAt createdAt patientId items.brandName')
      .populate('patientId', 'name age gender'),
    Prescription.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/prescriptions/:id
exports.get = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne(own(req, req.params.id));
  if (!rx) throw new ApiError(404, 'Prescription not found');
  if (rx.status !== 'draft' && !rx.verifyCode) {
    // issued before the QR feature existed: give it a code now
    rx.verifyCode = randomToken(24);
    await rx.save();
  }
  res.json({ success: true, ...(await sheet(rx)) });
});

// PUT /api/prescriptions/:id  — drafts only; body.status 'issued' issues it in the same save
exports.update = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne(own(req, req.params.id));
  if (!rx) throw new ApiError(404, 'Prescription not found');
  if (rx.status !== 'draft') throw new ApiError(409, 'Issued prescriptions are locked and cannot be edited');

  if (req.body.patientId) {
    await assertOwnPatient(req, req.body.patientId);
    rx.patientId = req.body.patientId;
  }
  if (req.body.note !== undefined) rx.note = req.body.note;
  if (req.body.diagnosis !== undefined) rx.diagnosis = req.body.diagnosis;
  if (req.body.advice !== undefined) rx.advice = req.body.advice;
  if (req.body.items) rx.items = await cleanItems(req.body.items);
  if (req.body.status === 'issued') await issue(rx, req);
  await rx.save();
  if (rx.status === 'issued') audit(req, 'prescription.issue', 'Prescription', rx._id);
  res.json({ success: true, ...(await sheet(rx)) });
});

// POST /api/prescriptions/:id/cancel
exports.cancel = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne(own(req, req.params.id));
  if (!rx) throw new ApiError(404, 'Prescription not found');
  if (rx.status !== 'issued') throw new ApiError(409, 'Only issued prescriptions can be cancelled');
  rx.status = 'cancelled';
  await rx.save();
  audit(req, 'prescription.cancel', 'Prescription', rx._id);
  res.json({ success: true, ...(await sheet(rx)) });
});

// DELETE /api/prescriptions/:id  — drafts only (issued records are permanent)
exports.remove = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne(own(req, req.params.id));
  if (!rx) throw new ApiError(404, 'Prescription not found');
  if (rx.status !== 'draft') throw new ApiError(409, 'Only drafts can be deleted');
  await rx.deleteOne();
  res.json({ success: true });
});

// POST /api/prescriptions/:id/pdf-event  { action: 'download' | 'share' }
// The PDF is made in the browser; this only records that the doctor downloaded or shared it.
exports.pdfEvent = asyncHandler(async (req, res) => {
  const rx = await Prescription.findOne(own(req, req.params.id)).select('_id status');
  if (!rx) throw new ApiError(404, 'Prescription not found');
  if (rx.status === 'draft') throw new ApiError(409, 'Only issued prescriptions can be shared');
  audit(req, `prescription.pdf_${req.body.action}`, 'Prescription', rx._id);
  res.json({ success: true });
});

exports._sheet = sheet;
