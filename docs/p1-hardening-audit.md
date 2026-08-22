# P1 Hardening & Production Readiness Audit

**Project:** PWIOI Placement Portal (`Portal-main`)  
**Date:** 2026-08-19  
**Phase:** 2 — Audit only (no P1 fixes implemented)  
**Sources:** Code trace, `docs/e2e-test-audit.md`, `docs/e2e-test-plan.md`, `docs/p0-security-fix-report.md`, `e2e/specs/*`

---

## Executive Summary

P0 security fixes from the prior phase **remain in place and are verified by a full E2E run (114 passed, 1 skipped)** plus targeted code tracing. Assessment authorization, answer sanitization, hidden-test redaction, admin scope on list endpoints, recruiter search restrictions, placement AI auth, empty-scope blocking, session ownership, double-completion rejection, logout invalidation, and job-create null handling are **working as intended**.

**The application is not production-ready.** Remaining blockers are concentrated in:

1. **Direct-ID / IDOR gaps** on admin and recruiter endpoints (applications, readiness, assessment proctoring/results, resume tokens).
2. **`requireActive` not wired** — PENDING recruiters/admins can call protected job (and other) APIs after login.
3. **Application state machine not enforced** — `JOINED` from `APPLIED` is allowed (APP-09 confirmed bug).
4. **Partial admin scope** on job-opportunities, recruiters directory, announcements, and several assessment admin detail routes.
5. **Deployment hygiene** — secrets in `docker-compose.yml`, JWT fallbacks in code, no CI pipeline, E2E runs on SQLite not Postgres.
6. **CMS/product gaps** — hardcoded landing FAQs and default placement statistics when CMS STATS is empty.

**Recommendation:** Fix critical IDOR and pending-user enforcement before any production deployment. Defer CMS UX and global-search UI gaps to P2 unless marketing/compliance requires CMS-driven public content.

---

## P0 Regression Verification

### Automated runs (executed 2026-08-19)

| Check | Command / method | Result |
|-------|------------------|--------|
| Playwright E2E | `npx playwright test` | **114 passed, 1 skipped** (PRC-06 Cloudinary) — 115 tests total |
| Jest backend | `cd backend && npm test` | **8/8 passed** |
| Frontend build | `cd frontend && npm run build` | **Success** |
| Backend health | `GET /health` (E2E env, port 3100) | **200** `{"status":"ok",...}` |

### P0 item code-trace + E2E mapping

| P0 item | Code verified | E2E coverage | Status |
|---------|---------------|--------------|--------|
| Assessment assignment auth | `assessmentStudentDto.js`, `getAssessmentDetails`, `startSession` | REG-SEC-01/01b, ASM-01/02 | **PASS** |
| Answer leak removed | `sanitizeAssessmentForStudent`, `STUDENT_QUESTION_OMIT` | REG-SEC-01/01b, COD-04 | **PASS** |
| Hidden test leak removed | `evaluateTestCases({ redactHidden: true })` | REG-SEC-02, COD-03 | **PASS** |
| Admin scope (lists) | `adminResourceScope.js` in assessments/mocks/AI/scheduling/search/queries | REG-SEC-03a–d, SCOPE-* | **PASS** |
| Recruiter search restricted | `filterSearchTypesForRole` → 403 | REG-SEC-04 | **PASS** |
| Placement AI auth | `placement.js` `authenticate` + `authorize(['STUDENT'])` | REG-SEC-05 | **PASS** |
| Empty admin scope blocks | `adminScope.js` SEC-07, `students.js` BLOCK_ALL | REG-SEC-07 | **PASS** |
| Session ownership | `completeAssessment` studentId check | ISO-02 | **PASS** |
| Double completion rejected | `updateMany` + 409 | REG-DATA-05b | **PASS** |
| Duplicate application rejected | P2002 → 409 | REG-DATA-05a | **PASS** |
| SUPER_ADMIN route guard | `ProtectedRoute.jsx` no bypass | RBAC-08 | **PASS** |
| Logout invalidates session | `invalidateUserSession`, `sessionVersion` all roles | AUTH-07 | **PASS** |
| `linkedAssessmentId` null on create | Conditional omit in `createJob` | JOB-02, REC-03, JOB-03 | **PASS** |
| SQL/CASE not auto-scored | `REVIEW_TYPES` → `PENDING_REVIEW` | ASM-10 | **PASS** |

