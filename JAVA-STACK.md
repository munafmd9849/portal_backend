# Java stack — deploy frontend and backend separately

This repo still contains the Node portal (`backend/` + `frontend/`). The Java stack is additive:

- `backend-java/` — Spring Boot 4 API (Java 21), HTTP **3000**, Socket.IO **3001**
- `frontend-java/` — Vite/React UI for the Java API only

Do not replace Node with these folders. Deploy them as their own services.

## 1. Backend (`backend-java`)

Needs PostgreSQL (same schema as Node), plus env vars from `backend-java/.env.example`. Never commit a real `.env`.

Copy env, then either:

```bash
cd backend-java
cp .env.example .env   # fill secrets
mvn -DskipTests package
java -jar target/placement-portal-1.0.0.jar
```

or Docker:

```bash
docker build -t portal-api-java ./backend-java
docker run --env-file backend-java/.env -p 3000:3000 -p 3001:3001 portal-api-java
```

Put a reverse proxy in front (nginx / Caddy / load balancer):

| Public path | Upstream |
|-------------|----------|
| `/api` | `http://127.0.0.1:3000` |
| `/socket.io` | `http://127.0.0.1:3001` (WebSocket upgrade) |

Set `CORS_ORIGIN` and `FRONTEND_URL` to the real frontend origin (Vercel URL or your domain).

Required production keys (see `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, Cloudinary, SMTP, `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

## 2. Frontend (`frontend-java`)

Vite bakes `VITE_*` into the bundle at **build** time.

```bash
cd frontend-java
cp .env.example .env
# production example when nginx proxies API + sockets on the same host:
# VITE_API_BASE_URL=https://api.yourdomain.com/api
# VITE_SOCKET_URL=https://api.yourdomain.com
# VITE_FRONTEND_URL=https://app.yourdomain.com
npm ci
npm run build
```

Host `dist/` on Vercel, Netlify, S3+CloudFront, or nginx.

Docker:

```bash
docker build -t portal-web-java \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com/api \
  --build-arg VITE_SOCKET_URL=https://api.yourdomain.com \
  ./frontend-java
```

If the UI is HTTPS and the API is HTTP, the browser will block mixed content. Use HTTPS for both, or proxy `/api` and `/socket.io` through the frontend origin.

## 3. Suggested split

| Service | What to host |
|---------|----------------|
| API | Render / Railway / Fly / EC2 / any JVM or Docker host |
| UI | Vercel / Netlify (static) |
| DB | Managed Postgres (same DB the Node app uses, or a copy) |

Open `https://<api-host>/api-docs` to confirm the Java API is up.
