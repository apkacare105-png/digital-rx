const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { bcryptRounds } = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'doctor'], default: 'doctor', index: true },

    clinicName: { type: String, trim: true },
    registrationNo: { type: String, trim: true },
    qualification: { type: String, trim: true },
    clinicAddress: { type: String, trim: true },
    clinicPhone: { type: String, trim: true },
    logoUrl: String,
    signatureUrl: String,

    // 'pending' is an extension to the spec: supports "approve self-registered doctors".
    status: { type: String, enum: ['pending', 'active', 'disabled'], default: 'active', index: true },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Unique phone only when present (sparse can't ignore empty strings, so use a partial index)
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);
userSchema.index({ name: 'text', email: 'text', clinicName: 'text' });

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, bcryptRounds);
};
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
