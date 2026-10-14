const User = require('../models/User');
const SupportRequest = require('../models/SupportRequest');
const { ApiError, asyncHandler } = require('../utils/helpers');

// POST /api/support  — a signed-in doctor reports a problem
exports.create = asyncHandler(async (req, res) => {
  const doctor = await User.findById(req.user.id).select('name email phone');
  if (!doctor) throw new ApiError(401, 'Account unavailable');
  const doc = await SupportRequest.create({
    doctorId: doctor._id,
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    doctorPhone: doctor.phone,
    type: req.body.type || 'other',
    message: req.body.message,
    page: req.body.page,
  });
  res.status(201).json({ success: true, id: doc._id });
});
