import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev: the browser talks only to :5173; /api and /uploads are proxied to the Express server,
// so the refresh-token cookie is same-origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // reachable from other devices on your network (phone testing)
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/uploads': 'http://127.0.0.1:5000',
    },
  },
});
