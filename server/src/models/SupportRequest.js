const mongoose = require('mongoose');

// A problem reported by a doctor from inside the app. The doctor's contact details are copied in
// (snapshot) so the admin can reach them even if the account changes later.
const supportRequestSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorName: { type: String, trim: true },
    doctorEmail: { type: String, trim: true },
    doctorPhone: { type: String, trim: true },
    type: {
      type: String,
      enum: ['login', 'prescription', 'medicine', 'whatsapp', 'other'],
      default: 'other',
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    page: { type: String, trim: true, maxlength: 200 }, // page the doctor was on (path only)
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    resolvedAt: Date,
  },
  { timestamps: true }
);

supportRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
