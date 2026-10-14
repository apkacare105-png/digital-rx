const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const env = require('../config/env');
const { ApiError } = require('../utils/helpers');

const dir = path.resolve(env.uploadDir);
fs.mkdirSync(dir, { recursive: true });

// Extension comes from the validated MIME type, never from the client-supplied filename. SVG is excluded (script risk).
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

module.exports = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) =>
      cb(null, `${req.user.id}-${file.fieldname}-${crypto.randomBytes(8).toString('hex')}${EXT[file.mimetype]}`),
  }),
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'Only PNG, JPG or WEBP images are allowed')),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
});
module.exports.uploadDir = dir;
