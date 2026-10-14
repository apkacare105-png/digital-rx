// Usage: npm run import-medicines [path/to/file.csv]   (default: data/medicines.csv)
// Columns: brandName, genericName, genericNameHindi, strength, form, manufacturer, schedule
// Safe to re-run: existing medicines are skipped, never duplicated or overwritten.
require('../src/config/dns'); // loads .env + DNS override (Atlas SRV fix)
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const User = require('../src/models/User');
const { importMedicines } = require('../src/services/medicineService');

(async () => {
  const file = path.resolve(process.argv[2] || path.join(__dirname, '../data/medicines.csv'));
  const rows = parse(fs.readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true });

  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const summary = await importMedicines(rows, { createdBy: admin?._id, source: 'import', isVerified: true });

  console.log(`File: ${file}`);
  console.log(`Rows: ${summary.total} | created: ${summary.created} | already present: ${summary.existing} | failed: ${summary.failed.length}`);
  summary.failed.forEach((f) => console.log(`  row ${f.row} (${f.brandName}): ${f.error}`));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
