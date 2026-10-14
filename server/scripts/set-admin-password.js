// Usage: npm run set-admin-password -- admin@example.com "NewStrongPassword1"
// Resets an admin's password (and signs them out everywhere). Use after first deploy or if you forget it.
require('../src/config/dns');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');

(async () => {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run set-admin-password -- <email> "<new password>"');
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error('Password must be at least 8 characters with a letter and a number.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
  if (!admin) {
    console.error(`No admin found with email ${email}. (Run "npm run seed" to create one.)`);
    process.exit(1);
  }
  await admin.setPassword(password);
  await admin.save();
  await RefreshToken.updateMany({ userId: admin._id, revokedAt: null }, { revokedAt: new Date() });
  console.log(`Password updated for ${admin.email}. Existing sessions were signed out.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
