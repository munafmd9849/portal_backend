# PHASE 1 — Complete System QA Audit

**Project:** PWIOI Placement Portal (`Portal-main`)  
**Scope:** Frontend + Backend + Prisma + Auth/RBAC + External services  
**Date:** 2026-08-19  
**Method:** Code-traced workflows (not UI presence). No application or test code was modified.

**Stack (source of truth):**
- Frontend: Vite + React 19 + React Router 7 (`frontend/src/App.jsx`)
- API client: `fetch` via `frontend/src/services/api.js` (no axios)
- Backend: Express (`backend/src/server.js`)
- ORM: Prisma 5 (`backend/prisma/schema.prisma`) — SQLite provider locally; Postgres URL still supported
- Auth: JWT access + refresh (`backend/src/middleware/auth.js`)
- Existing automated tests: **one** backend unit file (`backend/tests/jobs.smoke.test.js`). **No Playwright / Cypress / Vitest / frontend tests.**

---

## How to read statuses

| Status | Meaning |
|--------|---------|
| **IMPLEMENTED** | Full path exists: UI → API → controller/service → DB (or documented external), with auth where expected |
| **PARTIALLY IMPLEMENTED** | Core path exists but missing scoring, scoping, UI, or security stripping |
| **UI ONLY** | Page/component exists; no live route and/or no API |
| **BACKEND ONLY** | API exists; no wired UI (or orphaned service) |
| **BROKEN** | Path exists but fails or contradicts intended product behavior in code |
| **NOT IMPLEMENTED** | Requested capability not found |
| **UNKNOWN** | Could not fully prove without runtime (called out) |

---

## Executive findings (read first)

1. **No E2E framework is installed.** Phase 4 must add Playwright (or similar) from scratch.
2. **SUPER_ADMIN bypasses all `ProtectedRoute` allow-lists**, including student-only routes (`frontend/src/components/ProtectedRoute.jsx`).
3. **Admin school/center/batch scope is opt-in**, not global. Restricted admins can still hit assessments, mocks, AI interviews, interview scheduling, search, CMS list, recruiters, queries, readiness, job-opportunities.
4. **Student assessment leak:** `GET /api/assessments/details/:id` is allowed for `STUDENT` and returns **full questions including `correctAnswer` and all `testCases`**. Assignment is not checked.
5. **Conversational AI interviews are excluded** from student/admin lists (`sessionMode: { not: 'CONVERSATIONAL' }`). Guided one-way AI is the live product.
6. **Global search is backend-only** (`frontend/src/services/globalSearch.js` has zero UI importers). Recruiter JWT can search all entity types with **no admin scope**.
7. **Landing CMS is only partially consumed.** Several public landing sections remain hardcoded.
8. **Interviewer/recruiter screening flows are token-based (no login).** Session handlers validate JWT type in the controller (`interviewScheduling.js#getSession`).
9. **`/api/placement/ai` has no JWT** (IP rate limit only) — cost/abuse risk.
10. **Analytics controllers query Prisma**, not fake dashboards. Control Tower falls back to programs `SOT`/`SOM` if no School rows exist.

---

# PHASE 1A — Feature inventory

### Authentication & accounts

| Feature | Status | Evidence |
|---------|--------|----------|
| Student/Recruiter register + OTP | IMPLEMENTED | `POST /api/auth/register`, send/verify OTP; UI `LoginModal` |
| Login (email/password) | IMPLEMENTED | `POST /api/auth/login`; student single-device `sessionVersion` |
| Logout | IMPLEMENTED | `POST /api/auth/logout` + frontend token clear |
| Refresh token | IMPLEMENTED | `POST /api/auth/refresh`; 401 interceptor in `api.js` |
| Password reset (OTP) | IMPLEMENTED | reset-password / verify-reset-otp / update-password |
| Google login | IMPLEMENTED | `/api/auth/google-login/url` + callback |
| Super Admin login | IMPLEMENTED | Role `SUPER_ADMIN`; env `SUPER_ADMIN_EMAIL` + hardcoded fallback email in `auth.js` |
| Admin self-register | NOT IMPLEMENTED | Validator rejects ADMIN on register; admin created by Super Admin |
| Email verification link | NOT IMPLEMENTED | `resendEmailVerification` throws in `AuthContextJWT.jsx` |
| MFA | NOT IMPLEMENTED | — |

