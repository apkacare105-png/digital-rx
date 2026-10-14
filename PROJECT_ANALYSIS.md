# Digital Prescription Management System — Project Analysis & AI Handover

> **For the AI reading this:** this file is the complete context for an existing project. The owner (Ravi) will give you this file plus, when needed, the project's code, and ask you to answer questions or make changes. Read sections 1–3 first, then use the rest as reference. Section 15 is the original requirements prompt, verbatim.
> Document date: 2026-10-04. Project folder on the owner's PC: `D:\rx-system` (Windows).

---

## 1. How to work with this owner (read first)

- **Owner:** Ravi, a solo MERN developer/founder in India. Comfortable running commands, but wants **simple, step-by-step instructions**.
- **He usually applies changes by hand.** When he asks for a change, tell him **exactly**: the file path, the text to find, and the text to replace or add (a small code block each). Do not just say "update the controller". If he says "tell me more easy way", re-explain the same step with fewer words: *"Open file X. Find this line. Delete it. Type this instead."*
- Give a **complete new file** when a file is new, and a **short patch** when editing an existing one. Offer a re-zipped project only if he asks.
- **Remind him of `npm install`** (in `server` and/or `client`) whenever a change adds a package. Past errors came from forgetting this (`Cannot find module 'dotenv'`, `'vite' is not recognized`).
- **Build incrementally.** After each major piece, summarise what was built and what is left. Do not generate the whole app in one pass.
- **Ask a question only when genuinely ambiguous**; otherwise make a reasonable assumption and state it.
- **Be honest about testing.** The code was built in a sandbox with no MongoDB, so the full flow (register → issue → share → pharmacy) has **not** been run end to end. See section 11.
- Keep answers plain and short. No heavy jargon.
- **Owner's environment:** Windows, Node.js 22, nodemon, Vite. His ISP (Jio) breaks MongoDB Atlas `mongodb+srv://` DNS lookups; the fix (Google DNS forced at boot) is already built in (section 9). He previously used the same fix plus `0.0.0.0` binding in his other project, CareerPilot.

---

## 2. What the product is

Doctors create digital prescriptions for patients, adding medicines by brand name, saving them permanently, and sharing them with a pharmacy via a WhatsApp click-to-chat link. The pharmacy opens a secure, expiring link (no login), views the prescription, prints it, and can mark it dispensed. An admin manages doctors and the master medicine list.

**Roles:** `admin` (manages doctors + medicines, never creates prescriptions), `doctor` (own profile, patients, prescriptions), **pharmacy** (no login, token link to one prescription).

**Non-goals (this phase):** no payments, no native mobile app (responsive web only), no WhatsApp Business API (only `wa.me` links).

---

## 3. Current status at a glance

| Phase | Scope | Status |
|---|---|---|
| 1 | Models, auth (JWT access + rotating refresh), security middleware, seed | **Built** |
| Medicine data | 141 medicines imported from owner's Hindi list, import script | **Built** |
| 2 | Doctor profile, patients, medicine search, prescriptions, share/WhatsApp, pharmacy view, React doctor app | **Built** (never run against a real DB — verify) |
| Config | `HOST=0.0.0.0`, `DNS_SERVERS` Google DNS fix | **Built** |
| 3 | Admin API + admin panel (doctors, medicines, CSV bulk import, dashboard, audit log view) | **Built** (never run against a real DB — verify) |
| Deployment | Express serves prebuilt `client/dist`; Dockerfile, docker-compose, PM2 file, `DEPLOY.md`, real SMTP email, `set-admin-password` script | **Built** (see section 17) |

All planned phases are built. Next: first real run + fixing whatever it surfaces, then optional extras (OTP login, S3 uploads, tests).

---

## 4. Tech stack

- **Frontend:** React 18 (functional components, hooks), React Router v6, Axios, Tailwind CSS v4 (via `@tailwindcss/vite`), Vite 5. Plain JavaScript (no TypeScript).
- **Backend:** Node 18+ (owner runs 22), Express 4, REST API, CommonJS modules.
- **Database:** MongoDB with Mongoose 8 (`sanitizeFilter` enabled globally).
- **Auth:** JWT access token (15 min) + refresh token rotation (httpOnly cookie), `bcryptjs` for hashing.
- **Other libs:** `express-validator`, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `morgan`, `multer` (uploads), `csv-parse`, `dotenv`.
- **Sharing:** `wa.me` click-to-chat link with a secure expiring token.

---

## 5. Folder structure

