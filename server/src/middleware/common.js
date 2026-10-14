const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/helpers');
const { isProd } = require('../config/env');

/** Run after express-validator chains: converts failures into a clean 422. */
const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(422, 'Validation failed', details));
};

/**
 * NoSQL-injection guard: strips keys beginning with "$" or containing "." from body/query/params.
 * (Mongoose `sanitizeFilter` is also enabled globally as a second layer.)
 */
const stripOperators = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      stripOperators(obj[key]);
    }
  }
  return obj;
};
const sanitizeInput = (req, _res, next) => {
  stripOperators(req.body);
  stripOperators(req.query);
  stripOperators(req.params);
  next();
};

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max: isProd ? max : max * 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// Brute-force protection on login/register/forgot/reset
const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many attempts. Please try again later.');
// Public pharmacy route: also limits token-guessing
const publicRxLimiter = limiter(15 * 60 * 1000, 60, 'Too many requests. Please try again later.');
const apiLimiter = limiter(60 * 1000, 300, 'Too many requests. Please slow down.');

const notFound = (_req, _res, next) => next(new ApiError(404, 'Route not found'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') status = 422; // mongoose
  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Invalid upload';
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyPattern || {}).join(', ') || 'field'}`;
  }
  if (status >= 500) {
    console.error(err);
    message = 'Something went wrong. Please try again.'; // never leak internals
  }
  res.status(status).json({ success: false, message, details: err.details });
};

module.exports = { validate, sanitizeInput, authLimiter, publicRxLimiter, apiLimiter, notFound, errorHandler };