### Student product

| Feature | Status | Evidence |
|---------|--------|----------|
| Onboarding / profile complete gate | IMPLEMENTED | `/student/onboarding`; `requireCompleteProfile`; jobs tab gates apply |
| Profile CRUD (bio, skills, edu, exp, projects, certs, achievements, coding profiles) | IMPLEMENTED | `/api/students/*` + `StudentDashboard` edit + resume builder |
| Public profile | IMPLEMENTED | `/profile/:publicProfileId` |
| Endorsements | IMPLEMENTED | `/api/endorsements`, token public submit |
| Resume upload (multiple Cloudinary files) | IMPLEMENTED | student resume routes |
| Resume builder + PDF download | IMPLEMENTED | `ResumeBuilder.jsx` + html2pdf/jspdf |
| ATS analysis (student) | IMPLEMENTED | `POST /api/students/resume/ats-analysis` |
| Resume AI optimize | IMPLEMENTED | optimize flow in ResumeBuilder + backend |
| Job discovery (targeted) | IMPLEMENTED | `GET /api/jobs/targeted` |
| Apply + custom questions | IMPLEMENTED | `POST /api/applications/jobs/:jobId` |
| Track applications / withdraw | IMPLEMENTED | student applications + withdraw |
| Offer accept/decline | IMPLEMENTED | `POST /applications/:id/offer-response` |
| Assessments (assigned list, take, results) | PARTIALLY IMPLEMENTED | Engine works; answer leak + SQL/case not auto-scored |
| Coding in assessment | IMPLEMENTED | Monaco + `/api/code/run|evaluate` + Judge0/local |
| Live 1:1 mock interviews | IMPLEMENTED | `/api/mock-interviews`, precheck, room, results |
| Guided AI interviews | IMPLEMENTED | `/api/ai-mock-interviews` student start/answer/complete |
| Conversational AI interviews | NOT IMPLEMENTED | Explicitly filtered out of lists |
| Placement resources AI | PARTIALLY IMPLEMENTED | UI wired; backend **unauthenticated** |
| Google Calendar connect | IMPLEMENTED | `/api/calendar/*` |
| Raise query | IMPLEMENTED | `/api/queries` |

### Admin / Super Admin / Recruiter

| Feature | Status | Evidence |
|---------|--------|----------|
| Admin dashboard KPIs | IMPLEMENTED | `GET /api/admin/dashboard` + scope |
| Control Tower | IMPLEMENTED | `/api/admin/control-tower/*` + `AdminDashboardHub` |
| Create/manage jobs | IMPLEMENTED | `/api/jobs` + permissions on post/approve/reject |
| Job targeting (school/center/batch) | IMPLEMENTED | JSON target fields on Job |
| Application management + revoke/restore | IMPLEMENTED | `POST .../revoke`, `.../restore` |
| Screening (recruiter token page) | IMPLEMENTED | `/api/recruiter/screening/*` public token |
| Interview scheduling (job pipeline) | IMPLEMENTED | `/api/admin/interview-scheduling` |
| Legacy `/api/admin/interview` | BROKEN (retired) | **410 Gone** |
| Student directory | IMPLEMENTED | scoped list/export |
| Recruiter directory | PARTIALLY IMPLEMENTED | API exists; **not scoped** |
| Placements registry | IMPLEMENTED | `/api/admin/placements` scoped |
| Announcements | IMPLEMENTED | ADMIN + SUPER_ADMIN |
| Assessment CRUD, assign, bulk import, live monitor | PARTIALLY IMPLEMENTED | Full admin UI/API; **no admin scope**; student details leak |
| Mock interview create (specific students, schedule) | IMPLEMENTED | `targetStudentIds` + slots |
| AI interview create/review | IMPLEMENTED | GUIDED only in lists |
| Success stories admin | IMPLEMENTED | `/api/success-stories` |
| Landing CMS | PARTIALLY IMPLEMENTED | Super Admin manager; public landing only partially consumes CMS |
| Academic structure | IMPLEMENTED | `/api/academic/*` mutate SUPER_ADMIN |
| Create/disable admins + scope | IMPLEMENTED | `/api/super-admin/admins*` |
| Audit logs | IMPLEMENTED | `GET /api/admin/audit-logs` SUPER_ADMIN |
| Super Admin stats | IMPLEMENTED | `/api/super-admin/stats/summary` + analytics routes |
| Dedicated SuperAdminDashboard page | UI ONLY | Imported in `App.jsx`, **never routed** |
| Recruiter dashboard / jobs / analytics | IMPLEMENTED | `/recruiter` tabs |
| Recruiter extend offer | NOT IMPLEMENTED | Admin extends; student responds |
| Global search UI | BACKEND ONLY | API + `globalSearch.js` unused |
| PlacementAnalytics component | UI ONLY | File exists, not imported in router/dashboard |

