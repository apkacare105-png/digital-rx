const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { verifyAccessToken } = require('../utils/tokens');

/** Requires a valid access token. Re-checks the user's status on every request so disabling takes effect immediately. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub).select('role status');
  if (!user || user.status !== 'active') throw new ApiError(401, 'Account unavailable');

  req.user = { id: String(user._id), role: user.role };
  next();
});

const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };

module.exports = {
  authenticate,
  requireRole,
  requireAdmin: requireRole('admin'),
  requireDoctor: requireRole('doctor'),
};
