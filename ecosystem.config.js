// PM2 process file:  pm2 start ecosystem.config.js && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'digital-rx',
      cwd: './server',
      script: 'src/server.js',
      instances: 1, // keep 1: uploads are on local disk and rate limits are in-memory
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
    },
  ],
};