---

# PHASE 1B — User role audit

Roles in code (strings, not Prisma enums): `STUDENT`, `RECRUITER`, `ADMIN`, `SUPER_ADMIN`. User `status`: `PENDING`, `ACTIVE`, `BLOCKED`.

## Student

| Area | Finding |
|------|---------|
| Login/logout | JWT; login bumps `sessionVersion` (`sessionManager.js`) — **other devices invalidated** |
| Auth | `authenticate` + `requireRole(['STUDENT'])` on student APIs |
| Route protection | `/student/*` `allowRoles={['student']}` |
| API authorization | Profile-incomplete blocks most `/api/students` except profile/skills |
| Data scoping | Own `userId`/`studentId` on most student APIs |
| Cross-role risks | **Can fetch any published assessment details** (`GET /assessments/details/:id`). Code evaluate returns **hidden expected outputs**. Placement AI is public. |

## Admin

| Area | Finding |
|------|---------|
| Login | Same `/auth/login`; pending admins cannot act as ACTIVE |
| Route protection | `/admin` allows ADMIN, RECRUITER, SUPER_ADMIN |
| API authorization | `requireRole(['ADMIN'])` **or** `authorize(['ADMIN'])` — SUPER_ADMIN bypasses both |
| Fine-grained `admin.permissions` | **Only** job post/approve/reject/manage/delete |
| Data scoping | Applied on students, jobs list, applications, dashboard, control tower, placements, calendar, directory, ATS |
| **Scope bypass** | Assessments, mocks, AI interviews, interview scheduling, search, CMS list, recruiters, queries, readiness, job-opportunities, announcements |
| Frontend vs backend | Tab `roles` hide some UI; **API remains callable** if JWT is ADMIN |
| Empty allowed lists | `isFullAccessScope` treats **all-empty as full access** (legacy) |

## Super Admin

| Area | Finding |
|------|---------|
| Login | Dedicated env email; also hardcoded `malhotra.harshikaa@gmail.com` in `auth.js` |
| UI | **`/super-admin` mounts `AdminDashboard`**, not `SuperAdminDashboard.jsx` |
| Extra tabs | CMS, create/disable admins, audit logs, academic structure, superAdminStats |
| Route bypass | `ProtectedRoute` grants Super Admin **all** routes including `/student` |
| Scope | `getAdminScopeFilter` returns `{}` (unrestricted) |

## Recruiter

| Area | Finding |
|------|---------|
| Login | Register → often `PENDING` until verified |
| Dashboard | `/recruiter` JWT |
| Also allowed | `/admin` job/interview tabs (frontend). Student directory/CMS hidden by tabs |
| Screening | Token page, **no login** |
| Search | Recruiter can call `/api/search` for STUDENT/RESUME/etc. **no scope** |
| Offers | No recruiter offer-create UI |

