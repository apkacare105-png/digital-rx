# Deploying Digital Rx

Digital Rx deploys as **one Node.js app on one domain**. The Express server runs the API **and** serves the already-built React app (`client/dist`, included in this zip). Cookies stay same-origin, so there is no CORS setup.

Pick ONE of the three options below (A is the usual choice for your AlmaLinux server).

## 0. Before you start (all options)

- [ ] A domain or sub-domain, e.g. `rx.yourdomain.com`, pointing to your server, **with HTTPS** (required: login cookies are HTTPS-only in production).
- [ ] MongoDB 7 reachable from the app (self-hosted on the same server, or Atlas).
- [ ] Node.js 18 or newer on the server (22 recommended). Not needed for Docker.
- [ ] An email account for "forgot password" (any SMTP: cPanel mail, Gmail app password, Brevo, SES).
- [ ] Two random secrets. Make them with:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Run it twice: one for `JWT_ACCESS_SECRET`, one for `JWT_REFRESH_SECRET`.

### The settings file
Copy `server/.env.production.example` to `server/.env` and fill in **every** value. The important ones:

| Setting | What to put |
|---|---|
| `CLIENT_URL` and `PUBLIC_APP_URL` | your real address, `https://rx.yourdomain.com` (the QR code on the PDF uses the address the doctor has open in the browser) |
| `MONGO_URI` | your database connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | the two random secrets |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | your admin login (strong password; the seed refuses the default in production) |
| `SMTP_*`, `MAIL_FROM` | your email account |

---

## Option A — VPS / AlmaLinux with PM2 + Nginx (recommended)

1. **Upload and unzip** the project, e.g. to `/var/www/rx-system`.
2. **Install packages** (the zip has no `node_modules`):
   ```
   cd /var/www/rx-system/server
   npm install --omit=dev
   ```
   You do **not** need to install or build the client: `client/dist` is already built. (If you change the client later: `cd client && npm install && npm run build`.)
3. **Create `server/.env`** (see above).
4. **Create the admin and load the medicines** (once):
   ```
   npm run seed
   npm run import-medicines
   ```
5. **Start with PM2:**
   ```
   npm install -g pm2
   cd /var/www/rx-system
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup        # run the command it prints, so the app restarts after a reboot
   ```
   Check: `curl http://127.0.0.1:5000/api/health` → `{"success":true,"status":"ok"}`.
6. **Nginx** in front, with HTTPS. Example site config:
   ```nginx
   server {
       server_name rx.yourdomain.com;
       client_max_body_size 5m;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Then get a free certificate: `certbot --nginx -d rx.yourdomain.com`.
7. **Firewall:** open 80/443 only. Keep port 5000 and MongoDB's 27017 closed to the internet.

## Option B — cPanel "Setup Node.js App"

1. Upload the whole project (e.g. to `/home/USER/rx-system`).
2. cPanel → **Setup Node.js App** → Create Application: Node 18+ (or newer), mode **Production**, application root `rx-system/server`, application URL = your domain, startup file `src/server.js`.
3. Add the settings from `.env.production.example` as environment variables in that screen (or put a `.env` file in `rx-system/server`).
4. Click **Run NPM Install**, then **Restart**.
5. Run the one-time seed in the cPanel Terminal (activate the Node virtual environment shown on that page first):
   ```
   cd ~/rx-system/server && npm run seed && npm run import-medicines
   ```
6. MongoDB is not part of cPanel: use Atlas, or your own MongoDB 7 install (bind to `127.0.0.1`, turn authentication on, and use a URI with the username and password).
7. Turn on HTTPS for the domain (AutoSSL).

## Option C — Docker (VPS or any machine with Docker)

1. Unzip, then copy `server/.env.production.example` to `server/.env` and fill it in. (`MONGO_URI` is set for you by `docker-compose.yml`.)
2. Start:
   ```
   docker compose up -d --build
   ```
3. First run only:
   ```
   docker compose exec app node seeds/seed.js
   docker compose exec app node scripts/import-medicines.js
   ```
4. The app listens on port 5000. Put Nginx (or Caddy / Traefik) with HTTPS in front, as in Option A step 6.
5. To try it on your own PC over plain `http://localhost:5000`, uncomment `COOKIE_SECURE: "false"` in `docker-compose.yml`. **Remove it for real deployments.**
6. Data lives in Docker volumes `mongo_data` (database) and `uploads` (logos/signatures). Back both up.

---

## After the first deploy

1. Open `https://rx.yourdomain.com/login` and sign in as admin.
2. **Test the whole flow once:** register a doctor from a private window (no approval needed; they can use the app right away) → fill the Profile → add a patient → write and **issue** a prescription → **Download PDF** and **Share** → scan the QR code on the PDF (it opens the view-only check page) → print. Then check **Admin → Dashboard** and **Audit log**.
3. **Change the admin password any time:**
   ```
   cd server
   npm run set-admin-password -- admin@yourdomain.com "NewStrongPassword1"
   ```
4. **Doctor forgot their password?** Either they use "Forgot password" (needs the SMTP settings), or you open **Admin → Doctors → Edit** and set a new password for them.

## Updating later
Upload the new files over the old ones (keep `server/.env` and `server/uploads/`), run `npm install --omit=dev` in `server`, then `pm2 restart digital-rx` (or restart the app in cPanel, or `docker compose up -d --build`).

## Backups (do this)
- Database: `mongodump --uri "<MONGO_URI>" --out /backups/rx-$(date +%F)` on a daily cron.
- Files: back up `server/uploads/` and `server/.env`.

## Production checklist
- [ ] HTTPS works and `CLIENT_URL` / `PUBLIC_APP_URL` use `https://`
- [ ] `JWT_*` secrets are long random values, different from each other
- [ ] Admin password changed from the default
- [ ] SMTP tested ("Forgot password" email arrives)
- [ ] MongoDB not exposed to the internet, authentication on
- [ ] Daily backups running
- [ ] **Legal review done:** this app stores patient health data. Review India's DPDP Act (or the law where you operate) *before* real patients use it: consent, privacy notice, data retention, breach process, and where the data is hosted. This guide does not make the app compliant by itself.

## Limits to know about
- Run **one** app instance (PM2 `instances: 1`). Uploads are on local disk and rate limits are in memory. Scaling to several servers needs shared storage (S3) and a shared rate-limit store.
- OTP login (in the original spec) is not built.
- No automated tests are included.

## Troubleshooting
| Problem | Fix |
|---|---|
| App won't start: "Missing required env vars" | `server/.env` is missing or incomplete |
| "Refusing to start in production with placeholder JWT secrets" | replace the `change-me` secrets |
| Logged out immediately / can't stay signed in | the site is not on HTTPS, or `CLIENT_URL` doesn't match the address in the browser |
| Atlas `querySrv` errors | set `DNS_SERVERS=8.8.8.8,8.8.4.4` |
| Blank page or 404 on `/` | `client/dist` is missing: run `npm --prefix client install && npm --prefix client run build` |
| QR code opens `localhost` | The doctor opened the app from the local address; open it from the real https:// address and download the PDF again |
| Logo upload fails | `server/uploads` isn't writable by the app user, or file > 2 MB / not PNG/JPG/WEBP |