```
rx-system/
├─ README.md                      run instructions + build status
├─ PROJECT_ANALYSIS.md            this file
├─ server/
│  ├─ package.json                scripts: dev, start, seed, import-medicines
│  ├─ .env.example                copy to .env (never commit .env)
│  ├─ .env.production.example     template for the production server's .env
│  ├─ data/medicines.csv          141 medicines (owner's list, converted)
│  ├─ seeds/seed.js               creates admin + 12 sample medicines (idempotent)
│  ├─ scripts/import-medicines.js loads data/medicines.csv (or a given file)
│  ├─ scripts/set-admin-password.js  reset an admin's password from the command line
│  ├─ uploads/                    logo/signature images (served at /uploads)
│  └─ src/
│     ├─ server.js                connectDB then app.listen(port, host)
│     ├─ app.js                   middleware order + route mounting
│     ├─ config/   env.js (all env vars), db.js, dns.js (loads .env + DNS override)
│     ├─ models/   User, Medicine, Patient, Prescription, ShareLink, AuditLog, RefreshToken
│     ├─ middleware/ auth.js (authenticate, requireRole/Admin/Doctor),
│     │              common.js (validate, sanitizeInput, rate limiters, notFound, errorHandler),
│     │              upload.js (multer)
│     ├─ controllers/ auth, doctor, patient, medicine, prescription, rx, admin
│     ├─ routes/      auth, doctor, patient, medicine, prescription, rx, admin
│     ├─ services/medicineService.js   normalize / findOrCreate / bulk import
│     └─ utils/ helpers.js (ApiError, asyncHandler, sha256, randomToken, audit,
│                           escapeRegex, pick, paginate), tokens.js, mailer.js (nodemailer/SMTP)
└─ client/
   ├─ package.json, vite.config.js (proxy /api and /uploads to :5000), index.html
   └─ src/
      ├─ main.jsx, App.jsx (all routes), index.css (Tailwind + print CSS)
      ├─ api/client.js            axios instance, in-memory token, single-flight refresh
      ├─ context/AuthContext.jsx  user state, login/logout, bootstrap via refresh
      ├─ components/ Layout, AdminLayout, ProtectedRoute, MedicineAutocomplete, PatientForm,
      │              PrescriptionSheet (print layout, shared), Modal, Pagination, ui.jsx (Button, Field, Card…)
      └─ pages/ Login, Register, PasswordPages (forgot/reset), AuthShell, Profile,
               Patients, PatientDetail, PrescriptionList, PrescriptionBuilder,
               PrescriptionView, PharmacyView, admin/ (AdminDashboard, AdminDoctors,
               AdminMedicines, AdminAudit)

Project root also has: package.json (install:all/build/start), Dockerfile, docker-compose.yml,
.dockerignore, .gitignore, ecosystem.config.js (PM2), DEPLOY.md, client/dist (prebuilt React app).
```

---

## 6. Data models (Mongoose)

Deviations from the original spec are marked **(added)** or **(changed)**.

**User** — `name, email (unique, lowercase), phone (unique when present), passwordHash (select:false), role: admin|doctor, clinicName, registrationNo, qualification, clinicAddress, clinicPhone, logoUrl, signatureUrl, status, passwordResetTokenHash/Expires (select:false), timestamps`.
- `status`: `pending | active | disabled`. **Doctor approval was removed (Oct 2026):** new doctors are `active` immediately; any old `pending` doctor is auto-activated at login. `pending` stays in the enum only for old data.
- Methods: `setPassword(plain)`, `verifyPassword(plain)`. `toJSON` strips secrets.

**Medicine** — `brandName, genericName, genericNameHindi (added), strength, form, manufacturer, schedule: H|H1|OTC|null, isActive (soft delete), isVerified (added), source: admin|import|doctor (added), createdBy, timestamps`.
- Unique index on `brandName+strength+form+manufacturer` with case-insensitive collation (en, strength 2). Blank optional fields are stored as `''` (not missing) so the unique key matches consistently.
- `isVerified=false` + `source='doctor'` marks medicines auto-added by doctors.

**Patient** — `doctorId (ref User), name, age, gender: male|female|other, phone, allergies, chronicConditions, timestamps`. Always scoped by `doctorId`.

**Prescription** — `rxNo (unique, format RX-YYMMDD-XXXXXX), doctorId, patientId, diagnosis, advice, status: draft|issued|dispensed|cancelled, issuedAt, items[]`.
- `items[]`: `{ medicineId (nullable = custom), brandName (snapshot), genericName (added), strength, dose, duration, timing }` — snapshot so past prescriptions survive master-list edits/removals.

**ShareLink** — `prescriptionId, tokenHash, pharmacyName, pharmacyPhone, expiresAt, revokedAt, openedCount, lastOpenedAt, dispensedAt`.
- **(changed)** stores `tokenHash` (SHA-256), **not** the raw `token`. The raw token exists only inside the link that was sent. TTL index deletes documents 30 days after `expiresAt`.

**AuditLog** — `actorId, actorRole: admin|doctor|pharmacy|system, action, entityType, entityId, meta, timestamp`. Written by `audit(req, action, entityType, entityId, meta)` (fire-and-forget; never breaks a request).
- Actions logged so far: `auth.register`, `auth.login`, `auth.password_reset`, `prescription.create_draft`, `prescription.issue`, `prescription.cancel`, `prescription.share`, `prescription.dispense` (actorRole `pharmacy`).

**RefreshToken (added)** — `userId, jti (unique), family, expiresAt (TTL), revokedAt, userAgent, ip`. Supports rotation with reuse detection.

---

## 7. API reference (all under `/api`)