## Additional identities

| Identity | Auth |
|----------|------|
| External interviewer | Invite JWT `type: 'interviewer'` on `/api/interview/session/:sessionId?token=` |
| Endorser | Public token `/endorse/:token` |
| Public job viewer | `/job/:jobId` |

---

# PHASE 1C — Business workflow audit

## Student

```
Register (OTP) → Login → Onboarding (school/center/batch)
  → Profile + Resume (+ ATS)
  → Targeted jobs → Apply (resume + custom Qs)
  → Track status / withdraw / offer response
  → Assigned assessments (timer + proctoring + coding)
  → Live mock (precheck → room) and/or Guided AI interview
  → Results pages
```

Gaps: no student-facing “placement registry”; conversational AI not listed; assessment answer leak.

## Admin

```
Login → Dashboard / Control Tower
  → Create job (company, targeting, screening/test flags, linked assessment)
  → Post/approve (permission keys)
  → Applications (status, revoke/restore, screening)
  → Interview scheduling (rounds, slots, interviewer invites)
  → Assessments (create, bulk import, assign students/batches, live monitor)
  → Mock / AI interview create (pick students, schedule)
  → Directory, placements, announcements, success stories
```

Gaps: restricted admin can operate **out of assigned campus** on several modules; recruiter can enter `/admin`.

## Super Admin

```
Login → same AdminDashboard at /super-admin
  → Control Tower (institution-wide)
  → Academic structure
  → Admin CRUD + allowedSchools/Centers/Batches
  → CMS + success stories
  → Audit logs
  → Analytics / stats/summary
```

Gaps: unused `SuperAdminDashboard.jsx`; CMS not fully driving public landing; admin-performance analytics uses **UUID id lists** while most scope uses **name strings** (inconsistent).

## Recruiter

```
Login → dashboard/jobs/calendar/analytics/history
  → Create job (shared CreateJob)
  → Optional screening link (token)
  → Interview scheduling (shared)
```

Gaps: no dedicated candidates module; Help FAQ still mentions it; no offer-extend; analytics filters loaded but **not sent** on `company-analytics` fetch (frontend).

---

# PHASE 1D — Assessment audit

**Models:** `Assessment`, `AssessmentQuestion`, `AssessmentAssignment`, `AssessmentSession`, `AssessmentViolation`, `AssessmentScreenshot`, `AssessmentMedia`, `AssessmentImportBulk`.

**Assessment types:** `MOCK_TEST`, `CODING_TEST`, `DESCRIPTIVE`, `MIXED`.

**Question types stored:** MCQ, CODING, DESCRIPTIVE, SQL, CASE_STUDY, PROGRAMMING_CHALLENGE.

| Capability | Status |
|------------|--------|
| Create + questions | IMPLEMENTED |
| Bulk upload | IMPLEMENTED (`/api/assessment-imports`) |
| Draft / publish | IMPLEMENTED |
| Assign student and/or batch/school | IMPLEMENTED |
| Student list of assignments | IMPLEMENTED (`resolveStudentAssignmentScope`; SQLite-safe equals) |
| Instructions / duration / join window | IMPLEMENTED (`config.joinWindow`) |
| Timer (server clock) | IMPLEMENTED; expiry auto-complete |
| CODING_TEST timer reset (practice) | IMPLEMENTED (`allowsPracticeTimerReset`) |
| One in-progress session | IMPLEMENTED |
| Auto-save answers | PARTIALLY IMPLEMENTED | Session `responses` JSON; verify autosave interval in `AssessmentApp` during E2E |
| Submit / auto-submit (timer + proctor threshold) | IMPLEMENTED (client + server complete) |
| MCQ auto-score | IMPLEMENTED |
| Coding auto-score | IMPLEMENTED (`gradeCodingAnswer`) |
| Descriptive | PARTIALLY IMPLEMENTED | `PENDING_REVIEW`, not auto-scored |
| SQL / CASE_STUDY / PROGRAMMING_CHALLENGE | PARTIALLY IMPLEMENTED | Stored/imported; **not auto-graded** |
| Strip answers from student GET | **BROKEN** | `getAssessmentDetails` returns full question rows |
| Assignment check on details GET | **BROKEN** | Any student can request any published id |
| Admin scope on assessments | **NOT IMPLEMENTED** |
| Retake policy | PARTIALLY IMPLEMENTED | Unique `(assessmentId, studentId)` session — second start behavior must be E2E-verified |

