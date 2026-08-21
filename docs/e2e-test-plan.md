# PHASE 2 — E2E Test Plan (complete matrix)

**Status:** DRAFT — awaiting approval. **Do not implement Playwright until this document is approved.**  
**Source of truth:** [`docs/e2e-test-audit.md`](./e2e-test-audit.md) (Phase 1 approved).  
**Out of scope:** Conversational AI interviews (not in live product lists).  
**No application code, packages, schema, or APIs are changed in this phase.**

---

## How to read this plan

### Failure classification (use in Phase 5/6)

When a test fails, tag the cause as exactly one of:

| Class | Meaning | Example |
|-------|---------|---------|
| **1. Product bug** | App behavior contradicts intended security/business rules **as audited** | SEC-01 returns `correctAnswer` to any student |
| **2. Test bug** | Spec, selector, fixture, or assertion is wrong | Wrong role JWT, flaky timeout |
| **3. Environment/configuration failure** | Missing env, DB not seeded, rate limit, Cloudinary/AI down | `VITE_API_BASE_URL` unset; `NODE_ENV=production` 429 |
| **4. Expected browser limitation** | Browser cannot guarantee the control | User can still open DevTools; Esc exits fullscreen |

**Proctoring rule:** Never assert “user cannot leave fullscreen / cannot open another tab / cannot paste.” Assert **detection, persistence, snapshots, threshold, auto-submit, risk state**.

### Known product defects vs tests

Until engineering fixes them, these tests **must still exist** as regressions. Implementation (Phase 4) should mark them `@known-bug` / `test.fail()` **only after** capturing the current insecure response. Do **not** rewrite the app in Phase 4 unless separately approved.

| Audit ID | Current code behavior | Intended (when fixed) |
|----------|----------------------|------------------------|
| **SEC-01** | Any student `GET /api/assessments/details/:id` on PUBLISHED returns full `questions[].correctAnswer` and all `testCases` | 403 if unassigned; assigned students must not receive answers/hidden cases |
| **SEC-02** | `POST /api/code/evaluate` returns `expectedOutput` for hidden cases | Hidden cases omitted or redacted in student response |
| **SEC-03** | Restricted ADMIN can list/mutate assessments, mocks, AI interviews, interview scheduling, search without school/center/batch filter | Same scope as student directory |
| **SEC-04** | Recruiter JWT can `GET /api/search?types=STUDENT,RESUME` | Recruiter must not search students/resumes (or only own pipeline) |
| **SEC-05** | `POST /api/placement/ai` has no JWT | 401 without auth (or student-only) |
| **SEC-07** | Admin with all `allowed*` empty is treated as **full access** | Empty lists should mean **no access** (or explicit `*`) |
| **DATA-05** | Double apply / double complete may race | Second apply/complete 409; one Application / one completed session |

**SEC-06** (Super Admin can open `/student` via `ProtectedRoute` bypass) is **P1** documented current UX, not a P0 isolation defect.

### Column legend (every test)

| Field | Meaning |
|-------|---------|
| **Type** | `UI` · `API` · `Combined` |
| **Seed** | Yes = needs e2e fixtures |
| **Mock** | External service stub (Gemini/Mistral/Cloudinary/Judge0/SMTP/Google) |
| **Security** | Isolation / auth assertion |

Shared password for all e2e users: `E2E_PASSWORD` (proposed `E2ePass#143`).

---

## Required test users

| ID | Email | Role | Scope / notes |
|----|-------|------|----------------|
| U-SA | `e2e.super@pwioi.test` | SUPER_ADMIN | Full access (`*` on all allowed lists) |
| U-AA | `e2e.admin.sot@pwioi.test` | ADMIN | Restricted: school **SOT**, center **BANGALORE**, batch **24-28** (names + matching UUIDs) |
| U-AB | `e2e.admin.som@pwioi.test` | ADMIN | Restricted: school **SOM**, center **HYDERABAD**, batch **23-27** |
| U-AE | `e2e.admin.empty@pwioi.test` | ADMIN | All `allowed*` JSON `[]` (SEC-07) |
| U-RC | `e2e.recruiter@pwioi.test` | RECRUITER | ACTIVE, company TechCorp E2E |
| U-RP | `e2e.recruiter.pending@pwioi.test` | RECRUITER | PENDING |
| U-ST-A | `e2e.student.a@pwioi.test` | STUDENT | Complete profile; SOT / BANGALORE / 24-28 |
| U-ST-B | `e2e.student.b@pwioi.test` | STUDENT | Complete profile; SOM / HYDERABAD / 23-27 |
| U-ST-I | `e2e.student.incomplete@pwioi.test` | STUDENT | `profileCompleted=false` |
| U-ST-X | `e2e.student.blocked@pwioi.test` | STUDENT | `status=BLOCKED` |
| U-IV | (no login) | Interviewer | Invite JWT `type=interviewer` generated at runtime |

---

## Required database records

| Record | Purpose |
|--------|---------|
| Schools SOT, SOM | Academic + targeting |
| Centers BANGALORE, HYDERABAD | Scope split |
| Batches 24-28, 23-27 | Scope split |
| Company `E2E TechCorp` | Recruiter + jobs |
| Job `JOB-POSTED-A` | POSTED, targeted SOT/BANGALORE/24-28, `isPosted=true` |
| Job `JOB-DRAFT` | IN_REVIEW / not posted |
| Job `JOB-TEST` | POSTED, `requiresTest=true`, linked to ASM-MIXED |
| Job `JOB-OFFER` | POSTED; Student A application OFFERED |
| Application A→JOB-POSTED-A APPLIED | Apply/withdraw/revoke |
| Application A→JOB-OFFER OFFERED | Offer accept/decline |
| Assessment `ASM-MIXED` PUBLISHED | Assigned **only** Student A; MCQ + CODING (public + hidden tests) |
| Assessment `ASM-DRAFT` DRAFT | Student must not start |
| Assessment `ASM-B` PUBLISHED | Assigned **only** Student B (SEC-01 unassigned leak) |
| Mock drive + slot for Student A | Inside calendar window |
| Mock slot OUTSIDE window | Join rejection |
| Guided AI interview enrolled Student A | GUIDED only |
| CMS STATS published + unpublished draft | Landing |
| Success story published | Public carousel |
| AuditLog optional | May be created by login tests |

---

## Required environment variables

| Variable | E2E value |
|----------|-----------|
| `NODE_ENV` | `development` (avoid 429) |
| `DATABASE_URL` | `file:./e2e.db` (isolated) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Dedicated e2e secrets |
| `PORT` | `3000` |
| `CORS_ORIGIN` / `FRONTEND_URL` | `http://localhost:5173` |
| `VITE_API_BASE_URL` or `VITE_API_URL` | `http://localhost:3000/api` (**required**; frontend throws if unset) |
| `VITE_SOCKET_URL` | `http://localhost:3000` |
| `JUDGE0_ENABLED` | `false` unless `@judge0` |
| `AI_ENABLED` | `false` in CI; stub ATS/optimize |
| `E2E_PASSWORD` | shared fixture password |
| `DISABLE_RATE_LIMIT` | `true` optional for placement AI tests |

SMTP/Cloudinary/Google OAuth **not required** for P0 if those tests are skipped or stubbed.

---

## External services — mock / stub / skip

| Service | P0 default | Notes |
|---------|------------|--------|
| Judge0 | **Off** (local runners) | Optional `@judge0` |
| Google Gemini | **Stub or skip** | ATS/placement AI |
| Mistral | **Stub or skip** | ATS job-match, AI insights |
| Cloudinary | **Skip upload** / stub URL | Resume/screenshot; proctoring can assert API 200 with fixture blob if keys present |
| Gmail SMTP | **Skip** | Don’t wait for real OTP email; seed verified users or stub OTP store |
| Google OAuth / Calendar | **Skip P0** | P2 if mocked |
| Jitsi / WebRTC SFU | **Skip full media mesh** | Precheck permissions + join route; not a real peer call |
| Metered TURN | **Skip** | |
| DuckDuckGo fallback | **Skip** | |