### P0 minor gap (not a regression; create path fixed)

| ID | Finding |
|----|---------|
| P0-GAP-01 | `updateJob` in `jobs.js` can still set `linkedAssessmentId: null` explicitly (Prisma shape risk on update, not create). No E2E covers update-with-null. |

**No P0 regressions require stopping P1 work.** Proceed with documented P1 findings below.

---

## Critical Findings

| ID | Severity | Module | Current behavior | Expected | Root cause | Endpoint / file |
|----|----------|--------|------------------|----------|------------|-----------------|
| **P1-SCOPE-01** | **Critical** | Applications | Admin/recruiter can `PATCH /applications/:id/status` for any application ID | Scope or ownership check before mutate | No admin-scope merge in `updateApplicationStatus` | `applications.js`, `routes/applications.js` |
| **P1-SCOPE-02** | **Critical** | Applications / Resume | `GET /applications/:id/resume-view-url` issues signed token for any application | Only scoped admin or owning recruiter | No scope check in `getResumeViewUrl` | `applications.js` |
| **P1-SCOPE-03** | **Critical** | Readiness | `GET /admin/readiness/students/:studentId` returns full readiness for any student UUID | Admin A cannot read Student B | Service queries by ID only; no `getAdminScopeFilter` | `placementReadinessService.js`, `adminReadiness.js` |
| **P1-RBAC-01** | **High** | Jobs / Auth | PENDING recruiter can `POST /jobs` (and other job routes) | 403 until ACTIVE | `requireActive` defined but **never mounted** on routes | `middleware/roles.js`, `routes/jobs.js` |
| **P1-APP-01** | **High** | Applications | `JOINED` accepted from `APPLIED` via status PATCH | Rejected invalid transition | `validateApplicationStateTransition` returns `true` for almost all transitions | `applicationIntegrity.js` |

---

## P1 Findings

### A. Authentication / Session Security

| ID | Severity | Current | Expected | Root cause | E2E | Status |
|----|----------|---------|----------|------------|-----|--------|
| P1-AUTH-01 | High | PENDING users authenticate and call APIs | Block or limit pending accounts | No `PENDING` check in `authenticate`; `requireActive` unused | REC-04 (known-bug path) | Open |
| P1-AUTH-02 | Medium | Password reset updates hash only | Invalidate existing sessions/tokens | `update-password` does not call `invalidateUserSession` | AUTH-09 (reset flow only) | Open |
| P1-AUTH-03 | Low | Auth errors return generic messages | No credential enumeration | Generally OK; login returns "Invalid credentials" | AUTH-02 | Pass |
| P1-AUTH-04 | Pass | BLOCKED users get 403 at login | Blocked | `authenticate` checks `BLOCKED` | AUTH-03 | Pass |
| P1-AUTH-05 | Pass | Refresh returns new access token with current sessionVersion | Valid rotation | `auth.js` reloads user before `generateAccessToken` | AUTH-10 | Pass |
| P1-AUTH-06 | Pass | Logout bumps sessionVersion + deletes refresh tokens | Immediate invalidation | `invalidateUserSession` | AUTH-07 | Pass |
| P1-AUTH-07 | Pass | Student single-device via sessionVersion | Superseded token rejected | `establishStudentSession` | AUTH-06 | Pass |
| P1-AUTH-08 | Medium | Non-student roles share sessionVersion on logout but not on every login bump | Consistent policy | Only students bump version on login | — | Open (design) |

### B. RBAC (route matrix — representative)

Legend: ✅ allowed · ❌ denied by role · ⚠️ allowed but scope/IDOR gap · 🔒 SUPER_ADMIN only