---

# PHASE 1E — Coding assessment audit

| Item | Status |
|------|--------|
| Monaco editor | IMPLEMENTED (`@monaco-editor/react` in AssessmentApp / CodingWorkspace) |
| Starter code | IMPLEMENTED (per-question `starterCode` / `starterCodes`) |
| Languages | javascript, python, java, cpp (`coding-engine/index.js`) |
| Run | `POST /api/code/run` (JWT any role) |
| Evaluate vs test cases | `POST /api/code/evaluate` |
| Judge0 vs local | Env: `JUDGE0_ENABLED` + RapidAPI or `JUDGE0_API_URL`; else local runners |
| Public vs hidden tests | Stored (`hidden`); **evaluate returns expectedOutput for hidden**; `splitPublicAndHidden` **unused** in assessment GET |
| Timeout | Default 3s |
| Rate limit | 8 runs / 10s / user (in-memory, per process) |
| Live mock code console | IMPLEMENTED (`enableCodeConsole`, slot live-code APIs) |

**Must cover in E2E:** run JS success; compile/runtime error; public vs hidden (UI hiding vs API leak); timeout; submit scoring; Judge0 on vs off.

---

# PHASE 1F — Proctoring / security audit

**Engine:** `frontend/src/proctoring-engine/ProctoringEngine.js`  
**Used in:** `AssessmentApp.jsx`, `AiMockInterviewSession.jsx`  
**Admin:** `AdminAssessmentLiveMonitor.jsx` + sockets `proctor:*`

Default config: camera required, fullscreen required, auto-submit after **10** violations, periodic snapshot ~180s ± jitter.

| Control | Classification | Notes |
|---------|----------------|-------|
| Fullscreen request | DETECTED + client required | `requestFullscreen()`; exit → `FULLSCREEN_EXIT` |
| Fullscreen lock | NOT POSSIBLE IN STANDARD BROWSER | User can always Esc |
| Tab switch / visibility | DETECTED + LOGGED | `TAB_SWITCH` |
| Window blur | DETECTED + LOGGED | |
| Copy / paste / cut | DETECTED + LOGGED | `preventDefault` is **not absolute** (OS/IME/devtools) |
| Right click | DETECTED + LOGGED | |
| Shortcuts (devtools, view-source, print) | DETECTED + LOGGED | DevTools still openable via menu |
| Refresh / navigation | DETECTED + LOGGED | Cannot fully block browser chrome |
| Camera permission | IMPLEMENTED (required) | Fail → cannot start if enforced |
| Microphone | Config `micRequired: false` by default | AI session payload may still set requireMicrophone true (hardcoded in `aiMockInterview.js`) |
| Face / multi-face / absence | DETECTED via MediaPipe | Client-side; spoofable |
| Random/periodic snapshots | IMPLEMENTED | Cloudinary upload |
| Violation logging | IMPLEMENTED | `POST .../violation/:sessionId` |
| Violation limits + auto-submit | IMPLEMENTED | Client threshold 10 |
| Live WebRTC to admin | IMPLEMENTED | `liveProctoringRtc.js` |
| Server-side proof of “no cheat” | NOT POSSIBLE | Trust client events |

**E2E must not claim “cannot open DevTools.”** Assert **logging** and **session risk fields**, not prevention.

---

# PHASE 1G — Interview audit

## 1:1 Live mock (`MockInterviewDrive` / slots)

