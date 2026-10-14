// Usage: npm run seed
// Idempotent: creates the admin if missing and upserts a small sample medicine list.
require('../src/config/dns'); // loads .env + DNS override (Atlas SRV fix)
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Medicine = require('../src/models/Medicine');

const MEDICINES = [
  { brandName: 'Dolo 650', genericName: 'Paracetamol', strength: '650 mg', form: 'Tablet', manufacturer: 'Micro Labs', schedule: null },
  { brandName: 'Crocin Advance', genericName: 'Paracetamol', strength: '500 mg', form: 'Tablet', manufacturer: 'GSK', schedule: null },
  { brandName: 'Augmentin 625 Duo', genericName: 'Amoxicillin + Clavulanic Acid', strength: '500 mg + 125 mg', form: 'Tablet', manufacturer: 'GSK', schedule: 'H' },
  { brandName: 'Azithral 500', genericName: 'Azithromycin', strength: '500 mg', form: 'Tablet', manufacturer: 'Alembic', schedule: 'H' },
  { brandName: 'Pan 40', genericName: 'Pantoprazole', strength: '40 mg', form: 'Tablet', manufacturer: 'Alkem', schedule: 'H' },
  { brandName: 'Cetzine', genericName: 'Cetirizine', strength: '10 mg', form: 'Tablet', manufacturer: 'GSK', schedule: 'OTC' },
  { brandName: 'Allegra 120', genericName: 'Fexofenadine', strength: '120 mg', form: 'Tablet', manufacturer: 'Sanofi', schedule: 'H' },
  { brandName: 'Glycomet 500', genericName: 'Metformin', strength: '500 mg', form: 'Tablet', manufacturer: 'USV', schedule: 'H' },
  { brandName: 'Telma 40', genericName: 'Telmisartan', strength: '40 mg', form: 'Tablet', manufacturer: 'Glenmark', schedule: 'H' },
  { brandName: 'Ascoril LS', genericName: 'Ambroxol + Levosalbutamol + Guaifenesin', strength: '100 ml', form: 'Syrup', manufacturer: 'Glenmark', schedule: 'H' },
  { brandName: 'Alprax 0.25', genericName: 'Alprazolam', strength: '0.25 mg', form: 'Tablet', manufacturer: 'Torrent', schedule: 'H1' },
  { brandName: 'Volini Gel', genericName: 'Diclofenac', strength: '1% w/w', form: 'Gel', manufacturer: 'Sun Pharma', schedule: 'OTC' },
];

if (process.env.NODE_ENV === 'production' && (!process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD === 'ChangeMe@12345')) {
  console.error('Set a strong SEED_ADMIN_PASSWORD in .env before seeding in production.');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = new User({
      name: process.env.SEED_ADMIN_NAME || 'Platform Admin',
      email,
      role: 'admin',
      status: 'active',
    });
    await admin.setPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@12345');
    await admin.save();
    console.log(`Created admin: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  let added = 0;
  for (const m of MEDICINES) {
    const res = await Medicine.updateOne(
      { brandName: m.brandName, strength: m.strength, form: m.form, manufacturer: m.manufacturer },
      { $setOnInsert: { ...m, isActive: true, createdBy: admin._id } },
      { upsert: true, collation: { locale: 'en', strength: 2 } }
    );
    if (res.upsertedCount) added++;
  }
  console.log(`Medicines: ${added} added, ${MEDICINES.length - added} already present`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
