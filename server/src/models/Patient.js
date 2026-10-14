const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String, trim: true },
    allergies: { type: String, trim: true },
    chronicConditions: { type: String, trim: true },
  },
  { timestamps: true }
);

patientSchema.index({ doctorId: 1, name: 1 }, { collation: { locale: 'en', strength: 2 } });
patientSchema.index({ doctorId: 1, phone: 1 });

module.exports = mongoose.model('Patient', patientSchema);