---

# P0 — Security, authorization, data isolation, critical business

## Defect regressions (mandatory)

### REG-SEC-01 — Unassigned student can read assessment answers

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-01 |
| **Module** | Assessments / Security |
| **Role** | Student B |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (`ASM-MIXED` assigned only to A; `ASM-B` for B) |
| **Mock** | No |
| **Preconditions** | Student B logged in. `ASM-MIXED` is PUBLISHED and **not** assigned to B. |
| **Workflow** | `GET /api/assessments/details/{ASM-MIXED.id}` with B’s access token. |
| **Expected frontend** | N/A (API). If UI navigates to `/assessment/{id}`, must not reveal answers (today it would if details API is used). |
| **Expected API (current / product bug)** | **200** body includes `questions[].correctAnswer` and full `testCases`. |
| **Expected API (when fixed)** | **403** unassigned. Assigned students: questions **without** `correctAnswer` / hidden cases. |
| **DB/state** | No write. |
| **Security** | IDOR + answer leak. Classify failure: if 200+answers → **product bug** until fixed. |
| **Known** | SEC-01 |

### REG-SEC-02 — Hidden test expected output leaked on evaluate

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-02 |
| **Module** | Coding / Security |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (coding question with `hidden: true` case) |
| **Mock** | No (local runner) |
| **Preconditions** | Student A JWT. Coding question id known. |
| **Workflow** | `POST /api/code/evaluate` with language javascript, trivial code, `testCases` including one hidden case with distinct `expectedOutput`. |
| **Expected frontend** | Hidden cases must not show expected output in UI (assert separately in COD-04). |
| **Expected API (current)** | **200** `results[]` includes `expectedOutput` for `hidden: true`. |
| **Expected API (when fixed)** | Hidden `expectedOutput` omitted/redacted; score still uses hidden cases. |
| **DB/state** | No persist required. |
| **Security** | Exam integrity. Failure with leak → **product bug**. |
| **Known** | SEC-02 |

### REG-SEC-03a — Restricted admin lists another campus’s assessments

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-03a |
| **Module** | Admin scoping |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (`ASM-B` for Student B / SOM) |
| **Mock** | No |
| **Preconditions** | Admin A JWT (SOT-only). |
| **Workflow** | `GET /api/assessments/all`. |
| **Expected API (current)** | **200** includes `ASM-B` (**product bug** SEC-03). |
| **Expected API (when fixed)** | `ASM-B` absent. |
| **Frontend** | Admin assessments table currently can show all. |
| **DB** | No write. |
| **Security** | Horizontal privilege / scope bypass. |

### REG-SEC-03b — Restricted admin lists another campus’s mock drives

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-03b |
| **Module** | Admin scoping / Mock interviews |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (mock drive targeting Student B only) |
| **Mock** | No |
| **Workflow** | `GET /api/mock-interviews` (admin list). |
| **Expected API (current)** | Drive for B visible. **Product bug.** |
| **Expected (fixed)** | Not visible. |
| **DB** | No write. |
| **Security** | Scope bypass. |

### REG-SEC-03c — Restricted admin lists another campus’s AI interviews

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-03c |
| **Module** | Admin scoping / Guided AI |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (GUIDED interview enrolled B only) |
| **Mock** | No |
| **Workflow** | Admin AI interview list endpoint used by UI. |
| **Expected API (current)** | B’s interview visible. **Product bug.** |
| **Expected (fixed)** | Hidden. |
| **Security** | Scope bypass. |

### REG-SEC-03d — Restricted admin interview-scheduling not scoped

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-03d |
| **Module** | Admin scoping / Job interviews |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (InterviewSession on job targeted only at SOM / Student B) |
| **Mock** | No |
| **Workflow** | List/get session via `/api/admin/interview-scheduling`. |
| **Expected API (current)** | Access **200**. **Product bug.** |
| **Expected (fixed)** | **403**. |
| **Security** | Scope bypass. |

### REG-SEC-04 — Recruiter global search of students/resumes

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-04 |
| **Module** | Search / Recruiter isolation |
| **Role** | Recruiter |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (Student A exists) |
| **Mock** | No |
| **Preconditions** | Recruiter ACTIVE JWT. |
| **Workflow** | `GET /api/search?q=e2e.student.a&types=STUDENT,RESUME`. |
| **Expected API (current)** | **200** with student/resume hits. **Product bug SEC-04.** |
| **Expected (fixed)** | **403** or empty types not allowed. |
| **Frontend** | No global search UI; API still callable. |
| **DB** | No write. |
| **Security** | Data leakage. |

### REG-SEC-05 — Placement AI without authentication

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-05 |
| **Module** | Placement AI / Auth |
| **Role** | Anonymous |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | No |
| **Mock** | Yes — stub Gemini **or** assert 401 before provider call |
| **Workflow** | `POST /api/placement/ai` `{ "topic": "resume tips" }` **no** Authorization header. |
| **Expected API (current)** | **200** or provider error / rate limit — **not 401**. **Product bug SEC-05.** |
| **Expected (fixed)** | **401**. |
| **Frontend** | Student Resources tab would still work once JWT required. |
| **DB** | No write. |
| **Security** | Unauthenticated spend/abuse. Env flake if real Google called → class **3**. |

### REG-SEC-07 — Empty allowed lists = full access

| Field | Value |
|-------|--------|
| **Test ID** | REG-SEC-07 |
| **Module** | Admin scoping |
| **Role** | Admin empty (`U-AE`) |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/students` as U-AE. |
| **Expected API (current)** | **200** includes Student A **and** B (`isFullAccessScope` legacy). **Product bug SEC-07.** |
| **Expected (fixed)** | **200** empty or 403. |
| **Frontend** | Directory shows everyone. |
| **DB** | No write. |
| **Security** | Misconfigured admin = global admin. |

### REG-DATA-05a — Duplicate job application

| Field | Value |
|-------|--------|
| **Test ID** | REG-DATA-05a |
| **Module** | Applications / Integrity |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (`JOB-POSTED-A`; A not yet applied **or** reset) |
| **Mock** | No |
| **Preconditions** | Profile complete. Job posted and targeted. |
| **Workflow** | UI apply once. Immediately `POST /api/applications/jobs/{id}` again (parallel or sequential). |
| **Expected frontend** | First apply: success toast; tracker shows APPLIED. Second: error, no second card. |
| **Expected API** | First **201/200**. Second **409/400**. |
| **DB** | Exactly **one** `Application` for (studentA, job). |
| **Security** | Integrity. Two rows → **product bug** DATA-05. Race flake → retry then classify **1** vs **2**. |

### REG-DATA-05b — Double assessment complete

| Field | Value |
|-------|--------|
| **Test ID** | REG-DATA-05b |
| **Module** | Assessments / Integrity |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (`ASM-MIXED` assigned) |
| **Mock** | No |
| **Preconditions** | Session IN_PROGRESS (start once). |
| **Workflow** | Two parallel `POST /api/assessments/session/complete/{sessionId}`. |
| **Expected API** | One success; second 409/400 or idempotent same result. |
| **DB** | One session `SUBMITTED`/`PENDING_REVIEW`; no duplicate sessions for (assessment, student). |
| **Security** | Score/tamper integrity. |

---

## Authentication (P0)

### AUTH-01 — Valid student login

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-01 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Preconditions** | U-ST-A ACTIVE. |
| **Workflow** | Open `/` or `/login` → email/password → submit. |
| **Expected frontend** | Redirect `/student`. Dashboard loads. Tokens in `localStorage`. |
| **Expected API** | `POST /api/auth/login` **200** `{ user, accessToken, refreshToken }`. |
| **DB** | `users.lastLoginAt` updated; `sessionVersion` incremented; old refresh rows cleared for user. |
| **Security** | Session established only for that user. |

### AUTH-02 — Invalid password

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-02 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Login with wrong password. |
| **Expected frontend** | Error toast/message; stay on login; no dashboard. |
| **Expected API** | **401**. |
| **DB** | No `sessionVersion` bump. |
| **Security** | No token issued. |

### AUTH-03 — Blocked user cannot login

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-03 |
| **Module** | Authentication |
| **Role** | Student blocked |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (U-ST-X) |
| **Mock** | No |
| **Workflow** | Login as blocked student. |
| **Expected frontend** | Access denied / blocked message. |
| **Expected API** | **403**. |
| **DB** | No new session. |
| **Security** | BLOCKED cannot obtain access token. |

### AUTH-04 — Logout

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-04 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Preconditions** | Logged in. |
| **Workflow** | Click logout. |
| **Expected frontend** | Tokens cleared; land on `/`. `/student` redirects home. |
| **Expected API** | `POST /api/auth/logout` **200**. |
| **DB** | Refresh token deleted if sent. |
| **Security** | Subsequent API with old access may 401 after expiry; UI has no token. |

### AUTH-05 — Unauthenticated protected route

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-05 |
| **Module** | Authentication / RBAC |
| **Role** | Anonymous |
| **Priority** | P0 |
| **Type** | UI |
| **Seed** | No |
| **Mock** | No |
| **Workflow** | Visit `/student` with empty localStorage. |
| **Expected frontend** | Navigate to `/`. |
| **Expected API** | None or `/auth/me` 401. |
| **DB** | No change. |
| **Security** | No dashboard without JWT. |

### AUTH-06 — Student single-device session

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-06 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Login browser 1; capture token. Login browser 2. Call `GET /api/auth/me` with token 1. |
| **Expected frontend** | Browser 1: `SESSION_SUPERSEDED` → `/login?reason=session_superseded`. |
| **Expected API** | Token 1 **401/403** superseded. Token 2 **200**. |
| **DB** | `sessionVersion` = previous+1. |
| **Security** | Only latest student session valid. |

---

## RBAC (P0)

### RBAC-01 — Student cannot use admin UI

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-01 |
| **Module** | RBAC |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Login student; open `/admin`. |
| **Expected frontend** | Diagnostic hold then redirect `/student` (current `ProtectedRoute`). |
| **Expected API** | N/A. |
| **DB** | No change. |
| **Security** | Route guard. |

### RBAC-02 — Student cannot create jobs

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-02 |
| **Module** | RBAC / Jobs |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `POST /api/jobs` with student JWT. |
| **Expected API** | **403**. |
| **Frontend** | N/A. |
| **DB** | No Job row. |
| **Security** | Privilege escalation blocked. |

### RBAC-03 — Recruiter cannot list all students

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-03 |
| **Module** | RBAC / Recruiter isolation |
| **Role** | Recruiter |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/students` recruiter JWT. |
| **Expected API** | **403**. |
| **DB** | No change. |
| **Security** | Recruiter isolation (directory). |