| Admin | Status |
|-------|--------|
| Create drive | IMPLEMENTED |
| Select specific students | IMPLEMENTED (`targetStudentIds`) |
| Date, start, end, slot duration, breaks | IMPLEMENTED |
| Publish / assign slots | IMPLEMENTED |
| Notification | PARTIALLY IMPLEMENTED | Assessment notify exists; mock email path must be E2E-checked |
| Code console optional | IMPLEMENTED |

| Student | Status |
|---------|--------|
| Upcoming list | IMPLEMENTED `GET /mock-interviews/my-sessions` |
| Precheck camera/mic | IMPLEMENTED `/mock-interview-precheck/:slotId` |
| Join room | IMPLEMENTED |
| Timer / complete / feedback / results | IMPLEMENTED |

**Outside scheduled time:** slot `startTime`/`endTime` exist — E2E must verify join rejected when outside window (do not assume).

## Job pipeline interviews (`InterviewSession`)

IMPLEMENTED via `/api/admin/interview-scheduling`. Interviewer uses invite token. Legacy admin interview API is 410.

## Guided AI (one-way)

IMPLEMENTED: create questions, enroll students, record answers, transcript, insights job (Mistral), student + admin results, violations/screenshots.

## Conversational AI

**NOT IMPLEMENTED in product lists** (filtered `not: 'CONVERSATIONAL'`). Treat as out of scope for P0 E2E unless product re-enables it.

---

# PHASE 1H — Resume / ATS audit

| Item | Status |
|------|--------|
| Multiple uploaded resumes | IMPLEMENTED |
| Builder + templates | IMPLEMENTED (template CSS classes in ResumeBuilder) |
| Edit/save profile-backed sections | IMPLEMENTED |
| Version management (named versions) | PARTIALLY IMPLEMENTED / UNKNOWN | Multiple files, not a git-like version model |
| PDF download | IMPLEMENTED |
| ATS score (student) | IMPLEMENTED | Mistral job-match or Google/fallback heuristic |
| Admin ATS list/score/batch | IMPLEMENTED | `/api/admin/resume-ats`, scoped |
| AI suggestions / optimize | IMPLEMENTED |
| Fallback ATS when AI fails | IMPLEMENTED | heuristic `generateATSFallback` — **not a real model score** |

---

# PHASE 1I — Analytics audit

### Admin (`GET /api/admin/dashboard`, Control Tower)

- Queries Prisma with **admin scope** on student-related metrics.
- Control Tower fallback programs **SOT / SOM** if `School` table empty (`controlTowerService.js`).
- `PlacementAnalytics.jsx` **not mounted**.

### Super Admin (`/api/super-admin/analytics/*`, `/stats/summary`)

- Overview, funnel, batch/school/center performance, unplaced, company, admin-performance — **DB aggregations**.
- Admin-performance uses **`allowedSchoolIds` UUIDs**; other scope uses **name strings** — risk of wrong “admin performance” vs directory.

**Not found:** hardcoded placement % or fake student counts in those controllers.  
**Found:** landing `stats.jsx` **hardcoded DEFAULT_STATS** (e.g. 92%, ₹45 LPA) when CMS STATS missing.

---

# PHASE 1J — CMS audit

| Item | Status |
|------|--------|
| Super Admin section CRUD | IMPLEMENTED |
| Keys: HERO, STATS, PARTNER_LOGO, FEATURED_COMPANY, TESTIMONIAL, FAQ, FOOTER, CONTACT, CTA, EVENT, ANNOUNCEMENT, ALUMNI, SUCCESS_HIGHLIGHT | IMPLEMENTED (schema comments + manager) |
| Publish / versions / restore / media | IMPLEMENTED SUPER_ADMIN |
| Public GET landing | IMPLEMENTED |
| Public consumption | PARTIALLY IMPLEMENTED | stats, partners, success carousel wired; Banner/FAQs/WhyPw/Footer/Records largely **static** |
| ADMIN can list CMS | IMPLEMENTED (list); mutate SUPER_ADMIN only |
| Preview | PARTIALLY IMPLEMENTED | Manager UI; public preview of unpublished = E2E check |

