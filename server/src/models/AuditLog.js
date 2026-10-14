const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for public/pharmacy actions
    actorRole: { type: String, enum: ['admin', 'doctor', 'pharmacy', 'system'], required: true },
    action: { type: String, required: true, index: true }, // e.g. medicine.create, user.disable
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    meta: { type: mongoose.Schema.Types.Mixed }, // small context (changed fields etc.) — never patient PII
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
