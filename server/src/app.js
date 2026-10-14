const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { sanitizeInput, apiLimiter, notFound, errorHandler } = require('./middleware/common');

const app = express();

app.set('trust proxy', 1); // correct client IPs behind a reverse proxy (needed for rate limiting)
// uploads (logo/signature) are loaded cross-origin by the React app in dev
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // default CSP minus "upgrade-insecure-requests" (it breaks plain-http test runs; real HTTPS sites don't need it)
    contentSecurityPolicy: { directives: { ...helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests': null } },
  })
);
app.use(cors({ origin: env.clientUrl, credentials: true }));
if (!env.isProd) app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.resolve(env.uploadDir), { maxAge: '7d', index: false }));
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/doctors', require('./routes/doctor.routes'));
app.use('/api/patients', require('./routes/patient.routes'));
app.use('/api/medicines', require('./routes/medicine.routes'));
app.use('/api/prescriptions', require('./routes/prescription.routes'));
app.use('/api/verify', require('./routes/verify.routes'));
app.use('/api/support', require('./routes/support.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Production: serve the built React app from the same server/domain (cookies stay same-origin, no CORS needed)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (env.serveClient && fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  // SPA fallback: any non-API, non-upload, non-file GET returns index.html (React Router handles the path)
  app.get(/^\/(?!api\/|uploads\/)(?!.*\.[a-zA-Z0-9]+$).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