Auth column: **public**, **any** (logged-in), **doctor**, **admin**. Responses are JSON `{ success, ... }`; errors are `{ success:false, message, details? }`.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | public | health check |
| `POST /auth/register` | public | doctor signup. Returns 202 (pending) or 201 + tokens |
| `POST /auth/login` | public | body `{identifier (email or phone), password}` |
| `POST /auth/refresh` | cookie | rotates refresh token, returns new access token |
| `POST /auth/logout` | cookie | revokes the token family |
| `GET /auth/me` | any | current user |
| `POST /auth/forgot-password` | public | always 200 (no email enumeration); link is logged to console unless SMTP wired |
| `POST /auth/reset-password` | public | `{token, password}`; revokes all sessions |
| `GET/PUT /doctors/me` | doctor | profile |
| `POST /doctors/me/logo`, `/me/signature` | doctor | multipart (`logo` / `signature` field), PNG/JPG/WEBP ≤ 2 MB |
| `GET /patients?q=&page=&limit=` | doctor | list/search own patients |
| `POST /patients`, `GET/PUT/DELETE /patients/:id` | doctor | CRUD; GET includes prescription history; DELETE blocked (409) if prescriptions exist |
| `GET /medicines?q=&limit=` | any | autocomplete (q ≥ 2 chars; brand/generic contains; active only; prefix matches first) |
| `GET /prescriptions?status=&patientId=&q=&page=` | doctor | list own |
| `POST /prescriptions` | doctor | create; `status:'issued'` issues immediately |
| `GET/PUT/DELETE /prescriptions/:id` | doctor | PUT = drafts only (409 if issued); DELETE = drafts only |
| `POST /prescriptions/:id/cancel` | doctor | issued → cancelled; revokes share links |
| `POST /prescriptions/:id/share` | doctor | body `{pharmacyName?, pharmacyPhone?, hours? 48–72}` → `{url, whatsappUrl, expiresAt}` |
| `GET /prescriptions/:id/shares` | doctor | share history (no tokens) |
| `GET /rx/:token` | public (rate-limited) | pharmacy view; increments openedCount |
| `POST /rx/:token/dispense` | public (rate-limited) | marks dispensed (idempotent) |
| `GET /admin/users?q=&status=&page=` | admin | list doctors (search name/email/clinic/phone; status filter) |
| `POST /admin/users` | admin | add a doctor (active immediately) |
| `PUT /admin/users/:id` | admin | edit details; `status` approve/disable/enable; optional `password` reset (signs them out) |
| `DELETE /admin/users/:id` | admin | soft delete → `status:'disabled'` + sessions revoked; prescriptions kept. Only affects role `doctor` |
| `GET /admin/medicines?q=&active=true\|false\|all&verified=&source=&page=` | admin | master list (default active only); `verified=false` = doctor-added to review |
| `POST /admin/medicines` | admin | add; 409 if exists and active; restores if it was removed |
| `PUT /admin/medicines/:id` | admin | edit (saving marks it verified unless `isVerified` given); `isActive:true` restores |
| `POST /admin/medicines/:id/approve` | admin | mark verified as-is |
| `DELETE /admin/medicines/:id` | admin | soft delete (`isActive:false`) |
| `POST /admin/medicines/bulk-import` | admin | multipart field `file` (.csv ≤ 2 MB, ≤ 5000 rows); friendly header aliases; returns `{total, created, existing, failed[]}` |
| `GET /admin/dashboard` | admin | doctor counts by status, prescriptions issued/dispensed, medicine counts, top 10 prescribed |
| `GET /admin/audit?actorRole=admin\|doctor\|pharmacy\|all&action=&page=` | admin | audit log, newest first (default: admin actions only) |

Prescription detail responses use the shape `{ prescription, patient, doctor }`, the same shape the pharmacy view returns, so the same React component renders both.

---

## 8. Key flows

**Auth & sessions.** Access token (15 min) is kept **in memory only** on the client. Refresh token is an httpOnly cookie scoped to path `/api/auth`. On app load the client calls `/auth/refresh`. Each refresh **rotates** the token; presenting an already-used token revokes the whole family (theft detection). `api/client.js` uses a **single-flight** refresh (one shared promise) — necessary because React StrictMode double-mounts and parallel 401s would otherwise trigger "reuse" and log the user out. `authenticate` middleware re-checks the user's `status` from the DB on every request, so disabling a doctor takes effect immediately.

**Prescription lifecycle.** `draft` (editable) → `issued` (locked) → `dispensed` (set by pharmacy) or `cancelled` (doctor, only from issued). Issued prescriptions cannot be edited; to change, cancel and write a new one. Only drafts can be deleted.

**Auto-save of doctor-entered medicines (decided with owner).** In the builder, if no autocomplete match is picked, the typed text is a custom entry (`medicineId: null`, shown with a "custom" tag). **On issue only** (not on draft), the server calls `findOrCreateMedicine` for each custom item (match by brand + strength + form '' + manufacturer '', case/space-insensitive). If found, it links the existing medicine; if not, it creates one with `source:'doctor'`, `isVerified:false`, `createdBy: doctorId`, and links it. **Decision: visible to all doctors immediately.** Autocomplete shows a small "new" badge for unverified ones. Admin review of these is a Phase 3 item.

**Sharing.** Doctor creates a link: token = 24 random bytes base64url (192 bits); only SHA-256 is stored; expiry 48 or 72 h. Server builds `wa.me/<digits>?text=<encoded>`. Message contains only: Rx number, doctor name/clinic, the link, and a valid-till time. **No patient data in URL or text.** A bare 10-digit number gets `WHATSAPP_DEFAULT_COUNTRY_CODE` (91) prefixed. The UI shows "Open WhatsApp" and "Copy link" buttons (not auto `window.open`, to avoid pop-up blockers).

