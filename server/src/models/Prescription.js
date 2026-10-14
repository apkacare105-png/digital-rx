const mongoose = require('mongoose');
const crypto = require('crypto');

const itemSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null }, // null = custom entry
    brandName: { type: String, required: true, trim: true }, // snapshot, survives master-list edits/removal
    genericName: { type: String, trim: true },
    strength: { type: String, trim: true },
    dose: { type: String, trim: true }, // e.g. 1-0-1
    duration: { type: String, trim: true }, // e.g. 5 days
    timing: { type: String, trim: true }, // e.g. after food
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    rxNo: { type: String, required: true, unique: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    note: { type: String, trim: true }, // doctor's free-text note about the issue
    diagnosis: { type: String, trim: true }, // legacy (older prescriptions)
    advice: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'issued', 'dispensed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    issuedAt: Date,
    // Random, unguessable code in the QR on the PDF. Opens a view-only check page (never expires).
    verifyCode: { type: String, index: { unique: true, sparse: true } },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true }
);

prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ 'items.medicineId': 1 }); // dashboard "most used medicines"

// Human-friendly unique number: RX-YYMMDD-XXXXXX (crypto-random suffix; unique index is the final guard)
prescriptionSchema.statics.generateRxNo = function () {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `RX-${ymd}-${suffix}`;
};

module.exports = mongoose.model('Prescription', prescriptionSchema);
