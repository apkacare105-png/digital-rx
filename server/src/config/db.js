const mongoose = require('mongoose');
const { mongoUri } = require('./env');

mongoose.set('strictQuery', true);
// Reject query-operator objects in filters unless explicitly intended (NoSQL injection hardening)
mongoose.set('sanitizeFilter', true);

module.exports = async function connectDB() {
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};