**Pharmacy view (`/rx/:token`).** Validates token format, hash lookup, not revoked, not expired, prescription is issued/dispensed. **Every failure returns the same HTTP 410 and message** (so tokens can't be probed); the page shows a friendly "Link unavailable" screen, never raw errors. Returns patient name/age/gender/allergies (no phone), doctor/clinic details, items. `Cache-Control: no-store`. Print button; "Mark as dispensed" (confirm) sets prescription `dispensed` and link `dispensedAt`.

**Medicine import.** `server/data/medicines.csv` columns: `brandName, genericName, genericNameHindi, strength, form, manufacturer, schedule`. `npm run import-medicines [file]` upserts via `importMedicines()` (never overwrites existing, never duplicates; safe to re-run; reports failed rows). The same function is meant to power the Phase 3 admin CSV upload.
- How the 141 rows were made from the owner's Word list (145 rows, Hindi): asterisks stripped; 4 rows skipped (NEUROKIND FORTE-2, PLAMEP, PLAMEP 25 MG, SOMI — composition unconfirmed); English generic name written by the assistant + original Hindi kept in `genericNameHindi`; "uses" column skipped; strength split out where present; `form` filled only where the brand name says it (SYP, OINT, CAP, TAB, DROPS, GEL, LOZENG, POW, CHEW, DT, MD) — 33 rows; `manufacturer` and `schedule` left blank (not guessed). Brand names kept in the owner's uppercase; autocomplete is case-insensitive. English generics were converted by AI — owner was asked to spot-check.

---

## 9. Configuration (`server/.env`, copy from `.env.example`)

Required: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (server refuses to start without them; in production it refuses placeholder secrets).

| Variable | Default | Meaning |
|---|---|---|
| `NODE_ENV` | development | `production` enables secure cookies, strict rate limits, hides morgan logs |
| `PORT` | 5000 | API port |
| `HOST` | 0.0.0.0 | bind address (0.0.0.0 = all interfaces; 127.0.0.1 = this PC only) |
| `CLIENT_URL` | http://localhost:5173 | CORS origin; also used in password-reset link |
| `PUBLIC_APP_URL` | = CLIENT_URL | base URL inside WhatsApp share links (`/rx/:token`) |
| `MONGO_URI` | mongodb://127.0.0.1:27017/digital_rx | local or Atlas |
| `DNS_SERVERS` | 8.8.8.8,8.8.4.4 | forced at boot to fix Atlas SRV failures on Jio; empty = system DNS. Applied by `config/dns.js` for server, seed, and import script |
| `JWT_ACCESS_EXPIRES` | 15m | |
| `JWT_REFRESH_EXPIRES_DAYS` | 7 | |
| `BCRYPT_ROUNDS` | 12 | |
| `PASSWORD_RESET_EXPIRES_MIN` | 30 | |
| `SHARE_LINK_EXPIRY_HOURS` | 48 | default (UI offers 48/72; server clamps to 48–72) |
| `WHATSAPP_DEFAULT_COUNTRY_CODE` | 91 | |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | uploads / 2 | |
| `SMTP_*`, `MAIL_FROM` | blank | mail not wired; reset link prints to the server console |
| `SEED_ADMIN_NAME/EMAIL/PASSWORD` | Platform Admin / admin@example.com / ChangeMe@12345 | used only by `npm run seed` |

Client: `client/.env.example` has `VITE_API_URL` and `VITE_ASSET_URL`, both empty in dev (Vite proxy handles `/api` and `/uploads`).

---

## 10. How to run (Windows)

1. MongoDB running locally, or an Atlas connection string in `MONGO_URI`.
2. `cd D:\rx-system\server` → copy `.env.example` to `.env`, set the 3 required values (+ `SEED_ADMIN_*`) → `npm install` → `npm run seed` → `npm run import-medicines` → `npm run dev` (expect "MongoDB connected" and "API listening on http://0.0.0.0:5000").
3. New terminal: `cd D:\rx-system\client` → `npm install` → `npm run dev` → open **http://localhost:5173** (use `localhost`, not `127.0.0.1` or `:5000`; the refresh cookie only works through the React app's origin).
4. **Admin login:** the seeded email/password from `.env` at `/login`. Until Phase 3, admin sees only a placeholder page. Seed does **not** change the password of an existing admin.
5. Doctors register and can use the app immediately (no approval step).

**Past errors and fixes:** `Cannot find module 'dotenv'` / `'vite' is not recognized` → run `npm install` in that folder (the zip excludes `node_modules`; re-run after any new zip). Atlas `querySrv` errors → keep `DNS_SERVERS` set.

---

## 11. Verification status & known limitations

**What was verified (in a sandbox without MongoDB):** all server modules load; validation returns clean 422; operator-injection attempt on login rejected; protected routes return 401; `$or` survives `sanitizeFilter`; React app builds; pharmacy page and expired page render correctly with mocked data; DNS override applies.
**Not verified:** anything touching a live database — register/login/refresh rotation, password reset, seed, CSV import, patient/prescription CRUD, auto-save, share links, pharmacy dispense, file upload, and clicking through the doctor screens. First real run may surface bugs; fix as they appear.

**Known limitations / decisions to revisit:**
- Password-reset email is sent via SMTP (nodemailer) when `SMTP_HOST` is set; otherwise it is printed to the server console. Mail failures are logged, never shown to the user. OTP login (in original spec) is **not built**. Doctors have no in-app "change password" screen (they use forgot-password, or an admin sets one in Admin → Doctors → Edit).
- No endpoint to revoke a single share link (cancelling the prescription revokes all).
- Medicine search uses case-insensitive regex (fine for thousands of rows; consider text/prefix index at larger scale).
- Issue flow is not wrapped in a DB transaction (custom medicines may be created even if the final save fails — harmless).
- Logo/signature: old file is deleted on replace; no orphan cleanup otherwise. SVG uploads intentionally blocked.
- No automated tests. No linting config.
- Disabling a doctor blocks their login and API access immediately, but share links they already sent stay valid until they expire (cancel the prescription to revoke them).
- Uploads are stored on local disk and served publicly at `/uploads/<random-name>` (acceptable for logo/signature; move to S3-compatible storage later if deploying to multiple servers).
- **Compliance flag (from the original requirements):** this app stores sensitive health data. India's DPDP Act (or the law of the deployment region) must be reviewed **before production launch**; do not assume compliance.

---

## 12. Phase 3 — Admin panel (BUILT; original spec below)

**Implemented in:** `server/src/controllers/admin.controller.js`, `server/src/routes/admin.routes.js` (mounted at `/api/admin`, guarded by `authenticate` + `requireAdmin`), and `client/src/pages/admin/*` + `components/AdminLayout.jsx`, routed in `App.jsx` under `/admin`, `/admin/doctors`, `/admin/medicines`, `/admin/audit`. The dashboard cards link to the filtered views (`/admin/doctors?status=pending`, `/admin/medicines?tab=unverified`). Admin actions audited: `user.create/update/approve/disable/enable/password_reset`, `medicine.create/update/approve/delete/bulk_import`, each with a small `meta` (name/email/brandName — no patient data). Admin API only touches users with role `doctor`.

**Original spec (kept for reference):**

Build with the existing patterns (`requireAdmin` from `middleware/auth.js`, `validate`, `pick`, `paginate`, `escapeRegex`, `audit`, `ApiError`). Mount in `app.js` where the `// Phase 3` comment is. Replace `AdminPlaceholder` in `client/src/App.jsx` with a real admin layout + routes under `/admin/*` (already wrapped in `<ProtectedRoute role="admin">`).

**Admin API (`/api/admin/*`, all `authenticate` + `requireAdmin`):**
- `GET /users?q=&status=&page=` — list doctors (search name/email/clinic; filter status `pending|active|disabled`).
- `POST /users` — add a doctor (set temp password; status active).
- `PUT /users/:id` — edit details; also approve a pending doctor (status → active).
- `DELETE /users/:id` — **soft delete only**: set `status:'disabled'`, never delete prescriptions; also revoke the doctor's `RefreshToken`s. Guard against disabling yourself / the last admin.
- `GET /medicines?q=&isVerified=&isActive=&page=` — list/search/paginate master list; **"Unverified" filter** to review doctor-added medicines.
- `POST /medicines`, `PUT /medicines/:id` (editing/approving an unverified one should set `isVerified:true`), `DELETE /medicines/:id` (**soft**: `isActive:false`, so past prescriptions stay intact).
- `POST /medicines/bulk-import` — CSV upload (multer memory storage, `csv-parse`) reusing `importMedicines()` from `services/medicineService.js` with `source:'import'`; return the summary (created / existing / failed rows).
- `GET /dashboard` — total doctors (and pending count), total prescriptions issued, most-used medicines (aggregate on `items.medicineId`/`brandName`), unverified-medicine count.
- `GET /audit?actorRole=&action=&page=` — audit log list (newest first). Every admin action must call `audit()` (e.g. `user.create`, `user.approve`, `user.disable`, `medicine.create/update/delete`, `medicine.bulk_import`).

**Admin UI:** dashboard cards, doctors table (search/filter/add/edit/approve/disable), medicines table (search, pagination, unverified filter, add/edit/soft-delete, CSV upload with result summary), audit log table. Mobile-responsive, same Tailwind style (teal accent, `components/ui.jsx`).

**Also pending (from the original deliverables):** nothing else mandatory beyond Phase 3; optional later: real email (nodemailer), OTP login, S3 uploads, tests.

---

## 13. Coding conventions & gotchas for future changes

1. **Scope every doctor query by `doctorId`** (`req.user.id`). A doctor must never read another doctor's patients/prescriptions. Role comes from the verified JWT/DB, never from the request body.
2. **Mass-assignment safe:** use `pick(req.body, [...allowed])`; never spread `req.body` into a model.
3. **Mongoose `sanitizeFilter` is ON — and it also blocks operators YOUR OWN code puts in a filter.** Any `$ne/$in/$gt/...` inside a query *filter* must be wrapped in `mongoose.trusted({ ... })`, e.g. `Medicine.countDocuments({ _id: mongoose.trusted({ $in: ids }) })`; otherwise Mongoose turns it into `$eq: {...}` and throws a CastError (the API then answers "Invalid identifier"). Update documents (`$set`, `$inc`, `$setOnInsert`) and aggregation pipelines are not affected. Fixed once already in: `admin.controller.js` (dashboard count), `auth.controller.js` (reset-password expiry), `prescription.controller.js` (medicine ids check, list search). Top-level `$or` and RegExp values are fine.
   (Original note:) Plain `{ field: { $regex: ... } }` objects get neutralised. Use real `RegExp` objects (`new RegExp(escapeRegex(q), 'i')`) as the existing search code does; for intentional operators use `mongoose.trusted(...)`. Always `escapeRegex` user input.
4. `sanitizeInput` middleware strips keys starting with `$` or containing `.` from body/query/params.
5. **Validation:** add `express-validator` rules in the route file + `validate` middleware; errors come back as 422 with `details`.
6. **Errors:** throw `new ApiError(status, message)` inside `asyncHandler`; `errorHandler` hides 5xx internals. Client reads messages via `errMsg(err)`.
7. **Passwords:** rules live in `passwordRule` in `routes/auth.routes.js` (8–128 chars, one letter, one number).
8. **Never store raw share tokens or patient data in URLs/WhatsApp text.**
9. **Client:** keep the access token in memory (not localStorage). Use the `api` instance from `api/client.js` for all calls. Public pages (`/rx/:token`) use it too (no token needed).
10. **Print layout** is `components/PrescriptionSheet.jsx` + print rules in `index.css` (`.no-print` hides UI; `.print-sheet`). Both doctor and pharmacy views use it.
11. Response envelope: `{ success: true, ...data }`; list endpoints return `{ items, total, page, pages }`.
12. Sensitive-data mindset: log only what's needed; no patient PII in `AuditLog.meta`.

---

## 14. Cookbook — common changes and where to make them

| Want to… | Edit |
|---|---|
| Add a field to Patient (e.g. blood group) | `server/src/models/Patient.js` (schema) → `FIELDS` array in `controllers/patient.controller.js` → validator in `routes/patient.routes.js` → inputs in `client/src/components/PatientForm.jsx` (and display in `PatientDetail.jsx` / `PrescriptionSheet.jsx` if wanted; `SHEET_PATIENT` in `prescription.controller.js` controls which patient fields reach the doctor sheet) |
| Add a field to a prescription item (e.g. quantity) | `itemSchema` in `models/Prescription.js` → `ITEM_FIELDS` in `prescription.controller.js` → validator in `prescription.routes.js` → `newItem()`/inputs in `PrescriptionBuilder.jsx` → column in `PrescriptionSheet.jsx` |
| Change timing suggestions | `TIMINGS` array in `client/src/pages/PrescriptionBuilder.jsx` |
| Change the printed layout/branding | `client/src/components/PrescriptionSheet.jsx` (+ `@media print` in `index.css`) |
| Change WhatsApp message text | `share` function in `server/src/controllers/prescription.controller.js` (`text` variable) |
| Change link expiry options | server clamp (48–72) in `prescription.controller.js` `share`; dropdown in `PrescriptionView.jsx` `SharePanel`; default `SHARE_LINK_EXPIRY_HOURS` |
| Change default country code | `WHATSAPP_DEFAULT_COUNTRY_CODE` in `.env` |
| Change token lifetimes | `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES_DAYS` in `.env` |
| Change rate limits | limiter definitions at the bottom of `middleware/common.js` (`authLimiter`, `publicRxLimiter`, `apiLimiter`) |
| Change theme colour | Tailwind `teal-*` classes (mainly `components/ui.jsx`, `Layout.jsx`, `PrescriptionSheet.jsx`) |
| Add a new doctor page | create `client/src/pages/X.jsx` → add `<Route>` inside the doctor `ProtectedRoute` block in `App.jsx` → add a `NavLink` in `components/Layout.jsx` |
| Add a new API endpoint | controller function (wrapped in `asyncHandler`) → route with validators in the matching `routes/*.routes.js` → router is already mounted in `app.js` (new router files need a `app.use` line) |
| Load more medicines | add rows to a CSV with the same columns → `npm run import-medicines path\to\file.csv` |
| Reset/create admin | edit `SEED_ADMIN_*` in `.env`, `npm run seed` (won't overwrite an existing admin's password; delete that user in MongoDB first to recreate) |
| Wire real email | implement `sendMail` in `server/src/utils/mailer.js` (nodemailer + `SMTP_*`); `forgotPassword` already calls it |
| Deploy | set `NODE_ENV=production`, strong JWT secrets, real `CLIENT_URL`/`PUBLIC_APP_URL` (https), build client (`npm run build`) and serve it behind the same domain as the API (or set `VITE_API_URL`); HTTPS is required for secure cookies |

---

## 15. Original requirements prompt (verbatim)

Project Prompt: Digital Prescription Management System (MERN Stack)
You are a senior full-stack developer. Build a Digital Prescription Management System using the MERN stack (MongoDB, Express.js, React.js, Node.js). The system has two parts: a Doctor App and an Admin Panel. Follow the requirements below exactly. Ask clarifying questions only if something is genuinely ambiguous; otherwise make reasonable assumptions and state them.
1. Overview
Doctors create digital prescriptions for patients, adding medicines by brand name, saving them permanently, and sharing them with a pharmacy via WhatsApp. The pharmacy opens a secure link, views the prescription, and prints it for the patient. An admin manages the platform: users (doctors) and the master medicine list.
2. User Roles

* Admin — manages doctor accounts and the medicine database. Does not create prescriptions.
* Doctor — manages their own profile, patients, and prescriptions.
* Pharmacy (no login) — opens a time-limited, token-based link to view and print one prescription.

3. Tech Stack

* Frontend: React.js (functional components, hooks), React Router, Axios, Tailwind CSS (or Material UI)
* Backend: Node.js, Express.js, REST API
* Database: MongoDB with Mongoose
* Auth: JWT (access + refresh tokens), bcrypt for password hashing
* File storage: clinic logo / signature uploads (local disk or S3-compatible bucket)
* Sharing: WhatsApp click-to-chat (`wa.me`) links carrying a secure, expiring share token

4. Data Models (Mongoose Schemas)
User (doctors, admins)

* name, email, phone, passwordHash, role (`admin` | `doctor`)
* clinicName, registrationNo, qualification, clinicAddress, clinicPhone, logoUrl, signatureUrl
* status (`active` | `disabled`), createdAt

Medicine (master list, admin-managed)

* brandName, genericName, strength, form, manufacturer, schedule (`H`, `H1`, `OTC`, null)
* isActive (boolean, soft delete), createdBy (admin id), createdAt, updatedAt

Patient

* doctorId (ref User), name, age, gender, phone, allergies, chronicConditions, createdAt

Prescription

* rxNo (unique), doctorId, patientId, diagnosis, advice, status (`draft`|`issued`|`dispensed`|`cancelled`), issuedAt
* items: array of { medicineId (ref Medicine, nullable for custom entries), brandName (snapshot), strength, dose, duration, timing }

ShareLink

* prescriptionId, token (random, unique), pharmacyName, pharmacyPhone, expiresAt, openedCount, lastOpenedAt, dispensedAt

AuditLog

* actorId, actorRole, action, entityType, entityId, timestamp

5. Doctor App — Features

1. Auth: register/login (email or phone + password, or OTP), JWT session, forgot password.
2. Profile: set clinic details, upload logo and signature.
3. Patients: create, search (name/phone), edit, view history of past prescriptions.
4. Prescription builder:
   * Search medicines by brand name with autocomplete (debounced API call).
   * Add brand name, strength, dose (e.g. 1-0-1), duration, timing (after food, etc.).
   * Add diagnosis and advice notes.
   * Save as draft or issue (locks the prescription).
5. Permanent storage: every issued prescription is saved in MongoDB, tied to the doctor and patient, retrievable anytime.
6. Share via WhatsApp: generate a `ShareLink` (random token, 48–72 hour expiry), open `wa.me` with prefilled text + link.
7. PDF/print: a print-friendly prescription layout (also used by the pharmacy view).

6. Pharmacy View (public, token-based)

* Route like `/rx/:token`, no login required.
* Validates token and expiry server-side before returning data.
* Shows the prescription read-only with a Print button.
* Marks `dispensed` on request; logs open count and timestamps.
* Expired or invalid tokens show a clear "link expired" message, never raw errors.

7. Admin Panel — Features

1. Admin login (separate role, JWT-protected routes, `role === 'admin'` middleware).
2. User management:
   * List all doctors with search/filter (name, email, status).
   * Add a doctor account (or approve self-registered ones).
   * Edit a doctor's details.
   * Disable/remove a doctor (soft delete preferred — set `status: disabled`, don't hard-delete their prescriptions).
3. Medicine management:
   * List/search/paginate the master medicine list.
   * Add a new medicine (brand, generic, strength, form, manufacturer, schedule).
   * Edit medicine details.
   * Remove a medicine (soft delete via `isActive: false` so past prescriptions referencing it stay intact).
   * Bulk import medicines via CSV upload.
4. Dashboard: basic counts — total doctors, total prescriptions issued, most-used medicines.
5. Audit log view: see admin actions (who added/removed what, and when).

8. API Structure (REST)

```
/api/auth/register, /login, /refresh, /logout
/api/doctors/me (GET/PUT profile)
/api/patients (CRUD, scoped to logged-in doctor)
/api/medicines (GET search, admin-only POST/PUT/DELETE)
/api/prescriptions (CRUD, scoped to logged-in doctor)
/api/prescriptions/:id/share (POST — creates ShareLink)
/api/rx/:token (GET public — pharmacy view, POST /dispense)
/api/admin/users (GET/POST/PUT/DELETE)
/api/admin/medicines (GET/POST/PUT/DELETE, POST /bulk-import)
/api/admin/dashboard (GET stats)

```

9. Security Requirements

* Hash passwords with bcrypt; never store plain text.
* JWT with short-lived access tokens + refresh token rotation.
* Role-based middleware guarding all `/admin/*` and doctor-scoped routes.
* Share tokens: cryptographically random, single-purpose, expire automatically, no patient data embedded in the URL itself.
* Rate-limit auth endpoints and the public `/rx/:token` route.
* Validate and sanitize all inputs (e.g. `express-validator`); prevent NoSQL injection.
* Store only what's needed for patient data; note that this handles sensitive health data, so data protection law (e.g. India's DPDP Act, or the relevant law for the deployment region) should be reviewed before production launch — flag this rather than assuming compliance.

10. Deliverables Expected

* Full folder structure for a MERN monorepo (`/client`, `/server`) or separate repos.
* Mongoose models as listed above.
* Express routes + controllers for every endpoint in section 8.
* React app with: doctor auth pages, patient list, prescription builder, pharmacy public view, and a separate admin panel (could be a protected `/admin` route set within the same React app, or a separate admin frontend).
* `.env.example` listing required environment variables (DB URI, JWT secrets, WhatsApp settings, etc.).
* Seed script to create one admin user and a small sample medicine list for local testing.

11. Non-Goals (for this phase)

* No payment processing.
* No native mobile app — responsive web only.
* No automated WhatsApp Business API integration yet — use `wa.me` click-to-chat links only.

Instruction to the AI implementing this: build this incrementally, starting with the Mongoose models and auth, then the doctor prescription flow, then the admin panel. After each major piece, summarize what was built and what's left, rather than generating the entire app in one pass.

---

## 16. How a future chat should use this file

1. The owner uploads this file (and usually the project zip or the specific files involved) and describes what he wants, e.g. "add blood group to patients", "build Phase 3", "the login shows error X".
2. The AI should find the relevant rows in sections 6–9 and 14, state which files will change, then give **step-by-step manual edits** (section 1 style).
3. If a request touches security, patient data, or the pharmacy link, follow section 13 and keep the behaviours in section 8 intact.
4. If the code in the owner's folder differs from this document, trust the code and say so.

---

## 17. Deployment (built)

- **Single app:** `server/src/app.js` serves `client/dist` (prebuilt, included) plus an SPA fallback for non-API, non-upload, non-file GET requests. `SERVE_CLIENT=false` disables it. In dev the Vite proxy is used instead.
- **Production cookies** are HTTPS-only (`COOKIE_SECURE` defaults to `NODE_ENV==='production'`; set `false` only to test a production build over plain http).
- Helmet's default CSP is used minus `upgrade-insecure-requests`.
- **Files:** `DEPLOY.md` (step-by-step for VPS+PM2+Nginx, cPanel Node app, Docker), `Dockerfile` (multi-stage, builds the client), `docker-compose.yml` (app + mongo:7 + volumes), `ecosystem.config.js` (PM2, 1 instance), `server/.env.production.example`, root `package.json` scripts.
- **Commands:** `npm run seed` (refuses the default admin password in production), `npm run import-medicines`, `npm run set-admin-password -- <email> "<pw>"`.
- **Mail:** `utils/mailer.js` uses nodemailer with `SMTP_*`; without `SMTP_HOST` it prints to the console.
- Run a single instance (local-disk uploads, in-memory rate limits). Back up the database and `server/uploads/`.
- Owner's server stack (from his earlier projects): AlmaLinux 9 + cPanel, self-hosted MongoDB 7. DEPLOY.md Option A (PM2 + Nginx) or B (cPanel Node app) fit that.
- Deployment instructions were written but **not executed on a real server** by the author; expect to adjust paths/permissions.


## 18. Change log

### Oct 2026 — no approval, Note field
- **Doctor approval removed.** `auth.controller.register` always creates an `active` doctor and logs them in; `login` activates any leftover `pending` doctor. `REQUIRE_DOCTOR_APPROVAL` env var deleted. Admin dashboard "Awaiting approval" tile and the Approve button / Pending filter on Admin → Doctors removed.
- **Signup form** is now: name, email, phone (required), password. Clinic name, registration no., qualification, clinic address/phone, logo and signature remain **optional** on the Profile page.
- **New `note` field on Prescription** (free text, max 5000). The builder's Diagnosis and Advice boxes were replaced by one "Note" box. Old `diagnosis` / `advice` stay in the model and still print if an old prescription has them.
- **Print sheet / pharmacy view** now show the doctor's phone and email (added to `SHEET_DOCTOR` and `rx.controller` selects) and the Note.
- Patient list and history are unchanged.

### Oct 2026 — Help and support
- **Login/register/forgot pages:** `AuthShell` has a "Need help?" toggle showing support WhatsApp and email (`client/src/components/SupportContacts.jsx`). The numbers live in `client/src/config/support.js` — edit that file to change them, then rebuild the client.
- **Doctor app:** new "Help" nav link → `/help` (`pages/Help.jsx`): the same contact links plus a **Report a problem** form (type + message, max 2000 chars). It posts to `POST /api/support` (`routes/support.routes.js`, `controllers/support.controller.js`), limited to 5 per hour per doctor. The doctor's name/email/phone and the page they were on are saved automatically.
- **Model:** `models/SupportRequest.js` (`status: open | resolved`, doctor details copied in as a snapshot).
- **Admin:** new **Support** tab (`pages/admin/AdminSupport.jsx`) with `GET /api/admin/support` and `PUT /api/admin/support/:id`; dashboard shows "Open support requests". No replies in the app and no email notification (not built; admin contacts the doctor by phone/email/WhatsApp).

### Oct 2026 — PDF sharing, QR verify page, neumorphic UI
**These changes replace the older "share link" and "pharmacy view" parts of this document (sections on ShareLink, `/api/rx/*`, `/rx/:token`, WhatsApp link, expiry, mark dispensed). Those features were removed.**
- **PDF sharing (browser-made, A4).** On an issued prescription the doctor sees **Download PDF**, **Share**, **Print**. The PDF is generated in the browser by `client/src/utils/pdf.js` (`html2canvas-pro` + `jspdf`, loaded only on click; `html2canvas-pro` is needed because Tailwind v4 uses oklch colours that plain html2canvas cannot read). Long prescriptions are split into pages at table-row boundaries. **Share** uses the phone's share sheet (`navigator.share` with the file) so the doctor can pick WhatsApp, email, etc.; on computers it saves the PDF and shows "Open WhatsApp / Open email" buttons. Nothing about the PDF is stored on the server except an audit entry (`prescription.pdf_download` / `prescription.pdf_share`) via `POST /api/prescriptions/:id/pdf-event`.
- **QR code on the PDF** opens `/verify/:code` (`pages/VerifyView.jsx`), a public, view-only page (`GET /api/verify/:code`, rate-limited, one generic 404 for bad codes, no patient phone). It shows "Genuine prescription issued by Dr X" or a red CANCELLED notice, never expires, and cannot change anything. `Prescription.verifyCode` (192-bit random, unique sparse index) is created when a prescription is issued; older issued prescriptions get one the first time the doctor opens them.
- **Removed:** `ShareLink` model, `/api/rx/*`, `rx.controller`, share/shares endpoints, `PharmacyView`, "mark dispensed", the Dispensed tile, and env vars `SHARE_LINK_EXPIRY_HOURS`, `WHATSAPP_DEFAULT_COUNTRY_CODE`. The `dispensed` status stays in the enum only for old data. Old `/rx/...` links no longer work.
- **Neumorphic UI** for app screens only (doctor app, admin, login): CSS variables and `.neu-raised`, `.neu-raised-sm`, `.neu-inset`, `.neu-press` in `client/src/index.css`; components in `components/ui.jsx`. Main buttons keep a solid teal fill and text stays dark for readability. The prescription sheet, PDF and print stay flat white.
- Privacy note: a sent PDF cannot be revoked. The QR page shows CANCELLED if the doctor cancels the prescription. DPDP Act review still needed before real patients use the app.
