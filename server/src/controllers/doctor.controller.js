const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { ApiError, asyncHandler, pick } = require('../utils/helpers');
const { uploadDir } = require('../middleware/upload');

const PROFILE_FIELDS = ['name', 'phone', 'clinicName', 'registrationNo', 'qualification', 'clinicAddress', 'clinicPhone'];

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: await User.findById(req.user.id) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const data = pick(req.body, PROFILE_FIELDS);
  if (data.phone !== undefined) data.phone = data.phone ? String(data.phone).replace(/[\s\-()]/g, '') : undefined;
  user.set(data);
  await user.save();
  res.json({ success: true, user });
});

// Factory: POST /me/logo and /me/signature
exports.saveImage = (field, urlKey) =>
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No image uploaded');
    const user = await User.findById(req.user.id);
    const old = user[urlKey];
    user[urlKey] = `/uploads/${req.file.filename}`;
    await user.save();
    // remove the replaced file (only if it lives in our upload dir)
    if (old) fs.unlink(path.join(uploadDir, path.basename(old)), () => {});
    res.json({ success: true, user });
  });