| Route group | Student | Recruiter | Admin | Super Admin | Scope enforced? |
|-------------|---------|-----------|-------|-------------|-----------------|
| `GET /students` | ❌ | ❌ | ✅ scoped | ✅ | Yes |
| `POST /jobs` | ❌ | ⚠️ PENDING ok | ✅ | ✅ | No `requireActive` |
| `GET /jobs/targeted` | ✅ | ❌ | ❌ | ❌ | Targeting logic |
| `PATCH /applications/:id/status` | ❌ | ⚠️ any ID | ⚠️ any ID | ✅ | **No IDOR check** |
| `GET /assessments/details/:id` | ✅ assigned | ❌ | ✅ scoped | ✅ | Yes (student + admin) |
| `GET /assessments/results/:sessionId` | ❌ | ❌ | ⚠️ any session | ✅ | **No scope** |
| `GET /assessments/session/proctoring/:sessionId` | ❌ | ❌ | ⚠️ any session | ✅ | **No scope** |
| `GET /admin/readiness/students/:id` | ❌ | ❌ | ⚠️ any student | ✅ | **No scope** |
| `GET /search` (STUDENT types) | ❌ | ❌ | ✅ scoped | ✅ | Yes (post-P0) |
| `POST /placement/ai` | ✅ | ❌ | ❌ | ❌ | Auth + role |
| `POST /cms/*` mutate | ❌ | ❌ | ❌ | 🔒 | Role only |
| `GET /super-admin/stats` | ❌ | ❌ | ❌ | ✅ | N/A |

**P1-RBAC-02:** Recruiter can open admin job UI tabs (RBAC-07) — UI concern; API still role-gated on mutations.  
**P1-RBAC-03:** `authorize()` grants SUPER_ADMIN bypass in backend middleware (intentional for super-admin APIs).

### C. Admin Scope (remaining gaps)

| ID | Resource | List scoped? | Direct-ID scoped? | File |
|----|----------|--------------|-------------------|------|
| P1-SCOPE-04 | Assessment leaderboard `/dashboard/:id` | List yes | **No** — any assessment UUID | `assessment.js` `getAssessmentResults` |
| P1-SCOPE-05 | Session results `/results/:sessionId` | — | **No** | `getSessionResults` |
| P1-SCOPE-06 | Proctoring `/session/proctoring/:sessionId` | — | **No** | `getProctoringSessionDetails` |
| P1-SCOPE-07 | Job opportunities pipeline | **No** | N/A | `jobOpportunitiesPipeline.js` |
| P1-SCOPE-08 | Recruiters directory | **No** | Email param unscoped | `recruiters.js` |
| P1-SCOPE-09 | Announcements create | **No** — can target out-of-scope students | N/A | `announcements.js` |
| P1-SCOPE-10 | Admin readiness | **No** on list/detail | **No** on `:studentId` | `placementReadinessService.js` |
| — | Control Tower | Yes | Yes | Pass (DSH-02) |
| — | Resume ATS | Yes | — | Pass (ATS-01) |
| — | Placements registry | Yes | Partial on patch | Partial |
| — | Students / applications lists | Yes | Partial | Pass SCOPE-01/02 |

### D. Application Integrity

| ID | Finding | Determination |
|----|---------|---------------|
| P1-APP-01 | JOINED from APPLIED allowed | **Implementation bug** — transition validator is a no-op |
| P1-APP-02 | Revoked / withdrawn protection | **Pass** — throws in `validateApplicationStateTransition` |
| P1-APP-03 | Duplicate apply | **Pass** — unique constraint + 409 (REG-DATA-05a) |
| P1-APP-04 | Cross-student application PATCH | **Not tested** — likely blocked by missing student role on endpoint |
| P1-APP-05 | Concurrent apply race | Partial — DB unique constraint is backstop; no transaction |

### E. Jobs

| ID | Finding | E2E |
|----|---------|-----|
| P1-JOB-01 | REC-04: `requireActive` not on job routes | REC-04 (documents bug if 201) |
| P1-JOB-02 | Job create returns `{ data: job }` wrapper — tests adapted | JOB-02 pass |
| P1-JOB-03 | Admin scope on job list uses name `contains` on targets — UUID fields secondary | JOB-01 pass |
| P1-JOB-04 | `updateJob` null `linkedAssessmentId` edge case | Missing test |

### F. Assessments

| ID | Finding |
|----|---------|
| P1-ASM-01 | Assignment + sanitization enforced (P0) — **Pass** |
| P1-ASM-02 | No server-side **autosave** endpoint found — answers only on complete |
| P1-ASM-03 | Timer expiry auto-complete tested (ASM-05) |
| P1-ASM-04 | Admin direct access to proctoring/results by session ID without scope — **Fail** (see P1-SCOPE-04–06) |
| P1-ASM-05 | SQL/CASE/PROGRAMMING_CHALLENGE → PENDING_REVIEW — **Pass** (ASM-10) |
| P1-ASM-06 | Client cannot forge score on complete — server grades MCQ/CODING — **Pass** |

### G. Coding Security

