# Self-hosted Judge0 CE (coding assessments)

Open-source [Judge0 CE](https://github.com/judge0/judge0) runs student code in assessments (Python, Java, C++, JavaScript).

The portal **backend** calls Judge0 over HTTP — it does not import this folder at runtime. This folder is **Docker config** only.

## Architecture (production)

```
Student → Vercel (frontend) → EC2 (backend API)
                                  ↓ HTTP (private)
                            Judge0 on EC2 #2  OR  same EC2 :2358
                                  ↓
                            judge0-server + workers + Postgres + Redis
```

**Recommended:** Separate small EC2 for Judge0 (needs `privileged` Docker + 2GB+ RAM).  
**Minimum:** Same EC2 as backend — use `t3.medium` or larger.

Do **not** expose port `2358` to the public internet. Only the backend should reach Judge0.

## 1. Configure secrets

Copy and edit (use strong random passwords — do not use defaults from samples):

```bash
cd judge0
cp judge0.conf judge0.local.conf   # optional: keep judge0.conf as template
```

In `judge0.conf` set at minimum:

```ini
REDIS_PASSWORD=<strong-redis-password>
POSTGRES_PASSWORD=<strong-postgres-password>

# Match backend JUDGE0_AUTH_TOKEN exactly
AUTHN_HEADER=X-Auth-Token
AUTHN_TOKEN=<strong-api-token>

# Optional: only allow your backend server IP
# ALLOW_IP=<backend-private-or-public-ip>
```

## 2. Start Judge0

```bash
cd judge0
docker compose up -d
curl http://127.0.0.1:2358/system_info
```

Services: `judge0-server`, `judge0-workers`, `judge0-db`, `judge0-redis`.

## 3. Backend env (EC2)

In `backend/.env`:

```env
JUDGE0_ENABLED=true
JUDGE0_PROVIDER=selfhosted
JUDGE0_API_URL=http://127.0.0.1:2358
JUDGE0_AUTH_TOKEN=<same-as-AUTHN_TOKEN-in-judge0.conf>
```

If Judge0 is on another EC2 in the same VPC:

```env
JUDGE0_API_URL=http://10.0.1.50:2358
```

Restart the API after changing env.

## 4. Verify from backend host

```bash
curl -H "X-Auth-Token: YOUR_TOKEN" http://127.0.0.1:2358/system_info
```

Startup log should show: `Judge0: enabled (selfhosted → ...)`

## Security checklist

- [ ] Change `REDIS_PASSWORD` and `POSTGRES_PASSWORD` from any sample values
- [ ] Set `AUTHN_TOKEN` / `JUDGE0_AUTH_TOKEN` (same value)
- [ ] Security group: **no** inbound `2358` from `0.0.0.0/0`
- [ ] Allow `2358` only from backend security group or `127.0.0.1`
- [ ] Judge0 containers require `privileged: true` (sandbox/isolate)

## Instance sizing

| Load | Suggestion |
|------|------------|
| Dev / small college | 2 vCPU, 4 GB RAM dedicated Judge0 EC2 |
| Production drives | 4 vCPU, 8 GB RAM or separate worker scaling |

## Alternative: Docker production stack

From the repo root (same EC2):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This runs **portal-api**, **portal-worker**, and **Judge0** together.  
Set `DATABASE_URL` (Neon) and `REDIS_URL` (Redis.io) in `backend/.env`.  
Judge0 port `2358` is **not** published — only the API container can reach it.

For PM2 instead of Docker for the backend, use `judge0/docker-compose.yml` alone (Judge0 binds to `127.0.0.1:2358`).