### RBAC-04 — Student cannot fetch audit logs

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-04 |
| **Module** | RBAC / Audit |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/admin/audit-logs`. |
| **Expected API** | **401/403**. |
| **DB** | No change. |
| **Security** | Audit is SUPER_ADMIN. |

### RBAC-05 — Admin cannot mutate CMS

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-05 |
| **Module** | RBAC / CMS |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `POST /api/cms/sections` as Admin A. |
| **Expected API** | **403**. |
| **DB** | No new `cms_sections`. |
| **Security** | SUPER_ADMIN-only mutate. |

### RBAC-06 — Direct URL student assessment results as other role

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-06 |
| **Module** | RBAC |
| **Role** | Recruiter |
| **Priority** | P0 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Recruiter opens `/student`. |
| **Expected frontend** | Redirect to `/recruiter` after hold. |
| **API** | N/A. |
| **DB** | No change. |
| **Security** | Role home isolation. |

---

## Admin scoping & student isolation (P0)

### SCOPE-01 — Admin A directory excludes Student B

| Field | Value |
|-------|--------|
| **Test ID** | SCOPE-01 |
| **Module** | Admin scoping |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Open Student Directory. `GET /api/students`. |
| **Expected frontend** | Student A listed; B not. |
| **Expected API** | Array contains A email; not B. |
| **DB** | Read-only. |
| **Security** | Scoped list **is** implemented here. Failure → **product bug**. |

### SCOPE-02 — Admin A applications exclude Student B

| Field | Value |
|-------|--------|
| **Test ID** | SCOPE-02 |
| **Module** | Admin scoping / Applications |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (B applied to SOM job) |
| **Mock** | No |
| **Workflow** | `GET /api/applications`. |
| **Expected API** | No application whose student is B. |
| **DB** | Read-only. |
| **Security** | Applications **are** scoped. |

### SCOPE-03 — Super Admin sees both students

| Field | Value |
|-------|--------|
| **Test ID** | SCOPE-03 |
| **Module** | Admin scoping |
| **Role** | Super Admin |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/students`. |
| **Expected API** | Includes A and B. |
| **DB** | Read-only. |
| **Security** | Global role. |

### ISO-01 — Student A cannot read Student B profile