| ID | Finding | E2E |
|----|---------|-----|
| P1-CODE-01 | Auth required on `/code/run` and `/code/evaluate` | COD-* |
| P1-CODE-02 | Hidden output redaction | REG-SEC-02 |
| P1-CODE-03 | In-memory rate limit 8/10s per user | COD-05 |
| P1-CODE-04 | Local runners + optional Judge0; timeout 3s default | COD-01/02/06 |
| P1-CODE-05 | No authorization beyond authenticated user — any student can evaluate arbitrary test cases (by design for practice) | — |

### H. Proctoring

| ID | Finding | E2E |
|----|---------|-----|
| P1-PRC-01 | Violations require session ownership | PRC-03–05, PRC-09 |
| P1-PRC-02 | Screenshot upload requires ownership | PRC-06 skip |
| P1-PRC-03 | Admin proctoring detail has no admin scope | Not covered |
| P1-PRC-04 | DevTools not blocked (documented browser limit) | PRC-10 |

### I. Mock Interviews

| ID | Finding | E2E |
|----|---------|-----|
| P1-MCK-01 | Slot ownership for live-code/results | ISO-03, MCK-05 |
| P1-MCK-02 | Outside window rejection | MCK-03 |
| P1-MCK-03 | Admin mock list scoped | REG-SEC-03b |

### J. AI Interviews

| ID | Finding | E2E |
|----|---------|-----|
| P1-AI-01 | Enrollment-scoped listing for student | AI-01 |
| P1-AI-02 | Admin list scoped | REG-SEC-03c |
| P1-AI-03 | Conversational mode excluded from lists | By design |
| P1-AI-04 | Cross-student enrollment access by ID | Not E2E tested |

### K. Resume / ATS

| ID | Finding | E2E |
|----|---------|-----|
| P1-RSV-01 | Student resume routes require auth | RSV-01/02 |
| P1-RSV-02 | Admin ATS list scoped | ATS-01 |
| P1-RSV-03 | Resume view token via application ID — IDOR if application ID leaked | Not tested |

### L. CMS

| ID | Finding | Determination |
|----|---------|---------------|
| P1-CMS-01 | Landing FAQs hardcoded in `FAQs.jsx`; CMS FAQ not rendered | **Incomplete CMS implementation** (product gap) |
| P1-CMS-02 | `DEFAULT_STATS` (92%, ₹45 LPA, etc.) shown when CMS STATS empty | **Misleading fallback** — E2E UI-03 documents |
| P1-CMS-03 | Draft CMS omitted from public | CMS-02 pass |
| P1-CMS-04 | Admin cannot mutate CMS | RBAC-05 pass |

### M. Search

| ID | Finding | E2E |
|----|---------|-----|
| P1-SEARCH-01 | Recruiter forbidden types → 403 | REG-SEC-04 |
| P1-SEARCH-02 | Admin student search scoped | SRCH-01 (super admin); scoped admin not explicit |
| P1-SEARCH-03 | **No global search UI** in product nav | SRCH-03 documents backend-only search |

### N. Dashboards / Analytics

| ID | Finding | E2E |
|----|---------|-----|
| P1-DSH-01 | Admin dashboard KPIs scoped | DSH-01 |
| P1-DSH-02 | Control Tower scoped | DSH-02 |
| P1-DSH-03 | Super-admin analytics SUPER_ADMIN-only | DSH-04 |
| P1-DSH-04 | Frontend admin dashboard cache fallback on error may show stale empty chart shells | Not tested |
| P1-DSH-05 | Control Tower program filter falls back to static SOT/SOM if no School rows | Edge case |

### O. Database / Data Integrity

| Constraint / area | Status |
|-------------------|--------|
| `Application @@unique([studentId, jobId])` | Present — backs duplicate apply |
| `AssessmentSession @@unique([assessmentId, studentId])` | Present |
| Double complete | Guarded by conditional update (P0) |
| Assessment autosave | **Not implemented** |
| Orphan proctoring screenshots | Cloudinary + DB; cleanup on assessment delete exists |

### P. Error Handling

| ID | Finding |
|----|---------|
| P1-ERR-01 | Development mode may expose stack/details on 500 (`createJob`, others) |
| P1-ERR-02 | Prisma errors mapped to 400/409 in some paths; inconsistent globally |
| P1-ERR-03 | ERR-01 E2E covers missing job fields → 400 |

