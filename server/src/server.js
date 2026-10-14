const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

(async () => {
  await connectDB();
  app.listen(env.port, env.host, () =>
    console.log(`API listening on http://${env.host}:${env.port} (${env.isProd ? 'prod' : 'dev'})`)
  );
})().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