| Field | Value |
|-------|--------|
| **Test ID** | ISO-01 |
| **Module** | Student isolation |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET` student profile endpoints with B’s `studentId` if API allows id param; otherwise `GET /api/students/:id`. |
| **Expected API** | **403/404**, not B’s PII. |
| **DB** | No change. |
| **Security** | IDOR. |

### ISO-02 — Student A cannot complete B’s assessment session

| Field | Value |
|-------|--------|
| **Test ID** | ISO-02 |
| **Module** | Student isolation / Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (B has IN_PROGRESS session) |
| **Mock** | No |
| **Workflow** | `POST /api/assessments/session/complete/{B.sessionId}` with A token. |
| **Expected API** | **403**. |
| **DB** | B session unchanged. |
| **Security** | Session ownership. |

### ISO-03 — Student B cannot join Student A mock slot

| Field | Value |
|-------|--------|
| **Test ID** | ISO-03 |
| **Module** | Student isolation / Mock interviews |
| **Role** | Student B |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (A’s slot) |
| **Mock** | No |
| **Workflow** | Open `/mock-interview-precheck/{A.slotId}` or live-code/join APIs. |
| **Expected frontend** | Access denied / redirect. |
| **Expected API** | **403**. |
| **DB** | Slot still A’s. |
| **Security** | Slot ownership. |

---

## Jobs & applications (P0)

### JOB-01 — Posted targeted job visible to Student A only

| Field | Value |
|-------|--------|
| **Test ID** | JOB-01 |
| **Module** | Jobs |
| **Role** | Student A / B |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | A and B open Explore Jobs / `GET /api/jobs/targeted`. |
| **Expected frontend** | A sees `JOB-POSTED-A`; B does not. Neither sees `JOB-DRAFT`. |
| **Expected API** | Targeted list matches targeting JSON. |
| **DB** | Read-only. |
| **Security** | Targeting isolation. |

### JOB-02 — Create and post job (admin)

| Field | Value |
|-------|--------|
| **Test ID** | JOB-02 |
| **Module** | Jobs |
| **Role** | Admin A (permissions `*`) |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (company exists) |
| **Mock** | No |
| **Workflow** | Create Job UI → save → post/approve as allowed. |
| **Expected frontend** | Job appears in Manage Jobs as posted. |
| **Expected API** | `POST /api/jobs` 201; post/approve 200. |
| **DB** | Job `status=POSTED`, `isPosted=true`, `postedAt` set. |
| **Security** | Only ADMIN/SUPER_ADMIN/RECRUITER as routed. |

### APP-01 — Student apply happy path

| Field | Value |
|-------|--------|
| **Test ID** | APP-01 |
| **Module** | Applications |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (`JOB-POSTED-A`, no existing app — or dedicated job) |
| **Mock** | No |
| **Preconditions** | Profile complete. |
| **Workflow** | Apply with resume + optional custom answers. |
| **Expected frontend** | Success; Applications tab shows APPLIED. |
| **Expected API** | **201/200**. |
| **DB** | Application APPLIED; JobTracking applied=true. |
| **Security** | Bound to A’s studentId. |

### APP-02 — Incomplete profile cannot apply

| Field | Value |
|-------|--------|
| **Test ID** | APP-02 |
| **Module** | Applications |
| **Role** | Student incomplete |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Jobs tab / `POST /applications/jobs/:id`. |
| **Expected frontend** | Gate to onboarding/profile. |
| **Expected API** | **403** PROFILE_INCOMPLETE. |
| **DB** | No application. |
| **Security** | Eligibility. |

### APP-03 — Admin shortlist

| Field | Value |
|-------|--------|
| **Test ID** | APP-03 |
| **Module** | Applications |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (A applied) |
| **Mock** | No |
| **Workflow** | Job applications → set SHORTLISTED. |
| **Expected frontend** | Status badge SHORTLISTED. |
| **Expected API** | `PATCH /api/applications/:id/status` 200. |
| **DB** | `status`/`pipelineStatus` SHORTLISTED. |
| **Security** | Admin A in-scope application only. |

### APP-04 — Revoke blocks updates

| Field | Value |
|-------|--------|
| **Test ID** | APP-04 |
| **Module** | Applications revoke |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `POST /api/applications/:id/revoke` then `PATCH .../status`. |
| **Expected frontend** | Revoked state; status change fails. |
| **Expected API** | Revoke 200; patch **400** (restore first). |
| **DB** | `REVOKED_BY_ADMIN`; previousStatus stored. |
| **Security** | Integrity machine. |

### APP-05 — Restore then update

| Field | Value |
|-------|--------|
| **Test ID** | APP-05 |
| **Module** | Applications restore |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (revoked app) |
| **Mock** | No |
| **Workflow** | Restore → patch SHORTLISTED. |
| **Expected frontend** | Restored then shortlisted. |
| **Expected API** | Restore 200; patch 200. |
| **DB** | Status restored then SHORTLISTED. |
| **Security** | Only ADMIN. |

### APP-06 — Offer accept

| Field | Value |
|-------|--------|
| **Test ID** | APP-06 |
| **Module** | Applications / Offers |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (`JOB-OFFER`) |
| **Mock** | No |
| **Workflow** | Tracker → accept offer. |
| **Expected frontend** | ACCEPTED. |
| **Expected API** | `POST .../offer-response` 200. |
| **DB** | `ACCEPTED`; `joinedAt` optional per code. |
| **Security** | Only owning student. |

---

## Assessments & coding (P0)

### ASM-01 — Assigned student can start MIXED assessment

| Field | Value |
|-------|--------|
| **Test ID** | ASM-01 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Assessments tab → start `ASM-MIXED`. |
| **Expected frontend** | `/assessment/:id`; instructions; timer. |
| **Expected API** | `GET /my-assignments` includes it; `POST /session/start/:id` 200. |
| **DB** | `AssessmentSession` IN_PROGRESS unique (assessmentId, studentId). |
| **Security** | Only assignee (list). Details leak covered by REG-SEC-01. |

### ASM-02 — Unassigned student does not see assessment in list

| Field | Value |
|-------|--------|
| **Test ID** | ASM-02 |
| **Module** | Assessments |
| **Role** | Student B |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Open my assessments. |
| **Expected frontend** | `ASM-MIXED` absent. |
| **Expected API** | `GET /my-assignments` no MIXED id. |
| **DB** | Read-only. |
| **Security** | Assignment list OK; details IDOR is REG-SEC-01. |

### ASM-03 — Draft not startable

| Field | Value |
|-------|--------|
| **Test ID** | ASM-03 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes (`ASM-DRAFT`) |
| **Mock** | No |
| **Workflow** | `POST /session/start/{ASM-DRAFT.id}`. |
| **Expected API** | **403/404**. |
| **DB** | No session. |
| **Security** | Unpublished. |

### ASM-04 — MCQ scores on submit

| Field | Value |
|-------|--------|
| **Test ID** | ASM-04 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (known correct option) |
| **Mock** | No |
| **Workflow** | Answer MCQ correctly; complete. |
| **Expected frontend** | Results show points for MCQ. |
| **Expected API** | complete 200; score > 0. |
| **DB** | Session SUBMITTED; score persisted. |
| **Security** | Server grades MCQ. |

### ASM-05 — Timer expiry auto-completes

| Field | Value |
|-------|--------|
| **Test ID** | ASM-05 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (duration 1 minute **or** seed duration 1) |
| **Mock** | No |
| **Workflow** | Start; wait past duration (or clock helper). |
| **Expected frontend** | Auto-submit / results. |
| **Expected API** | complete or server enrich marks ended. |
| **DB** | Session not IN_PROGRESS. |
| **Security** | Server clock, not only client. Classify timer flake as **2** or **3**. |

### ASM-06 — Second in-progress session blocked

| Field | Value |
|-------|--------|
| **Test ID** | ASM-06 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | start twice without complete. |
| **Expected API** | Second **400/409**. |
| **DB** | One IN_PROGRESS. |
| **Security** | Attempt restriction. |

### COD-01 — Run JavaScript in assessment

| Field | Value |
|-------|--------|
| **Test ID** | COD-01 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No (local runner) |
| **Workflow** | Coding question → Run `console.log("e2e")`. |
| **Expected frontend** | Output `e2e`. |
| **Expected API** | `POST /api/code/run` 200 `output` contains e2e, `error` null. |
| **DB** | No. |
| **Security** | JWT required. Env: Judge0 off. Failure “docker/judge0” → **3**. |

### COD-02 — Runtime error surfaced

| Field | Value |
|-------|--------|
| **Test ID** | COD-02 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Run invalid JS. |
| **Expected frontend** | Error panel. |
| **Expected API** | 200/400 with `error` string. |
| **DB** | No. |
| **Security** | N/A. |

### COD-03 — Evaluate uses hidden tests for score

| Field | Value |
|-------|--------|
| **Test ID** | COD-03 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (public pass, hidden fail if code only handles public) |
| **Mock** | No |
| **Workflow** | Submit code that passes public only. |
| **Expected frontend** | Score < 100%. |
| **Expected API** | `passed < total`. |
| **DB** | On assessment complete, coding points < max. |
| **Security** | Hidden cases count; leak is REG-SEC-02. |

---

## Proctoring (P0) — detection only

All Chromium + `permissions: ['camera']` + fake media. Never assert OS-level block.

### PRC-01 — Camera granted allows start

| Field | Value |
|-------|--------|
| **Test ID** | PRC-01 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | Fake camera (Playwright) |
| **Workflow** | Start assessment with camera required. |
| **Expected frontend** | Console/camera preview; session starts. |
| **Expected API** | start 200. |
| **DB** | Session IN_PROGRESS. |
| **Security** | Camera required path. Denied camera is PRC-02. |

### PRC-02 — Camera denied blocks start (if required)

| Field | Value |
|-------|--------|
| **Test ID** | PRC-02 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | Deny camera permission |
| **Workflow** | Start assessment. |
| **Expected frontend** | Cannot proceed / error. |
| **Expected API** | No session or start not called. |
| **DB** | No IN_PROGRESS. |
| **Security** | Config `cameraRequired`. If product still starts → **product bug**. |

### PRC-03 — Tab/visibility switch logged

| Field | Value |
|-------|--------|
| **Test ID** | PRC-03 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | In-session `document.dispatchEvent(visibility hidden)` / Playwright `context.setOffline` not required; use page hide API. |
| **Expected frontend** | Violation overlay count ≥ 1. |
| **Expected API** | `POST /api/assessments/session/violation/:sessionId` 200 `TAB_SWITCH`. |
| **DB** | `AssessmentViolation` row; `violationsCount` incremented. |
| **Security** | **Detected + logged**, not prevented. Opening real OS tab is **browser limitation** if automation cannot emulate. |

### PRC-04 — Fullscreen exit logged

| Field | Value |
|-------|--------|
| **Test ID** | PRC-04 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | Enter fullscreen then dispatch fullscreenchange exit. |
| **Expected frontend** | Warning; count up. |
| **Expected API** | Violation `FULLSCREEN_EXIT`. |
| **DB** | Violation persisted. |
| **Security** | Detection. Esc always possible → **class 4** if test expects lock. |

### PRC-05 — Window blur logged

| Field | Value |
|-------|--------|
| **Test ID** | PRC-05 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | Dispatch `blur` on window. |
| **Expected frontend** | Optional overlay. |
| **Expected API** | `WINDOW_BLUR` logged. |
| **DB** | Violation row. |
| **Security** | Detection only. |

### PRC-06 — Snapshot upload persists

| Field | Value |
|-------|--------|
| **Test ID** | PRC-06 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Cloudinary: stub **or** skip if no keys (then API contract with fixture JPEG) |
| **Workflow** | Trigger periodic/event screenshot path. |
| **Expected frontend** | No crash. |
| **Expected API** | `POST .../screenshot/:sessionId` 200. |
| **DB** | `AssessmentScreenshot` row. |
| **Security** | Evidence trail. Missing Cloudinary → **3**, skip with reason. |

### PRC-07 — Auto-submit at violation threshold

| Field | Value |
|-------|--------|
| **Test ID** | PRC-07 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (or config threshold 3 for e2e assessment) |
| **Mock** | Fake camera |
| **Workflow** | Emit N violations ≥ `autoSubmit.threshold` (seed config 3 to keep test short). |
| **Expected frontend** | Assessment completes. |
| **Expected API** | complete called; session not IN_PROGRESS. |
| **DB** | Session SUBMITTED/AUTO_SUBMITTED; `riskLevel` MEDIUM/HIGH per counts. |
| **Security** | Client-driven threshold; server must accept complete. If UI never submits → **product bug**. |

### PRC-08 — Session risk state

| Field | Value |
|-------|--------|
| **Test ID** | PRC-08 |
| **Module** | Proctoring |
| **Role** | Student A / Admin |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | Log ≥3 violations; admin `GET` live/proctoring session. |
| **Expected frontend** | Student result shows violation count; admin live monitor shows risk. |
| **Expected API** | Session `violationsCount`, `riskLevel` LOW if under 3 / MEDIUM if 3 or more / HIGH if 7 or more. |
| **DB** | Fields match. |
| **Security** | Admin-only proctoring GET. Student cannot fetch other session screenshots. |

---

## Interviews (P0)

### MCK-01 — Admin creates 1:1 mock for Student A

| Field | Value |
|-------|--------|
| **Test ID** | MCK-01 |
| **Module** | 1:1 mock interviews |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (student A) |
| **Mock** | No |
| **Workflow** | Create mock drive: date, start, end, duration, select Student A, publish. |
| **Expected frontend** | Drive listed; slot SCHEDULED. |
| **Expected API** | create 201. |
| **DB** | `MockInterviewDrive` + `MockInterviewSlot.studentId=A`. |
| **Security** | SEC-03 may still allow Admin A to target B — separate REG-SEC-03b. |

### MCK-02 — Student sees upcoming and joins in window

| Field | Value |
|-------|--------|
| **Test ID** | MCK-02 |
| **Module** | 1:1 mock interviews |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (in-window slot) |
| **Mock** | Fake camera/mic for precheck |
| **Workflow** | Live Mocks tab → precheck → join room route. |
| **Expected frontend** | Room loads. |
| **Expected API** | `GET /mock-interviews/my-sessions` includes slot. |
| **DB** | Slot status may become WAITING/LIVE. |
| **Security** | Own slot only. |

### MCK-03 — Join outside scheduled window rejected

| Field | Value |
|-------|--------|
| **Test ID** | MCK-03 |
| **Module** | 1:1 mock interviews |
| **Role** | Student A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (slot in the past/future outside window) |
| **Mock** | No |
| **Workflow** | Attempt join/precheck. |
| **Expected frontend** | Not joinable message. |
| **Expected API** | **403/400**. |
| **DB** | Status not LIVE. |
| **Security** | Time box. If join succeeds → **product bug**. If seed times wrong → **2**. |

### INT-01 — Interviewer valid token opens session

| Field | Value |
|-------|--------|
| **Test ID** | INT-01 |
| **Module** | Job interviews |
| **Role** | Interviewer (token) |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (session + invite) |
| **Mock** | No |
| **Workflow** | Open `/interview/session/:sessionId?token=`. |
| **Expected frontend** | Interviewer dashboard. |
| **Expected API** | `GET /api/interview/session/:id?token=` 200. |
| **DB** | Read. |
| **Security** | Token type `interviewer` + sessionId match. |

### INT-02 — Invalid interviewer token rejected

| Field | Value |
|-------|--------|
| **Test ID** | INT-02 |
| **Module** | Job interviews |
| **Role** | Anonymous |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (valid session id) |
| **Mock** | No |
| **Workflow** | Same URL with `token=invalid`. |
| **Expected frontend** | Error / no candidates. |
| **Expected API** | **401/403**. |
| **DB** | No evaluation rows. |
| **Security** | Token required (controller-level). |

### AI-01 — Guided AI listed for enrolled student only

| Field | Value |
|-------|--------|
| **Test ID** | AI-01 |
| **Module** | Guided AI interviews |
| **Role** | Student A / B |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (GUIDED enroll A only) |
| **Mock** | No |
| **Workflow** | Guided AI tab. |
| **Expected frontend** | A sees interview; B does not. |
| **Expected API** | A `GET /ai-mock-interviews/student/my-interviews` contains id; B empty. |
| **DB** | Read. |
| **Security** | Enrollment isolation. No conversational items. |

### REC-01 — Screening token page works; junk token fails

| Field | Value |
|-------|--------|
| **Test ID** | REC-01 |
| **Module** | Recruiter screening |
| **Role** | Token (no login) |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes (screening session) |
| **Mock** | No |
| **Workflow** | `/recruiter/screening?token=&jobId=` valid then invalid. |
| **Expected frontend** | Valid: candidate list. Invalid: error. |
| **Expected API** | session 200 vs 401/403. |
| **DB** | Shortlist PATCH updates screeningStatus. |
| **Security** | Capability URL; leak = **class 4/product design**. |

### DSH-01 — Admin dashboard loads scoped KPIs

| Field | Value |
|-------|--------|
| **Test ID** | DSH-01 |
| **Module** | Admin analytics |
| **Role** | Admin A |
| **Priority** | P0 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/admin` dashboard. |
| **Expected frontend** | Numbers render (not blank error). |
| **Expected API** | `GET /api/admin/dashboard` 200. |
| **DB** | Aggregates from scoped students/jobs. |
| **Security** | Counts must not include Student B. If they do → **product bug**. |

