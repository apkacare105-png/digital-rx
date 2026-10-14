# Digital Prescription Management System (MERN)

Doctor app (PDF sharing with a QR verify page) + admin panel. Monorepo: `server/` (Express + Mongoose) and `client/` (React + Vite + Tailwind).

- **Deploy to a server:** read `DEPLOY.md` (VPS/PM2/Nginx, cPanel, or Docker). `client/dist` is already built.
- **Full project analysis / how to change things:** `PROJECT_ANALYSIS.md`.

## Build status
- [x] Phase 1: models, auth (JWT + rotating refresh), security, seed
- [x] Phase 2: doctor app (profile, patients, prescriptions, PDF download/share) + QR verify page
- [x] Phase 3: admin panel (doctors, medicines + CSV import, dashboard, audit log)
- [x] Deployment setup (Express serves the React build, Docker, PM2, SMTP email)

## Run locally (development)
Terminal 1 (API):
```
cd server
cp .env.example .env      # set MONGO_URI and the two JWT secrets
npm install
npm run seed              # admin account + 12 sample medicines
npm run import-medicines  # your 141 medicines
npm run dev
```
Terminal 2 (React app, http://localhost:5173, proxies /api and /uploads to :5000):
```
cd client
npm install
npm run dev
```
Admin login: the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `server/.env` at `/login`.

## Useful commands (in `server/`)
- `npm run seed`: create the admin + sample medicines (safe to re-run)
- `npm run import-medicines [file.csv]`: load medicines (safe to re-run)
- `npm run set-admin-password -- email "NewPassword1"`: reset an admin password
