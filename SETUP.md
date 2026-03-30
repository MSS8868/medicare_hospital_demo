# 🏥 MediCare Hospital Management System — Production Ready

## Quick Start

```bash
# Terminal 1 — Backend
cd hospital-v4/backend
npm install
npm run seed          # creates fresh DB + 17 doctors
npm run dev           # http://localhost:5000

# Terminal 2 — Frontend
cd hospital-v4/frontend
npm install
npm start             # http://localhost:3000
```

> ⚠️ **Always delete old database before re-seeding:**
> ```bash
> rm -f hospital-v4/backend/hospital.db && npm run seed
> ```

---

## Login Credentials

| Role | Mobile | Password / OTP |
|------|--------|----------------|
| **Admin** | 9999999999 | Admin@123 |
| **Receptionist** | 9888888888 | Recep@123 |
| **Dr. Sunil N** (Ortho) | 9800000001 | Doctor@123 |
| **Dr. Dilip Raj** (Medicine) | 9800000002 | Doctor@123 |
| **Dr. Sumanjita Bora** (Cardio) | 9800000003 | Doctor@123 |
| **Dr. Preeti Kathail** (Medicine) | 9800000004 | Doctor@123 |
| **Dr. Hayesh V** (Emergency) | 9800000005 | Doctor@123 |
| **Dr. Lavanya K** (Diabetology) | 9800000006 | Doctor@123 |
| **Dr. Shivakumar** (Paeds) | 9800000007 | Doctor@123 |
| **Dr. Sumera Janvekar** (Paeds) | 9800000008 | Doctor@123 |
| **Dr. Dhanalakshmi** (Radiology) | 9800000009 | Doctor@123 |
| **Dr. Akshay Deshpande** (Gastro) | 9800000010 | Doctor@123 |
| **Dr. Chaitra Gowda** (Gynae) | 9800000011 | Doctor@123 |
| **Dr. Chaitra B G** (ENT) | 9800000012 | Doctor@123 |
| **Dr. Kamalika** (Physio) | 9800000013 | Doctor@123 |
| **Dr. Rachana Shetty** (Ayurveda) | 9800000014 | Doctor@123 |
| **Dr. Muthulakshmi** (Homeo) | 9800000015 | Doctor@123 |
| **Dr. Felix Raju** (Dental) | 9800000016 | Doctor@123 |
| **Mrs. Kanchana** (Nutrition) | 9800000017 | Doctor@123 |
| **Patient (sample)** | 9700000001 | OTP: **123456** |
| **New patient** | Any 10 digits | OTP: **123456** |

---

## What Was Fixed

### Bug 1: Doctor names blank
**Cause:** Old `hospital.db` had corrupted schema from Sequelize `alter:true` on SQLite ENUM columns.
**Fix:** All models use plain `STRING` instead of `ENUM`. Server uses `force:false, alter:false`. Seed always uses `force:true` for clean schema.

### Bug 2: Doctor queue 500 error
**Cause:** `getTodayQueue` failed when doctor's DB record not found; `referred/admitted` statuses excluded.
**Fix:** Proper error when doctor not found; queue includes all active statuses.

### Bug 3: AI process 500 error
**Cause:** Express matched `POST /consultations/ai/process` as `POST /consultations/:appointmentId`.
**Fix:** All static routes strictly before parameterized `/:id` routes.

### Bug 4: OTP failing in production
**Cause:** No Twilio configured, no fallback, app crashes.
**Fix:** Smart fallback — tries Twilio if configured, falls back to demo mode silently. Never crashes. OTP shown in Railway logs and API response.

### Bug 5: Mobile layout broken
**Cause:** Fixed sidebar width, hardcoded pixel widths, wrong viewport meta tag.
**Fix:** Sidebar is off-canvas on all screens, slides in. All grids are 1-column mobile → multi-column desktop. Touch targets are min 44px. Modals slide up from bottom on mobile.

---

## Environment Variables

### Backend (backend/.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=change_this_in_production_to_random_32_chars
JWT_EXPIRES_IN=7d
DB_STORAGE=./hospital.db

# OTP Config
OTP_DEMO_MODE=true         # true = show OTP in response & logs
STATIC_OTP=123456          # the demo OTP to use

# Twilio (Option B - real SMS)
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# AI (optional)
ANTHROPIC_API_KEY=your_key_here

# Hospital info
HOSPITAL_NAME=MediCare Multi-Specialty Hospital
HOSPITAL_ADDRESS=123 Health Avenue, Bangalore, Karnataka 560001
HOSPITAL_PHONE=+91-80-12345678
HOSPITAL_EMAIL=info@medicare-hospital.com
FRONTEND_URL=http://localhost:3000
```

### Frontend (frontend/.env)

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_HOSPITAL_NAME=MediCare Multi-Specialty Hospital
```

---

## Railway Deployment

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "MediCare hospital app"
git remote add origin https://github.com/yourusername/medicare
git push -u origin main
```

### Step 2 — Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Railway auto-detects Node.js
4. Set **Root Directory**: `hospital-v4/backend`
5. Set **Start Command**: `npm start`
6. Add environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate a random 32-char string>
   OTP_DEMO_MODE=true
   STATIC_OTP=123456
   FRONTEND_URL=https://your-vercel-url.vercel.app
   PORT=5000
   ```
7. Run seed: In Railway dashboard → Shell → `npm run seed`

### Step 3 — Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory**: `hospital-v4/frontend`
3. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend.up.railway.app/api
   ```
4. Deploy

### Step 4 — Custom Domain (optional)
1. Buy domain: Namecheap (~₹800/year for .in, ~₹1200/year for .com)
2. In Vercel: Settings → Domains → Add domain
3. Copy the CNAME record Vercel gives you
4. In Namecheap: Advanced DNS → Add CNAME record
5. Wait 5-30 minutes for DNS propagation
6. SSL is automatic ✅

---

## OTP Options

### Option A — Demo Mode (Recommended for now)
Set in Railway env:
```
OTP_DEMO_MODE=true
STATIC_OTP=123456
```
OTP `123456` always works. Shown in app UI and Railway logs.

### Option B — Real SMS via Twilio
1. Sign up at [twilio.com](https://twilio.com) (free trial gives $15 credit)
2. Buy an Indian virtual number (+91 numbers work for delivery)
3. Get Account SID, Auth Token, Phone Number
4. Set in Railway:
   ```
   OTP_DEMO_MODE=false
   TWILIO_ACCOUNT_SID=ACxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxx
   TWILIO_PHONE_NUMBER=+1xxxxxxx
   ```
5. Install Twilio: `npm install twilio`
6. If Twilio fails for any reason, app automatically falls back to demo mode

---

## Mobile Responsiveness

The following were fixed:
- **Viewport meta tag** in `index.html` — prevents mobile zoom issues
- **Sidebar** — off-canvas on all sizes, hamburger menu always visible
- **Grid layouts** — 1 column mobile → 2-4 columns desktop
- **Modals** — slide up from bottom on mobile (native feel)
- **Touch targets** — all buttons/inputs minimum 44×44px
- **Font size** — 16px on inputs (prevents iOS auto-zoom)
- **Tables** — horizontal scroll on mobile
- **ConsultationPage** — collapsible patient panel on mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Recharts |
| Backend | Node.js 18+, Express 4 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Sequelize 6 |
| Auth | JWT + OTP (Twilio optional) |
| AI | Anthropic Claude API |
| PDF | PDFKit + QRCode |
| Styling | Custom CSS (DM Sans + Playfair Display) |
| Deployment | Railway (backend) + Vercel (frontend) |