---

# P1 — Core user workflows

### AUTH-07 — Logout then stale API

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-07 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Login, copy access token, logout UI, `GET /api/auth/me` with copied token until expiry **or** expect still valid until JWT exp (document: logout may not invalidate access JWT). |
| **Expected frontend** | Logged out. |
| **Expected API** | Access JWT may still work until expiry (**product limitation** — assert documented). |
| **DB** | Refresh deleted. |
| **Security** | Refresh cannot mint new access. |

### AUTH-08 — Register duplicate email

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-08 |
| **Module** | Authentication |
| **Role** | Anonymous |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (A exists) |
| **Mock** | SMTP skip; OTP API |
| **Workflow** | Signup with `e2e.student.a@pwioi.test`. |
| **Expected frontend** | Already registered error. |
| **Expected API** | **400/409** on send-otp or register. |
| **DB** | No second user. |
| **Security** | Unique email. |

### AUTH-09 — Password reset (seeded OTP)

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-09 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Read OTP from DB (no SMTP) |
| **Workflow** | Forgot → OTP from `otps` table → new password → login. |
| **Expected frontend** | Login succeeds with new password. |
| **Expected API** | reset/verify/update 200; login 200. |
| **DB** | `passwordHash` changed. |
| **Security** | Old password fails. Env SMTP missing → **3** if UI requires inbox. |

### RBAC-07 — Recruiter can open `/admin` job tabs (current behavior)

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-07 |
| **Module** | RBAC |
| **Role** | Recruiter |
| **Priority** | P1 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Visit `/admin`. |
| **Expected frontend** | **Allowed** (route allow list). Student directory tab hidden. |
| **Expected API** | Job APIs 200; `GET /api/students` 403. |
| **DB** | No. |
| **Security** | Document current product; changing it is a product decision. |

