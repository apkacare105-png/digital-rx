const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/helpers');

const NOT_FOUND = 'This prescription could not be found. Please check the QR code or ask the doctor.';

// GET /api/verify/:code  — public, view-only check page opened from the QR code on the PDF.
// One generic failure for every bad case so codes can't be probed. No patient phone is returned.
exports.view = asyncHandler(async (req, res) => {
  const code = req.params.code;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(code)) throw new ApiError(404, NOT_FOUND);
  const rx = await Prescription.findOne({ verifyCode: code });
  if (!rx || rx.status === 'draft') throw new ApiError(404, NOT_FOUND);

  const [patient, doctor] = await Promise.all([
    Patient.findById(rx.patientId).select('name age gender allergies'),
    User.findById(rx.doctorId).select('name email phone qualification registrationNo clinicName clinicAddress clinicPhone logoUrl signatureUrl'),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, prescription: rx, patient, doctor });
});