### Q. External Services

| Service | Required for P0 E2E | Failure behavior | E2E tested | Prod config |
|---------|---------------------|------------------|------------|-------------|
| SQLite (E2E) / Postgres (prod) | Yes | E2E uses file DB | Yes | `.env` / `DATABASE_URL` |
| Cloudinary | Optional | 500 on upload if missing | PRC-06 skipped | `CLOUDINARY_*` |
| SMTP / email worker | Optional | Throws or worker skip | AUTH-09 (OTP from DB) | `SMTP_*` or worker URL |
| Google OAuth | Optional | Redirect errors | Not E2E | `GOOGLE_*` |
| Google AI (placement) | Optional | Fallback content | RSV-03 stub path | `GOOGLE_AI_*` |
| Mistral / Gemini (ATS) | Optional | Fallback strings | Partial | API keys |
| Judge0 | Optional | Local runners fallback | COD-* local | `JUDGE0_*` |
| Redis | Optional | Workers disabled | Not E2E | `REDIS_URL` |

### R. Environment / Deployment

| ID | Finding | Severity |
|----|---------|----------|
| P1-DEPLOY-01 | Literal secrets in `docker-compose.yml` (JWT, DB, API keys) | **Critical** for prod |
| P1-DEPLOY-02 | `SUPER_ADMIN_EMAIL` fallback hardcoded in `auth.js` | High |
| P1-DEPLOY-03 | JWT_SECRET fallbacks in `applications.js`, `interviewScheduling.js`, `resumeView.js` | High |
| P1-DEPLOY-04 | CORS fails fast in production if `CORS_ORIGIN` unset — **Good** | Pass |
| P1-DEPLOY-05 | Rate limits skipped in dev / E2E (`DISABLE_RATE_LIMIT`) | Acceptable for E2E |
| P1-DEPLOY-06 | E2E uses SQLite; **Postgres not validated** in CI | Blocker |

### S. CI / E2E Infrastructure

| Item | Status |
|------|--------|
| Playwright config | Present — single worker, seed + webServer, traces on retry |
| GitHub Actions | **Absent** (no `.github/workflows`) |
| Deterministic seed | `backend/scripts/seed-e2e.js` |
| Test isolation | Fresh seed per run via global setup |
| Retries | Config default |
| Recommended CI | Report-only: lint + Jest + Playwright on PR; Postgres service container for staging |

---

## P2 Findings (can wait)

| ID | Summary |
|----|---------|
| P2-CMS-01 | Wire landing FAQs to CMS public API |
| P2-SEARCH-01 | Add global search UI or remove dead backend from recruiter exposure |
| P2-UI-01 | `SuperAdminDashboard` unused — admin shell shared (documented UI-02) |
| P2-JOB-01 | `updateJob` null `linkedAssessmentId` Prisma shape |
| P2-AUTH-01 | Uniform sessionVersion bump on all role logins |
| P2-FE-01 | Admin dashboard client cache fallback masks API failures |

---

## Security Findings (consolidated)

1. **IDOR on application status and resume-view URL** (Critical)  
2. **IDOR on admin readiness student detail** (Critical)  
3. **Unscoped admin assessment session/proctoring/results by UUID** (High)  
4. **Pending account API access** (High)  
5. **JWT secret fallbacks** (High in misconfigured deploy)  
6. **Secrets committed in docker-compose** (Critical ops)  
7. **Application transition bypass** (High integrity)

---

## Known Product Gaps (not security defects)

- Landing FAQs not CMS-driven (CMS-03)  
- Default placement statistics when CMS empty  
- No assessment autosave API  
- Global search backend without dedicated UI  
- Conversational AI excluded by design  
- PRC-06 Cloudinary optional in E2E  

---

## Recommended Fix Order

1. **P1-SCOPE-01/02** — Application status + resume-view scope/ownership  
2. **P1-SCOPE-03** — Admin readiness scope on all routes  
3. **P1-RBAC-01** — Wire `requireActive` on job (and recruiter write) routes  
4. **P1-APP-01** — Enforce application transition graph in `applicationIntegrity.js`  
5. **P1-SCOPE-04/05/06** — Assessment admin session/results/proctoring scope  
6. **P1-SCOPE-07/08/09** — Job opportunities, recruiters directory, announcements  
7. **P1-DEPLOY-01/02/03** — Remove hardcoded secrets and JWT fallbacks  
8. **P1-AUTH-02** — Invalidate sessions on password reset  
9. **CI + Postgres E2E** — Before production sign-off  
10. **P2 CMS/search** — Product decision  