### RBAC-08 — Super Admin `/student` bypass (SEC-06)

| Field | Value |
|-------|--------|
| **Test ID** | RBAC-08 |
| **Module** | RBAC |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Visit `/student`. |
| **Expected frontend** | **Loads** (ProtectedRoute bypass). |
| **API** | Student APIs may 403 on student-only resources. |
| **DB** | No. |
| **Security** | Confused-deputy UX. Not P0 isolation. |

### STU-01 — Onboarding complete

| Field | Value |
|-------|--------|
| **Test ID** | STU-01 |
| **Module** | Student profile |
| **Role** | Student incomplete |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/student/onboarding` fill school/center/batch/phone. |
| **Expected frontend** | Redirect `/student`. |
| **Expected API** | `PUT /api/students/profile` 200. |
| **DB** | `profileCompleted=true`. |
| **Security** | Own profile only. |

### STU-02 — Edit profile persistence

| Field | Value |
|-------|--------|
| **Test ID** | STU-02 |
| **Module** | Student profile |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Edit headline/bio; save; reload. |
| **Expected frontend** | Values persist. |
| **Expected API** | PUT 200; GET profile matches. |
| **DB** | `students.headline/bio` updated. |
| **Security** | Cannot PUT B’s id. |

### APP-07 — Withdraw application

| Field | Value |
|-------|--------|
| **Test ID** | APP-07 |
| **Module** | Applications |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (APPLIED) |
| **Mock** | No |
| **Workflow** | Withdraw in tracker. |
| **Expected frontend** | WITHDRAWN. |
| **Expected API** | `POST .../withdraw` 200. |
| **DB** | status WITHDRAWN. |
| **Security** | Own application. |

### APP-08 — Offer decline

| Field | Value |
|-------|--------|
| **Test ID** | APP-08 |
| **Module** | Applications |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (separate OFFERED app) |
| **Mock** | No |
| **Workflow** | Decline offer. |
| **Expected frontend** | OFFER_DECLINED. |
| **Expected API** | 200. |
| **DB** | status OFFER_DECLINED. |
| **Security** | Own application. |

### APP-09 — Invalid status transition

| Field | Value |
|-------|--------|
| **Test ID** | APP-09 |
| **Module** | Applications |
| **Role** | Admin A |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | PATCH illegal status (e.g. JOINED from APPLIED if disallowed). |
| **Expected API** | **400**. |
| **DB** | Unchanged. |
| **Security** | State machine. |

### ASM-07 — Descriptive pending review

| Field | Value |
|-------|--------|
| **Test ID** | ASM-07 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (DESCRIPTIVE question) |
| **Mock** | No |
| **Workflow** | Submit essay; complete. |
| **Expected frontend** | Pending review, not auto full score. |
| **Expected API** | status PENDING_REVIEW. |
| **DB** | Same. |
| **Security** | N/A. |

### ASM-08 — Join window closed

| Field | Value |
|-------|--------|
| **Test ID** | ASM-08 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (startTime in past beyond joinCloses) |
| **Mock** | No |
| **Workflow** | Start. |
| **Expected frontend** | Cannot start. |
| **Expected API** | **403**. |
| **DB** | No session. |
| **Security** | Window. |

### ASM-09 — Bulk import questions

| Field | Value |
|-------|--------|
| **Test ID** | ASM-09 |
| **Module** | Assessments |
| **Role** | Super Admin or Admin |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Upload CSV/xlsx via bulk import UI. |
| **Expected frontend** | Questions appear. |
| **Expected API** | import 200. |
| **DB** | `AssessmentQuestion` rows. |
| **Security** | ADMIN+. Unscoped = SEC-03. |

### COD-04 — Hidden cases not shown in UI

| Field | Value |
|-------|--------|
| **Test ID** | COD-04 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Open coding question. |
| **Expected frontend** | Only public examples/tests visible. |
| **Expected API** | UI must not render hidden expected (even if API leaks). |
| **DB** | No. |
| **Security** | Defense in depth vs REG-SEC-02. |

### COD-05 — Run rate limit

| Field | Value |
|-------|--------|
| **Test ID** | COD-05 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | 9× `POST /api/code/run` in 10s. |
| **Expected API** | Last **429** “Too many run requests”. |
| **DB** | No. |
| **Security** | Abuse. Multi-instance in-memory limit → **3** if scaled. |

### PRC-09 — Paste attempt logged

| Field | Value |
|-------|--------|
| **Test ID** | PRC-09 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | Dispatch paste on editor. |
| **Expected frontend** | Optional toast. |
| **Expected API** | `PASTE_ATTEMPT` 200. |
| **DB** | Violation row. |
| **Security** | Logged. OS paste may still work → **4**. |

### MCK-04 — Admin slot results after complete

| Field | Value |
|-------|--------|
| **Test ID** | MCK-04 |
| **Module** | 1:1 mock interviews |
| **Role** | Admin / Student |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (COMPLETED slot + feedback) |
| **Mock** | No |
| **Workflow** | Student results page; admin results. |
| **Expected frontend** | Scores/remarks. |
| **Expected API** | 200. |
| **DB** | Feedback row. |
| **Security** | A cannot see B results. |

### AI-02 — Student starts guided interview

| Field | Value |
|-------|--------|
| **Test ID** | AI-02 |
| **Module** | Guided AI |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | Fake camera; skip real STT (Mistral stub) |
| **Workflow** | Open `/student/interviews/:id` start. |
| **Expected frontend** | Question 1; timer. |
| **Expected API** | start/progress 200. |
| **DB** | Enrollment IN_PROGRESS. |
| **Security** | Own enrollment. |

### AI-03 — Student result after complete

| Field | Value |
|-------|--------|
| **Test ID** | AI-03 |
| **Module** | Guided AI |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (completed enrollment or complete with stub video) |
| **Mock** | Transcription/insights **stub** |
| **Workflow** | `/student/ai-interview/results/:enrollmentId`. |
| **Expected frontend** | Result body; not conversational mode. |
| **Expected API** | 200. |
| **DB** | Answers submittedAt set. |
| **Security** | B 403. |

### AI-04 — Admin review

| Field | Value |
|-------|--------|
| **Test ID** | AI-04 |
| **Module** | Guided AI |
| **Role** | Admin / Super Admin |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/admin/mock-interviews/:id/review`. |
| **Expected frontend** | Review UI. |
| **Expected API** | 200. |
| **DB** | Read. |
| **Security** | Unscoped = REG-SEC-03c. |

### RSV-01 — Resume builder PDF

| Field | Value |
|-------|--------|
| **Test ID** | RSV-01 |
| **Module** | Resume |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | UI |
| **Seed** | Yes (profile filled) |
| **Mock** | No Cloudinary |
| **Workflow** | Resume tab → download PDF. |
| **Expected frontend** | Download starts / blob. |
| **Expected API** | Optional generate endpoint 200. |
| **DB** | No required. |
| **Security** | Own data. |

### RSV-02 — ATS analysis score shown

| Field | Value |
|-------|--------|
| **Test ID** | RSV-02 |
| **Module** | ATS |
| **Role** | Student A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | **Yes** — stub Mistral/Gemini **or** allow heuristic fallback |
| **Workflow** | Run ATS analysis. |
| **Expected frontend** | Numeric score. |
| **Expected API** | 200 with score. |
| **DB** | `primaryResumeAtsScore` may update. |
| **Security** | Own resume. Real AI timeout → **3**. |

### ATS-01 — Admin ATS list scoped

