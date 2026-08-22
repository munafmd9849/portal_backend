# PWIOI Placement Portal

Full-stack placement portal for students, recruiters, admins, and super admins — jobs, applications, interviews, assessments, endorsements, and notifications.

## Repository structure

```
PORTAL-main/
├── backend/     # Node.js API, Prisma, workers, email
└── frontend/    # React + Vite UI
```

All application code lives in **`backend/`** and **`frontend/`** only.

## Local development

### Backend

```bash
cd backend
cp .env.example .env    # edit DATABASE_URL, keys, etc.
npm install
npx prisma generate
npx prisma db push      # SQLite local dev
npm run dev             # http://localhost:3000
```

Optional background worker (bulk email, CSV exports — requires Redis):

```bash
npm run worker
```

### Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:3000/api
npm install
npm run dev             # http://localhost:5173
```

## Production (EC2 + Vercel)

| Component | Where | Notes |
|-----------|--------|--------|
| API | EC2 | `NODE_ENV=production`, PostgreSQL, Redis, SMTP |
| Worker | EC2 (2nd process) | `npm run worker` |
| UI | Vercel | Set `VITE_API_BASE_URL` to your EC2 API |

### Backend env (EC2)

Copy [`backend/.env.production.example`](backend/.env.production.example) and set:

- `DATABASE_URL` — PostgreSQL (not SQLite)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — strong random values
- `REDIS_URL` — managed Redis or local Redis with password
- `SMTP_*` — email provider (required if `REQUIRE_EMAIL_VERIFIED=true`)
- `FRONTEND_URL`, `CORS_ORIGIN` — your Vercel URL
- `CLOUDINARY_*` — file uploads

Email sends **from the backend** via Nodemailer (no separate email service folder needed on EC2).

Run on deploy:

```bash
npx prisma migrate deploy   # or db push for first setup
npm start                   # API
npm run worker              # queues (separate process)
```

### Frontend env (Vercel)

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
VITE_FRONTEND_URL=https://your-app.vercel.app
```

## Docker (optional)

Full stack with Postgres + Redis:

```bash
# Set POSTGRES_PASSWORD, DATABASE_URL, JWT secrets in .env
docker compose up -d
```

See `docker-compose.yml` for service layout.

## Tech stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, Nodemailer
- **Frontend:** React, Vite, Tailwind CSS
- **Storage:** Cloudinary (uploads)
- **AI (optional):** Mistral / Google Gemini — interview prep, resume tools

## Environment templates

| File | Purpose |
|------|---------|
| `backend/.env.example` | Local backend |
| `backend/.env.production.example` | Production backend |
| `frontend/.env.example` | Frontend (local + production build vars) |

Never commit real `.env` files.
