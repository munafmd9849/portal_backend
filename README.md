# PWIOI Placement Portal

Full-stack placement portal for students, recruiters, admins, and super admins — jobs, applications, interviews, assessments, endorsements, and notifications.

## Repository structure

```
PORTAL-main/
├── backend/        # Node.js API (current)
├── backend-java/   # Spring Boot / Maven API (same routes & Postgres schema)
├── frontend/       # React + Vite UI for the Node API — do not change for Java
└── frontend-java/  # React + Vite UI for the Java API
```

Java backend: see [`backend-java/README.md`](backend-java/README.md). Java UI: [`frontend-java/README.md`](frontend-java/README.md). Run Java with `cd backend-java && mvn spring-boot:run` (HTTP 3000, Socket.IO 3001). Do not run Node and Java on port 3000 at the same time.

All application code lives in **`backend/`**, **`backend-java/`**, **`frontend/`**, and **`frontend-java/`**.

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

### Frontend (Node)

```bash
cd frontend
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:3000/api
npm install
npm run dev             # http://localhost:5173
```

### Frontend (Java)

Use `frontend-java/` with `backend-java`. Do not edit `frontend/` for Java work.

```bash
cd frontend-java
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

Run on deploy (PM2):

```bash
npx prisma db push          # first setup (no migrations folder yet)
npm start                   # API
npm run worker              # queues (separate process)
```

Or with Docker on EC2:

```bash
cp backend/.env.production.example backend/.env   # fill Neon, Redis.io, secrets
# edit judge0/judge0.conf — passwords + AUTHN_TOKEN
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml --profile seed run --rm db-seed   # optional
```

See [`docker-compose.prod.yml`](docker-compose.prod.yml) for the production layout (API + worker + Judge0; no local Postgres/Redis for the portal).

### Frontend env (Vercel)

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_SOCKET_URL=https://your-api-domain.com
VITE_FRONTEND_URL=https://your-app.vercel.app
```

## Docker

| File | Use case |
|------|----------|
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | **EC2 production** — API + worker + Judge0; Neon + Redis.io via `backend/.env` |
| [`docker-compose.dev.yml`](docker-compose.dev.yml) | Local full stack (Postgres, Redis, frontend) |
| [`docker-compose.infra.yml`](docker-compose.infra.yml) | Local infra only; run backend/frontend with `npm run dev` |

Production (EC2):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Local full stack:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

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

## Self-hosted Judge0 (coding assessments)

See [`judge0/README.md`](judge0/README.md) for production setup on EC2.

Quick summary:

1. Run `docker compose up -d` inside `judge0/`
2. Set `AUTHN_TOKEN` in `judge0/judge0.conf`
3. Set matching vars on the backend: `JUDGE0_ENABLED=true`, `JUDGE0_PROVIDER=selfhosted`, `JUDGE0_API_URL`, `JUDGE0_AUTH_TOKEN`
4. Do not expose port `2358` publicly — backend only
