const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: cfg, isProd, cookieSecure } = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const REFRESH_COOKIE = 'refreshToken';

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, cfg.accessSecret, {
    subject: String(user._id),
    expiresIn: cfg.accessExpires,
  });

/** Creates + persists a refresh token. Pass `family` to continue an existing rotation chain. */
async function createRefreshToken(user, req, family = crypto.randomUUID()) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + cfg.refreshExpiresDays * 24 * 60 * 60 * 1000);
  const token = jwt.sign({ fam: family }, cfg.refreshSecret, {
    subject: String(user._id),
    jwtid: jti,
    expiresIn: `${cfg.refreshExpiresDays}d`,
  });
  await RefreshToken.create({
    userId: user._id,
    jti,
    family,
    expiresAt,
    userAgent: (req.get('user-agent') || '').slice(0, 200),
    ip: req.ip,
  });
  return { token, jti, family, expiresAt };
}

const setRefreshCookie = (res, token, expiresAt) =>
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    expires: expiresAt,
  });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });

const verifyAccessToken = (t) => jwt.verify(t, cfg.accessSecret);
const verifyRefreshToken = (t) => jwt.verify(t, cfg.refreshSecret);

module.exports = {
  REFRESH_COOKIE,
  signAccessToken,
  createRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  verifyAccessToken,
  verifyRefreshToken,
};