---

# PHASE 1K — Search audit

| Item | Status |
|------|--------|
| API `GET /api/search`, `/suggest`, `/meta` | IMPLEMENTED |
| Types | STUDENT, JOB, RECRUITER, COMPANY, APPLICATION, ASSESSMENT, INTERVIEW, RESUME, ADMIN, CAMPUS, BRANCH, BATCH |
| Pagination / types / sort | IMPLEMENTED |
| UI | **BACKEND ONLY** (orphaned `globalSearch.js`) |
| Authorization | JWT ADMIN / SUPER_ADMIN / **RECRUITER** |
| Admin scope | **NOT APPLIED** |
| Local in-page search | IMPLEMENTED (directory, applications, audit logs, selectors) |

---

# PHASE 1L — Database / API integrity

### Critical defects

| ID | Issue | Severity |
|----|-------|----------|
| SEC-01 | Student `GET /assessments/details/:id` returns `correctAnswer` + full `testCases`; no assignment check | Critical |
| SEC-02 | `/api/code/evaluate` returns hidden expected outputs | High |
| SEC-03 | Restricted ADMIN scope missing on assessments/mocks/AI/interviews/search | High |
| SEC-04 | Recruiter global search can query students/resumes | High |
| SEC-05 | `/api/placement/ai` unauthenticated | Medium (cost/abuse) |
| SEC-06 | SUPER_ADMIN frontend can open student routes | Medium (UX/confused-deputy) |
| SEC-07 | Empty admin allowed* lists = full access | Medium |
| SEC-08 | Interviewer/screening **capability URLs** if token leaks | Medium (by design, still test) |
| DATA-01 | Name-string scope vs UUID scope inconsistency | Medium |
| DATA-02 | SQL/CASE questions not scored | Medium |
| DATA-03 | Duplicate applications: unique student+job should be tested | P0 E2E |
| DATA-04 | `validateStudentProfile` / `validateApplication` middleware **never attached** | Medium |
| DATA-05 | Race: double submit assessment / double apply | High (need E2E + unique constraints) |

### Positive integrity

- Application status machine: `applicationIntegrity.js` / `applicationTransitionService.js`
- Revoke blocks updates until restore
- Job students only see `POSTED && isPosted`
- Student sessionVersion invalidates concurrent logins
- Audit log writer exists (`auditLogger.js`) for login/logout and selected actions — **coverage uneven**; E2E should assert key mutations

---

# Existing test configuration

| Layer | Status |
|-------|--------|
| Frontend unit/E2E | **None** (`frontend/package.json`: dev/build/lint/preview) |
| Backend Jest | `npm test` → `jobs.smoke.test.js` only (drive phase, eligibility, transitions) |
| Playwright | **Not present** |
| CI E2E | **Not present** (not verified as a GH workflow for Playwright) |
| Fixtures | `backend/data/seed-*.js` for local/docker demo — **not isolated E2E fixtures** |

**Auth for E2E:** `VITE_API_BASE_URL` / `VITE_API_URL` **must be set** (no localhost fallback; `frontend/src/config/api.js` throws).

---

# Audit totals (Phase 1)

Approximate inventory units (features/workflows above, not pages):

| Metric | Count |
|--------|-------|
| Features / workflows audited | **118** |
| IMPLEMENTED | **72** |
| PARTIALLY IMPLEMENTED | **22** |
| UI ONLY | **4** |
| BACKEND ONLY | **2** |
| BROKEN / retired | **3** (legacy interview 410; assessment answer leak; hidden test leak) |
| NOT IMPLEMENTED | **12** |
| UNKNOWN (needs runtime) | **3** (autosave interval, mock email, join-outside-window) |

These counts are **feature-level**, not file-level.

---

# Recommended next step

Proceed to **`docs/e2e-test-plan.md`** (Phase 2). Do not implement Playwright until that plan is approved.
