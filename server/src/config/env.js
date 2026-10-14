require('./dns'); // loads .env + applies DNS_SERVERS override

const isProd = process.env.NODE_ENV === 'production';

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}
if (isProd && /change-me/i.test(process.env.JWT_ACCESS_SECRET + process.env.JWT_REFRESH_SECRET)) {
  throw new Error('Refusing to start in production with placeholder JWT secrets');
}

if (isProd && /localhost|127\.0\.0\.1/.test(process.env.CLIENT_URL || 'localhost')) {
  console.warn('WARNING: CLIENT_URL / PUBLIC_APP_URL still point to localhost. Set them to your real https:// domain.');
}

module.exports = {
  isProd,
  // Cookies are "secure" (HTTPS-only) in production. Set COOKIE_SECURE=false ONLY to test a production build over plain http.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  // Serve the built React app (client/dist) from this server when it exists. Set SERVE_CLIENT=false to disable.
  serveClient: process.env.SERVE_CLIENT !== 'false',
  port: Number(process.env.PORT) || 5000,
  // 0.0.0.0 = listen on all network interfaces (reachable from other devices / Docker / cPanel proxy)
  host: process.env.HOST || '0.0.0.0',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7,
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  passwordResetExpiresMin: Number(process.env.PASSWORD_RESET_EXPIRES_MIN) || 30,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 2,
};
