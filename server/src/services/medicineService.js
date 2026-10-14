const Medicine = require('../models/Medicine');

const CI = { locale: 'en', strength: 2 }; // case-insensitive matching, same as the unique index
const clean = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

/** Normalises a raw row/object into the shape stored in Medicine. Blank optional fields are stored as ''. */
function normalizeMedicine(raw) {
  const schedule = clean(raw.schedule).toUpperCase();
  return {
    brandName: clean(raw.brandName),
    genericName: clean(raw.genericName),
    genericNameHindi: clean(raw.genericNameHindi),
    strength: clean(raw.strength),
    form: clean(raw.form),
    manufacturer: clean(raw.manufacturer),
    schedule: ['H', 'H1', 'OTC'].includes(schedule) ? schedule : null,
  };
}

/**
 * Finds a medicine by brand+strength+form+manufacturer (case/space-insensitive) or creates it.
 * Never overwrites an existing record. Shared by: CSV import script, admin bulk import,
 * and auto-save of doctor-entered medicines on prescription issue.
 * Returns { medicine, created }.
 */
async function findOrCreateMedicine(raw, { createdBy, source = 'admin', isVerified = true } = {}) {
  const m = normalizeMedicine(raw);
  if (!m.brandName) throw new Error('brandName is required');

  const key = { brandName: m.brandName, strength: m.strength, form: m.form, manufacturer: m.manufacturer };
  const res = await Medicine.findOneAndUpdate(
    key,
    { $setOnInsert: { ...m, createdBy, source, isVerified, isActive: true } },
    { upsert: true, new: true, collation: CI, includeResultMetadata: true }
  );
  return { medicine: res.value, created: !res.lastErrorObject.updatedExisting };
}

/** Bulk version with a summary; row-level failures are reported, not fatal. */
async function importMedicines(rows, opts) {
  const summary = { total: rows.length, created: 0, existing: 0, failed: [] };
  for (const [i, row] of rows.entries()) {
    try {
      const { created } = await findOrCreateMedicine(row, opts);
      created ? summary.created++ : summary.existing++;
    } catch (e) {
      summary.failed.push({ row: i + 2, brandName: row.brandName, error: e.message }); // +2 = header + 1-based
    }
  }
  return summary;
}

module.exports = { normalizeMedicine, findOrCreateMedicine, importMedicines };
