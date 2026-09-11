# PWIOI Placement Portal — Java / Spring Boot 4 backend

Maven **Spring Boot 4.1.1** (Java 21) API. Same PostgreSQL schema as the Node app, same `/api/*` routes.

## Stack

| Piece | Choice |
|--------|--------|
| Language | Java 21 |
| Build | Maven |
| Framework | Spring Boot **4.1.1** |
| REST | `spring-boot-starter-webmvc` |
| ORM | **JPA + Hibernate** (`spring-boot-starter-data-jpa`) |
| DB | PostgreSQL |
| Auth | Spring Security + JJWT |
| JSON | Jackson 2 via `spring-boot-jackson2` |
| AI | Gemini + Mistral (WebClient) |
| Realtime | Socket.IO on port 3001 |
| Docs | springdoc 3.1.0 → `/api-docs` |

Env is loaded from `backend-java/.env`, or `backend/.env` if you run from the repo root. Node `EMAIL_*` keys are aliased to `SMTP_*`.

Use **`frontend-java/`** with this API (not `frontend/`). The original React app stays paired with Node.

## Run (short)

```bash
cd backend-java
mvn spring-boot:run
```

In another terminal:

```bash
cd frontend-java
npm install
npm run dev
```

Full steps are in the project chat / below in the main README.
