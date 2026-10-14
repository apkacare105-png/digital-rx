const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.isApiError = true;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

// Fire-and-forget: audit failures must never break the request
const audit = (req, action, entityType, entityId, meta) => {
  const actor = req.user || {};
  AuditLog.create({
    actorId: actor.id,
    actorRole: actor.role || 'system',
    action,
    entityType,
    entityId,
    meta,
  }).catch((e) => console.error('audit log failed:', e.message));
};

module.exports = { ApiError, asyncHandler, sha256, randomToken, audit };

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});
const paginate = (req, maxLimit = 50) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};
Object.assign(module.exports, { escapeRegex, pick, paginate });
