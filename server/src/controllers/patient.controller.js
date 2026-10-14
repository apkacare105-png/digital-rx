const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const { ApiError, asyncHandler, pick, escapeRegex, paginate } = require('../utils/helpers');

const FIELDS = ['name', 'age', 'gender', 'phone', 'allergies', 'chronicConditions'];

// Every query is scoped by doctorId — a doctor can never touch another doctor's patients.
const own = (req, id) => ({ _id: id, doctorId: req.user.id });

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const filter = { doctorId: req.user.id };
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

exports.create = asyncHandler(async (req, res) => {
  const patient = await Patient.create({ ...pick(req.body, FIELDS), doctorId: req.user.id });
  res.status(201).json({ success: true, patient });
});

exports.get = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne(own(req, req.params.id));
  if (!patient) throw new ApiError(404, 'Patient not found');
  const prescriptions = await Prescription.find({ doctorId: req.user.id, patientId: patient._id })
    .sort({ createdAt: -1 })
    .select('rxNo status note diagnosis issuedAt createdAt items.brandName');
  res.json({ success: true, patient, prescriptions });
});

exports.update = asyncHandler(async (req, res) => {
  const patient = await Patient.findOneAndUpdate(own(req, req.params.id), pick(req.body, FIELDS), {
    new: true,
    runValidators: true,
  });
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ success: true, patient });
});

exports.remove = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne(own(req, req.params.id));
  if (!patient) throw new ApiError(404, 'Patient not found');
  if (await Prescription.exists({ patientId: patient._id })) {
    throw new ApiError(409, 'This patient has prescriptions and cannot be deleted');
  }
  await patient.deleteOne();
  res.json({ success: true });
});
