# Deployment Guide: Backend (Render) + Frontend (Vercel)

This guide walks you through deploying the Placement Portal with:
- **Backend** → [Render](https://render.com)
- **Frontend** → [Vercel](https://vercel.com)
- **Database** → Render PostgreSQL (free tier)

---

## Prerequisites

- GitHub/GitLab repo with your code
- Accounts on [Render](https://render.com) and [Vercel](https://vercel.com)

---

## Part 1: Deploy Backend to Render

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `portal-db` (or any name)
   - **Region**: Choose one (e.g., Singapore, Oregon)
   - **Plan**: Free
4. Click **Create Database**
5. Wait for it to provision, then copy the **Internal Database URL** (for use in the same Render account) or **External Database URL** if needed

### Step 2: Create Web Service (Backend)

1. Click **New +** → **Web Service**
2. Connect your Git repository
3. Configure:
   - **Name**: `portal-backend`
   - **Region**: **Same as your database** (important!)
   - **Root Directory**: `backend` (or `PORTAL/backend` if repo structure differs)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3: Environment Variables (Backend)

In your Web Service → **Environment** tab, add:

| Key | Value | Required |
|-----|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `DATABASE_URL` | Your PostgreSQL connection string from Step 1 | ✅ |
| `JWT_SECRET` | A long random string (e.g. `openssl rand -base64 32`) | ✅ |
| `JWT_REFRESH_SECRET` | Another long random string | ✅ |
| `FRONTEND_URL` | Your Vercel URL (e.g. `https://portal.vercel.app`) | ✅ |
| `CORS_ORIGIN` | Same as FRONTEND_URL | ✅ |

**Optional (recommended for full features):**

| Key | Value |
|-----|-------|
| `JWT_EXPIRES_IN` | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary |
| `CLOUDINARY_API_SECRET` | From Cloudinary |
| `GOOGLE_AI_API_KEY` | For AI resume features |
| `REDIS_URL` | Upstash Redis URL (use `rediss://` for TLS) |
| `EMAIL_HOST` | **Use SendGrid** for production: `smtp.sendgrid.net` (Gmail times out on cloud IPs) |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | For SendGrid: `apikey` |
| `EMAIL_PASS` | SendGrid API key (from dashboard) |
| `EMAIL_FROM` | Verified sender, e.g. `Placement Portal <noreply@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | For Google Calendar |
| `GOOGLE_CLIENT_SECRET` | For Google Calendar |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-RENDER-URL.onrender.com/api/calendar/oauth/callback` |

> **Tip**: If you have a Render PostgreSQL database, you can use **Environment** → **Add from Render** → select your database to auto-inject `DATABASE_URL`.

### Step 4: Deploy & Run Migrations

1. Click **Create Web Service** – Render will build and deploy
2. After first deploy, open **Shell** (in your service) and run:
   ```bash
   npx prisma migrate deploy
   ```
3. (Optional) Seed initial data:
   ```bash
   npm run db:seed
   ```
4. Note your backend URL, e.g. `https://portal-backend-xxxx.onrender.com`

### Step 5: Fix FRONTEND_URL and CORS (after Vercel deploy)

Once you have your Vercel URL, go back to Render → Your Service → **Environment** and set:
- `FRONTEND_URL` = `https://your-app.vercel.app`
- `CORS_ORIGIN` = `https://your-app.vercel.app`

Redeploy if needed.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend` (or `PORTAL/frontend` if needed)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)

### Step 2: Environment Variables (Frontend)

Add these in **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-URL.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://YOUR-RENDER-URL.onrender.com` |
| `VITE_FRONTEND_URL` | `https://your-app.vercel.app` (optional) |

> **Important**: Replace `YOUR-RENDER-URL` with your actual Render backend URL (e.g. `portal-backend-xxxx`).

### Step 3: Deploy

1. Click **Deploy**
2. Vercel will build and deploy
3. Your app will be live at `https://your-project.vercel.app`

---

## Part 3: Connect Backend and Frontend

1. **Backend**: Set `FRONTEND_URL` and `CORS_ORIGIN` in Render to your Vercel URL
2. **Frontend**: Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in Vercel to your Render URL
3. Redeploy both if you made env changes after first deploy

---

## Troubleshooting

### Backend won't start
- Check **Logs** in Render for errors
- Ensure `DATABASE_URL` is a valid PostgreSQL URL (`postgresql://` or `postgres://`)
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Run `npx prisma migrate deploy` in Render Shell if tables are missing

### CORS errors in browser
- `CORS_ORIGIN` in Render must exactly match your Vercel URL (no trailing slash)
- Include `https://` in both `FRONTEND_URL` and `CORS_ORIGIN`

### Socket.IO not connecting
- `VITE_SOCKET_URL` must match backend URL (without `/api`)
- Render free tier may spin down after 15 min of inactivity; first request may be slow

### Frontend shows "VITE_API_BASE_URL not set"
- Add `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in Vercel Environment Variables
- Redeploy after adding env vars (Vite bakes them into the build)

### Email transporter: Timeout / Connection timeout
- **Render free tier blocks SMTP ports (25, 465, 587)** – direct SMTP does not work
- **Solution: Use SendGrid with HTTP API** (auto-used when SendGrid is configured). In Render → Environment, add:
  - `EMAIL_HOST` = `smtp.sendgrid.net` (triggers SendGrid API mode)
  - `EMAIL_USER` = `apikey`
  - `EMAIL_PASS` = your SendGrid API key
  - `EMAIL_FROM` = verified sender (e.g. `Placement Portal <you@domain.com>`)
- The app uses SendGrid's HTTP API (port 443) instead of SMTP when `EMAIL_HOST` contains `sendgrid`
- Verify your sender at [SendGrid Sender Auth](https://app.sendgrid.com/settings/sender_auth)
- Redeploy after adding env vars

### Endorsement magic link not received by mentor
- **SendGrid requires sender verification**: The `EMAIL_FROM` address (e.g. `munafmd9849@gmail.com`) must be verified in SendGrid.
  1. Go to [SendGrid → Settings → Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
  2. Under **Single Sender Verification**, add and verify the email you use in `EMAIL_FROM`
  3. Check your inbox for SendGrid's verification link and complete it
- **Render env vars** (no `#` comments – set each as a separate variable):
  | Key | Value |
  |-----|-------|
  | `EMAIL_HOST` | `smtp.sendgrid.net` |
  | `EMAIL_PASS` | Your full SendGrid API key (starts with `SG.`) |
  | `EMAIL_FROM` | `Placement Portal <your-verified-email@gmail.com>` |
- Alternatively, set `SENDGRID_API_KEY` instead of `EMAIL_HOST` + `EMAIL_PASS`
- Check Render logs for `[EMAIL] SendGrid API mode. FROM:` – confirms config is loaded
- If emails fail, the API now returns `emailSent: false` and the UI shows a clear error

---

## Summary Checklist

- [ ] PostgreSQL database created on Render
- [ ] Backend Web Service created with `backend` as root
- [ ] All required env vars set on Render
- [ ] `prisma migrate deploy` run in Render Shell
- [ ] Backend URL noted (e.g. `https://portal-backend-xxxx.onrender.com`)
- [ ] Frontend deployed on Vercel with `frontend` as root
- [ ] `VITE_API_BASE_URL` and `VITE_SOCKET_URL` set in Vercel
- [ ] `FRONTEND_URL` and `CORS_ORIGIN` updated in Render with Vercel URL
- [ ] Both services redeployed after final env changes
