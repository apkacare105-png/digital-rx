const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    genericNameHindi: { type: String, trim: true }, // original Hindi composition text (optional)
    strength: { type: String, trim: true },
    form: { type: String, trim: true }, // tablet, syrup, injection...
    manufacturer: { type: String, trim: true },
    schedule: { type: String, enum: ['H', 'H1', 'OTC', null], default: null },
    isActive: { type: Boolean, default: true, index: true }, // soft delete
    // Doctor-added entries (auto-saved on issue) are unverified until an admin reviews them.
    isVerified: { type: Boolean, default: true, index: true },
    source: { type: String, enum: ['admin', 'import', 'doctor'], default: 'admin' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Prevents duplicate master entries (also makes CSV re-imports idempotent)
medicineSchema.index(
  { brandName: 1, strength: 1, form: 1, manufacturer: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);
// Prefix autocomplete on brand name (case-insensitive)
medicineSchema.index({ brandName: 1 }, { collation: { locale: 'en', strength: 2 } });
medicineSchema.index({ genericName: 1 }, { collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Medicine', medicineSchema);