---

## Phase 4 — Test Gap Matrix

| Test ID / Issue | Existing? | Passing? | Required? | Bug? | Priority |
|-----------------|-----------|----------|-----------|------|----------|
| REG-SEC-01 / SEC-01 | Yes | Yes | Yes | Fixed | — |
| REG-SEC-02 / SEC-02 | Yes | Yes | Yes | Fixed | — |
| REG-SEC-03a–d | Yes | Yes | Yes | Fixed | — |
| REG-SEC-04 | Yes | Yes | Yes | Fixed | — |
| REG-SEC-05 | Yes | Yes | Yes | Fixed | — |
| REG-SEC-07 | Yes | Yes | Yes | Fixed | — |
| REG-DATA-05a/b | Yes | Yes | Yes | Fixed | — |
| APP-09 / P1-APP-01 | Yes | Yes* | Yes | **Open** | P1 |
| REC-04 / P1-JOB-01 | Yes | Yes* | Yes | **Open** | P1 |
| P1-SCOPE-01 app status IDOR | No | — | Yes | Open | P1 Critical |
| P1-SCOPE-02 resume-view IDOR | No | — | Yes | Open | P1 Critical |
| P1-SCOPE-03 readiness IDOR | No | — | Yes | Open | P1 Critical |
| P1-SCOPE-04–06 assessment admin IDOR | No | — | Yes | Open | P1 High |
| P1-SCOPE-07 job opportunities scope | No | — | Yes | Open | P1 |
| P1-SCOPE-08 recruiters directory | No | — | Optional | Open | P2 |
| P1-SCOPE-09 announcements scope | No | — | Yes | Open | P1 |
| P1-AUTH-02 password reset invalidation | No | — | Yes | Open | P1 |
| P1-AUTH-01 pending user API block | Partial REC-04 | * | Yes | Open | P1 |
| CMS-03 hardcoded FAQs | Yes p2 | Yes | Product | Gap | P2 |
| UI-03 default stats | Yes p3 | Yes | Product | Gap | P2 |
| PRC-06 Cloudinary | Yes | Skip | Env | N/A | P2 |
| Postgres E2E | No | — | Yes | — | Pre-prod |
| CI pipeline | No | — | Yes | — | Pre-prod |

\*Passing because test accepts known-bug path or documents limitation.

---

## Phase 5 — Final Recommendation

### 1. Production-safe now (with caveats)

- Core **student assessment take flow** with assignment checks and sanitized payloads  
- **P0 security regressions** covered by E2E  
- **List-level admin scoping** for students, applications, jobs (list), assessments/mocks/AI lists, control tower, ATS  
- **Recruiter search restrictions** and **placement AI authentication**  
- **Logout/session invalidation** and **student single-device** behavior  
- **RBAC role gates** on most mutating endpoints (role present; scope gaps remain on ID routes)

### 2. Still blocking production

- Critical **IDOR** paths (applications, readiness, assessment admin session IDs)  
- **PENDING account** enforcement on write APIs  
- **Application state machine** integrity (APP-09)  
- **Secrets management** and removal of JWT fallbacks  
- **No CI**; **no Postgres E2E** validation  
- **Misleading public stats/FAQs** if CMS not populated (compliance/marketing risk)

### 3. Fix immediately (before prod)

P1-SCOPE-01, 02, 03, P1-RBAC-01, P1-APP-01, P1-DEPLOY-01/02/03, P1-SCOPE-04/05/06

### 4. Can wait until P2

CMS FAQs wiring, default stats UX, global search UI, updateJob null edge case, admin dashboard cache behavior

### 5. Manual external validation required

- Cloudinary uploads (proctoring screenshots, resumes)  
- SMTP / email worker delivery  
- Google OAuth login + Calendar connect  
- AI providers (placement, ATS, AI interview insights)  
- Judge0 in production if used  
- Redis-backed workers if email/job distribution required at scale  

### 6. Production-ready?

**No.** P0 security fixes hold, but **P1 IDOR, pending-user enforcement, application integrity, deployment hygiene, and Postgres/CI validation** must be addressed before production deployment.

---

*End of audit. P1 implementation should begin only after review of this document.*