| Field | Value |
|-------|--------|
| **Test ID** | ATS-01 |
| **Module** | ATS |
| **Role** | Admin A |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/admin/resume-ats`. |
| **Expected API** | A present; B absent. |
| **DB** | Read. |
| **Security** | Scoped (audit: this surface **is** scoped). |

### DSH-02 — Control Tower loads

| Field | Value |
|-------|--------|
| **Test ID** | DSH-02 |
| **Module** | Admin analytics |
| **Role** | Admin A |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Dashboard Control Tower tabs. |
| **Expected frontend** | Job opportunities / students / career services. |
| **Expected API** | `GET /api/admin/control-tower/all` 200. |
| **DB** | Read scoped. |
| **Security** | B’s jobs/students excluded. |

### DSH-03 — Super Admin stats

| Field | Value |
|-------|--------|
| **Test ID** | DSH-03 |
| **Module** | Super Admin analytics |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/super-admin?tab=superAdminStats`. |
| **Expected frontend** | Institution KPIs. |
| **Expected API** | `/api/super-admin/stats/summary` 200. |
| **DB** | Aggregates A+B. |
| **Security** | SUPER_ADMIN only; Admin A **403**. |

### DSH-04 — Super Admin analytics funnel

| Field | Value |
|-------|--------|
| **Test ID** | DSH-04 |
| **Module** | Super Admin analytics |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/super-admin/analytics/funnel`. |
| **Expected API** | 200 JSON; numbers ≥ 0; include both campuses. |
| **DB** | Read. |
| **Security** | 403 for Admin A. |

### CMS-01 — Publish STATS appears on landing

| Field | Value |
|-------|--------|
| **Test ID** | CMS-01 |
| **Module** | CMS |
| **Role** | Super Admin + Public |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Publish STATS with unique value e.g. `E2E_STAT_99`. Open `/`. |
| **Expected frontend** | Stats section shows E2E_STAT_99 **if** `stats.jsx` consumes CMS (audit: it does for STATS). |
| **Expected API** | `GET /api/cms/public/landing` includes section. |
| **DB** | `status=PUBLISHED`. |
| **Security** | Public read published only. |

### CMS-02 — Unpublished not on public landing

| Field | Value |
|-------|--------|
| **Test ID** | CMS-02 |
| **Module** | CMS |
| **Role** | Public |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes (DRAFT section unique string) |
| **Mock** | No |
| **Workflow** | GET public landing; view `/`. |
| **Expected frontend** | Draft string absent. |
| **Expected API** | Draft omitted. |
| **DB** | DRAFT row remains. |
| **Security** | No unpublished leak. |

### SRCH-01 — Super Admin search students

| Field | Value |
|-------|--------|
| **Test ID** | SRCH-01 |
| **Module** | Search |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/search?q=e2e.student.a&types=STUDENT`. |
| **Expected API** | 200 hit A. |
| **DB** | Read. |
| **Security** | Allowed for SA. Recruiter = REG-SEC-04. |

### SRCH-02 — Empty / special characters

| Field | Value |
|-------|--------|
| **Test ID** | SRCH-02 |
| **Module** | Search |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `q=` and `q=%27%20OR%201=1`. |
| **Expected API** | 200 empty or safe results; **not** 500. |
| **DB** | No injection write. |
| **Security** | Query safety. |

### AUD-01 — Super Admin reads audit logs after login

| Field | Value |
|-------|--------|
| **Test ID** | AUD-01 |
| **Module** | Audit logs |
| **Role** | Super Admin |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | SA login; open audit logs tab. |
| **Expected frontend** | Table loads. |
| **Expected API** | `GET /api/admin/audit-logs` 200. |
| **DB** | Login action may exist (`auditLogger`). If missing row → **product gap** not test bug. |
| **Security** | Admin A 403 (RBAC-04 analog). |

### REC-02 — Recruiter dashboard

