const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const env = require('../config/env');
const { ApiError, asyncHandler, sha256, randomToken, audit } = require('../utils/helpers');
const {
  REFRESH_COOKIE,
  signAccessToken,
  createRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  verifyRefreshToken,
} = require('../utils/tokens');
const { sendMail } = require('../utils/mailer');

// Used to equalise timing when the account doesn't exist (avoids user enumeration via response time)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const normalizePhone = (p) => (p ? String(p).replace(/[\s\-()]/g, '') : undefined);

async function startSession(user, req, res, family) {
  const refresh = await createRefreshToken(user, req, family);
  setRefreshCookie(res, refresh.token, refresh.expiresAt);
  return { accessToken: signAccessToken(user), user };
}

// POST /api/auth/register  (doctors only — admins are created via seed / admin panel)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, clinicName, registrationNo, qualification } = req.body;

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone: normalizePhone(phone) }] : [])],
  });
  if (exists) throw new ApiError(409, 'An account with this email or phone already exists');

  const user = new User({
    name,
    email,
    phone: normalizePhone(phone),
    clinicName,
    registrationNo,
    qualification,
    role: 'doctor', // never trust a client-supplied role
    status: 'active', // no admin approval needed: new doctors can use the app straight away
  });
  await user.setPassword(password);
  await user.save();
  audit({ ...req, user: { id: user._id, role: 'doctor' } }, 'auth.register', 'User', user._id);

  const session = await startSession(user, req, res);
  res.status(201).json({ success: true, ...session });
});

// POST /api/auth/login  { identifier: email|phone, password }
exports.login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };

  const user = await User.findOne(query).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid credentials');

  if (user.status === 'pending') {
    // Approval was removed: activate doctors who registered before that change
    user.status = 'active';
    await user.save();
  }
  if (user.status === 'disabled') throw new ApiError(403, 'Your account has been disabled. Contact support.');

  const session = await startSession(user, req, res);
  audit({ ...req, user: { id: user._id, role: user.role } }, 'auth.login', 'User', user._id);
  res.json({ success: true, ...session });
});

// POST /api/auth/refresh  — rotates the refresh token (cookie, or body.refreshToken for non-browser clients)
exports.refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (!raw) throw new ApiError(401, 'Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(raw);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti });
  if (!stored) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session expired. Please log in again.');
  }
  if (stored.revokedAt) {
    // Reuse of a rotated token => likely stolen. Kill the whole family.
    await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { revokedAt: new Date() });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session invalidated. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') {
    await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { revokedAt: new Date() });
    clearRefreshCookie(res);
    throw new ApiError(401, 'Account unavailable');
  }

  stored.revokedAt = new Date();
  await stored.save();
  const session = await startSession(user, req, res, stored.family);
  res.json({ success: true, ...session });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (raw) {
    try {
      const { jti } = verifyRefreshToken(raw);
      const stored = await RefreshToken.findOne({ jti });
      if (stored) {
        await RefreshToken.updateMany({ family: stored.family, revokedAt: null }, { revokedAt: new Date() });
      }
    } catch {
      /* expired/invalid token: nothing to revoke */
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
});

// POST /api/auth/forgot-password — always 200 to avoid revealing which emails exist
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase(), status: 'active' });
  if (user) {
    const token = randomToken(32);
    user.passwordResetTokenHash = sha256(token);
    user.passwordResetExpires = new Date(Date.now() + env.passwordResetExpiresMin * 60 * 1000);
    await user.save();
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      text: `Reset link (valid ${env.passwordResetExpiresMin} min): ${env.clientUrl}/reset-password/${token}`,
    });
  }
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
});

// POST /api/auth/reset-password  { token, password }
exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    passwordResetTokenHash: sha256(req.body.token),
    passwordResetExpires: mongoose.trusted({ $gt: new Date() }),
  }).select('+passwordResetTokenHash +passwordResetExpires');
  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

  await user.setPassword(req.body.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // Sign out everywhere
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  audit({ ...req, user: { id: user._id, role: user.role } }, 'auth.password_reset', 'User', user._id);
  res.json({ success: true, message: 'Password updated. Please log in.' });
});
