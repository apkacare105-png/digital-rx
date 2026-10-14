const mongoose = require('mongoose');

// Supports refresh-token rotation with reuse detection.
// Every login starts a "family"; each refresh revokes the used token and issues a new one in the same family.
// Presenting an already-revoked token means theft/replay -> the entire family is revoked.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