| Field | Value |
|-------|--------|
| **Test ID** | REC-02 |
| **Module** | Recruiter |
| **Role** | Recruiter |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/recruiter` dashboard. |
| **Expected frontend** | Stats cards. |
| **Expected API** | `GET /api/recruiters/dashboard-stats` 200. |
| **DB** | Read. |
| **Security** | Own company stats. |

### REC-03 — Recruiter creates job

| Field | Value |
|-------|--------|
| **Test ID** | REC-03 |
| **Module** | Recruiter / Jobs |
| **Role** | Recruiter |
| **Priority** | P1 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Create job from recruiter or `/admin` createJob tab. |
| **Expected frontend** | Job in postings. |
| **Expected API** | POST 201. |
| **DB** | Job `recruiterId` set. |
| **Security** | PENDING recruiter should fail (REC-04). |

### INT-03 — Legacy interview API 410

| Field | Value |
|-------|--------|
| **Test ID** | INT-03 |
| **Module** | Job interviews |
| **Role** | Admin A |
| **Priority** | P1 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `GET /api/admin/interview/...` |
| **Expected API** | **410**. |
| **DB** | No. |
| **Security** | Retired surface. |

---

# P2 — Secondary workflows

### AUTH-10 — Refresh token rotation path

| Field | Value |
|-------|--------|
| **Test ID** | AUTH-10 |
| **Module** | Authentication |
| **Role** | Student A |
| **Priority** | P2 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `POST /api/auth/refresh` with valid refresh. |
| **Expected API** | 200 new accessToken. |
| **DB** | Refresh row still valid unless rotated (assert actual). |
| **Security** | Invalid refresh 401. |

### STU-03 — Raise query

| Field | Value |
|-------|--------|
| **Test ID** | STU-03 |
| **Module** | Student |
| **Role** | Student A |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | SMTP skip |
| **Workflow** | Raise Query tab submit. |
| **Expected frontend** | Success. |
| **Expected API** | `POST /api/queries` 201. |
| **DB** | `student_queries` row. |
| **Security** | Own userId. |

### STU-04 — Public profile

| Field | Value |
|-------|--------|
| **Test ID** | STU-04 |
| **Module** | Student |
| **Role** | Public |
| **Priority** | P2 |
| **Type** | UI |
| **Seed** | Yes (`publicProfileId`) |
| **Mock** | No |
| **Workflow** | `/profile/:id`. |
| **Expected frontend** | Name; email per flags. |
| **Expected API** | Public GET 200. |
| **DB** | Read. |
| **Security** | No admin-only fields. |

### JOB-03 — Duplicate company handling

| Field | Value |
|-------|--------|
| **Test ID** | JOB-03 |
| **Module** | Jobs |
| **Role** | Admin A |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes (company exists) |
| **Mock** | No |
| **Workflow** | Create job selecting existing company name. |
| **Expected frontend** | Links existing company, not silent duplicate **or** unique constraint error. |
| **Expected API** | 201 with same `companyId` **or** 409. |
| **DB** | Still one company name unique. |
| **Security** | N/A. |

### ASM-10 — SQL question not auto-scored

| Field | Value |
|-------|--------|
| **Test ID** | ASM-10 |
| **Module** | Assessments |
| **Role** | Student A |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes (SQL question) |
| **Mock** | No |
| **Workflow** | Answer SQL; complete. |
| **Expected frontend** | No full auto-score for SQL. |
| **Expected API** | SQL not in MCQ/coding grade branches. |
| **DB** | Score excludes SQL auto points. |
| **Security** | N/A. **Product gap** DATA-02. |

### COD-06 — Unsupported language

| Field | Value |
|-------|--------|
| **Test ID** | COD-06 |
| **Module** | Coding |
| **Role** | Student A |
| **Priority** | P2 |
| **Type** | API |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `POST /code/run` language `ruby`. |
| **Expected API** | error Unsupported language. |
| **DB** | No. |
| **Security** | N/A. |

### MCK-05 — Code console slot access denied for B

| Field | Value |
|-------|--------|
| **Test ID** | MCK-05 |
| **Module** | 1:1 mock / coding |
| **Role** | Student B |
| **Priority** | P2 |
| **Type** | API |
| **Seed** | Yes (`enableCodeConsole`, A’s slot) |
| **Mock** | No |
| **Workflow** | Live-code API as B. |
| **Expected API** | **403**. |
| **DB** | No. |
| **Security** | Isolation. |

### RSV-03 — Optimize suggestions (stubbed AI)

| Field | Value |
|-------|--------|
| **Test ID** | RSV-03 |
| **Module** | Resume / ATS |
| **Role** | Student A |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | **Yes** Mistral |
| **Workflow** | Optimize against a job. |
| **Expected frontend** | Apply suggestions updates summary. |
| **Expected API** | 200. |
| **DB** | Profile fields updated if applied. |
| **Security** | Own data. |

### CMS-03 — Landing FAQs still hardcoded

| Field | Value |
|-------|--------|
| **Test ID** | CMS-03 |
| **Module** | CMS |
| **Role** | Super Admin + Public |
| **Priority** | P2 |
| **Type** | UI |
| **Seed** | Yes (publish FAQ CMS key) |
| **Mock** | No |
| **Workflow** | Publish unique FAQ via CMS; open `/`. |
| **Expected frontend** | **May not appear** (`FAQs.jsx` hardcoded) — assert **current** behavior. |
| **Expected API** | Public landing includes FAQ section. |
| **DB** | Published. |
| **Security** | N/A. Partial CMS = **product gap**. |

### SRCH-03 — No global search nav

| Field | Value |
|-------|--------|
| **Test ID** | SRCH-03 |
| **Module** | Search |
| **Role** | Admin A |
| **Priority** | P2 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Inspect admin sidebar. |
| **Expected frontend** | No Global Search item (`tab=globalSearch` aliases dashboard). |
| **API** | N/A. |
| **DB** | No. |
| **Security** | UI absent; API still REG-SEC-04. |

### REC-04 — Pending recruiter cannot post

| Field | Value |
|-------|--------|
| **Test ID** | REC-04 |
| **Module** | Recruiter |
| **Role** | Recruiter pending |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Login / POST job. |
| **Expected frontend** | Pending message. |
| **Expected API** | **403**. |
| **DB** | No job. |
| **Security** | ACTIVE required. |

### REC-05 — Recruiter analytics

| Field | Value |
|-------|--------|
| **Test ID** | REC-05 |
| **Module** | Recruiter |
| **Role** | Recruiter |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Analytics tab. |
| **Expected frontend** | Charts; filters may not apply (audit). |
| **Expected API** | `company-analytics` 200. |
| **DB** | Read. |
| **Security** | Company-scoped. |

### ERR-01 — Missing job fields

| Field | Value |
|-------|--------|
| **Test ID** | ERR-01 |
| **Module** | Jobs / validation |
| **Role** | Admin A |
| **Priority** | P2 |
| **Type** | Combined |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | POST job empty title. |
| **Expected frontend** | Validation errors. |
| **Expected API** | **400**. |
| **DB** | No job. |
| **Security** | N/A. |

---

# P3 — UI / edge-case coverage

### UI-01 — Diagnostic hold copy on unauthorized route

| Field | Value |
|-------|--------|
| **Test ID** | UI-01 |
| **Module** | RBAC UI |
| **Role** | Student A |
| **Priority** | P3 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | Open `/admin`; wait under 5 seconds. |
| **Expected frontend** | “Diagnostic Hold” visible. |
| **API** | N/A. |
| **DB** | No. |
| **Security** | N/A. |

### UI-02 — SuperAdminDashboard unused

| Field | Value |
|-------|--------|
| **Test ID** | UI-02 |
| **Module** | Super Admin |
| **Role** | Super Admin |
| **Priority** | P3 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | No |
| **Workflow** | `/super-admin` uses AdminDashboard (create job etc. present). |
| **Expected frontend** | Same shell as admin + extra tabs. Not a separate SuperAdminDashboard tree. |
| **API** | N/A. |
| **DB** | No. |
| **Security** | N/A. |

### UI-03 — Hardcoded landing stats fallback

| Field | Value |
|-------|--------|
| **Test ID** | UI-03 |
| **Module** | CMS / Landing |
| **Role** | Public |
| **Priority** | P3 |
| **Type** | UI |
| **Seed** | Empty STATS CMS |
| **Mock** | No |
| **Workflow** | Open `/` with no STATS section. |
| **Expected frontend** | DEFAULT_STATS (e.g. 92% / ₹45 LPA) — **hardcoded**. |
| **API** | Landing empty STATS. |
| **DB** | No. |
| **Security** | Misleading marketing numbers — product gap. |

### UI-04 — Network failure toast (optional)

| Field | Value |
|-------|--------|
| **Test ID** | UI-04 |
| **Module** | Error states |
| **Role** | Student A |
| **Priority** | P3 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | Route abort / backend down |
| **Workflow** | Open jobs with API blocked. |
| **Expected frontend** | Error/empty, not infinite spinner only. |
| **API** | Failed fetch. |
| **DB** | No. |
| **Security** | N/A. Class **3** if backend not started. |

### PRC-10 — Do not assert DevTools blocked

| Field | Value |
|-------|--------|
| **Test ID** | PRC-10 |
| **Module** | Proctoring |
| **Role** | Student A |
| **Priority** | P3 |
| **Type** | UI |
| **Seed** | Yes |
| **Mock** | Fake camera |
| **Workflow** | Documentation test: **no assertion** that DevTools cannot open. Optionally dispatch `DEVTOOLS_SHORTCUT` and expect **log**. |
| **Expected frontend** | Shortcut may log. |
| **Expected API** | Optional violation. |
| **DB** | Optional. |
| **Security** | **Expected browser limitation.** Opening DevTools is **class 4**, never a product fail. |

---

# Counts

| Priority | Test IDs | Count |
|----------|----------|-------|
| **P0** | REG-SEC-01, 02, 03a–d, 04, 05, 07 (9); REG-DATA-05a/b (2); AUTH-01–06 (6); RBAC-01–06 (6); SCOPE-01–03 (3); ISO-01–03 (3); JOB-01–02 (2); APP-01–06 (6); ASM-01–06 (6); COD-01–03 (3); PRC-01–08 (8); MCK-01–03 (3); INT-01–02 (2); AI-01 (1); REC-01 (1); DSH-01 (1) | **62** |
| **P1** | AUTH-07–09 (3); RBAC-07–08 (2); STU-01–02 (2); APP-07–09 (3); ASM-07–09 (3); COD-04–05 (2); PRC-09 (1); MCK-04 (1); AI-02–04 (3); RSV-01–02 (2); ATS-01 (1); DSH-02–04 (3); CMS-01–02 (2); SRCH-01–02 (2); AUD-01 (1); REC-02–03 (2); INT-03 (1) | **34** |
| **P2** | AUTH-10; STU-03–04; JOB-03; ASM-10; COD-06; MCK-05; RSV-03; CMS-03; SRCH-03; REC-04–05; ERR-01 | **13** |
| **P3** | UI-01–04; PRC-10 | **5** |
| **Total** | | **114** |

### Critical security tests (must ship in first implementation slice)

REG-SEC-01, REG-SEC-02, REG-SEC-03a, REG-SEC-03b, REG-SEC-03c, REG-SEC-03d, REG-SEC-04, REG-SEC-05, REG-SEC-07, REG-DATA-05a, REG-DATA-05b, AUTH-06, RBAC-02, RBAC-03, SCOPE-01, ISO-01, ISO-02, ISO-03, ASM-02, INT-02, REC-01 (invalid token).

---

# Recommended implementation order (Phase 4, after approval)

1. Harness: Playwright, `e2e.db`, seeder, `storageState` per role, API helper.  
2. **AUTH-01, AUTH-05, RBAC-01–03** (prove env).  
3. **All REG-SEC-*** and **REG-DATA-05*** (`@known-bug` only where current insecure behavior is confirmed).  
4. **SCOPE-01–03, ISO-01–03**.  
5. **JOB/APP P0**.  
6. **ASM/COD P0**.  
7. **PRC-01–08** (Chromium fake camera).  
8. **MCK/INT/AI/REC P0**.  
9. **DSH-01**.  
10. Remaining P1 → P2 → P3.

---

# Phase 4 will create (not now)

Playwright config, `e2e/fixtures`, specs named by Test ID, npm scripts.  
**Will not** fix SEC/DATA in application code unless a separate ticket is approved.

**STOP.** Awaiting review/approval of this matrix before any test implementation.
