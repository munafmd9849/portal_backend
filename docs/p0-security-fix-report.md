# P0 Security Fix Report

**Date:** 2026-08-19  
**Phase:** Product Security + Correctness Fix (post E2E implementation)  
**Source:** Phase 1 audit (`docs/e2e-test-audit.md`), E2E regressions (`e2e/specs/p0-reg-sec.spec.js`)

---

## SEC-01 — Assessment authorization + answer leak

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-01 |
| **Current behavior** | `GET /api/assessments/details/:id` returns raw Prisma assessment including `questions[].correctAnswer` and full `testCases` to any authenticated student. Only DRAFT status is blocked. No assignment check. Same leak in `getStudentSessionResults`. `startSession` does not verify assignment. |
| **Root cause** | `getAssessmentDetails` in `backend/src/controllers/assessment.js` loads full question rows and `res.json(assessment)` with no DTO. Assignment resolution exists only in `getStudentAssessments` via `resolveStudentAssignmentScope`. |
| **Affected files** | `backend/src/controllers/assessment.js` (`getAssessmentDetails`, `startSession`, `getStudentSessionResults`), `backend/src/utils/studentAssignmentScope.js` |
| **Security impact** | **Critical** — any student with a UUID can read answer keys and hidden test cases before taking an assessment. |
| **Proposed fix** | (1) Add `assessmentStudentDto.js` with assignment verification + field stripping. (2) For STUDENT role: verify assignment via `resolveStudentAssignmentScope`; return 403/404 if unassigned or DRAFT. (3) Strip `correctAnswer`, hidden test cases, `explanation`, evaluator metadata from student responses. (4) Apply same checks in `startSession`. |
| **Database impact** | None |
| **E2E tests affected** | REG-SEC-01, ASM-* student flows, p0-assessments |
| **Migration required** | No |

---

## SEC-02 — Coding hidden test leak

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-02 |
| **Current behavior** | `POST /api/code/evaluate` returns `expectedOutput` and `input` for hidden test cases. `splitPublicAndHidden()` exists but is unused in API responses. `completeAssessment` stores full graded results in session JSON. |
| **Root cause** | `evaluateTestCases` in `backend/src/coding-engine/index.js` pushes all fields for every case regardless of `hidden` flag. |
| **Affected files** | `backend/src/coding-engine/index.js`, `backend/src/controllers/codeExecution.js`, `backend/src/controllers/assessment.js` (`completeAssessment` executionLogs) |
| **Security impact** | **High** — students can read hidden judge inputs/outputs and cheat on coding questions. |
| **Proposed fix** | Redact `expectedOutput` and `input` for hidden cases in student-facing evaluate responses. Add aggregate `hiddenTestsPassed` / `hiddenTestsTotal`. Redact hidden details in persisted `executionLogs` for student-readable session data. |
| **Database impact** | None (session JSON shape change only) |
| **E2E tests affected** | REG-SEC-02, COD-* specs |
| **Migration required** | No |

---

## SEC-03 — Admin scope not enforced

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-03 |
| **Current behavior** | Restricted admins can list all assessments, mock drives, AI interviews, access interview scheduling for out-of-scope jobs, search globally, list all queries/readiness/job-opportunities without campus filter. |
| **Root cause** | `getAdminScopeFilter` in `adminScope.js` is used only in students/applications/jobs/dashboard — not in assessment/mock/AI/search/scheduling controllers. No centralized resource-scope helper. |
| **Affected files** | `backend/src/controllers/assessment.js`, `mockInterview.js`, `aiMockInterview.js`, `interviewScheduling.js`, `globalSearch.js`, `queries.js`, `adminReadiness.js`, `jobOpportunities.js`, new `adminResourceScope.js` |
| **Security impact** | **Critical** — cross-campus data exposure for restricted admins. |
| **Proposed fix** | Add `adminResourceScope.js` reusing `getAdminScopeFilter`. Filter list endpoints by assignment/target overlap. Add job scope check to `getOrCreateSession`. Pass user context into global search with admin scope on student-linked entities. |
| **Database impact** | None |
| **E2E tests affected** | REG-SEC-03a–d, SCOPE-*, ISO-* |
| **Migration required** | No |

---

## SEC-04 — Recruiter global search

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-04 |
| **Current behavior** | Recruiters authorized on `/api/search` can query STUDENT and RESUME entity types with no pipeline scope. |
| **Root cause** | `globalSearch.js` route authorizes RECRUITER; `globalSearchService.js` has no role-based type restrictions. |
| **Affected files** | `backend/src/controllers/globalSearch.js`, `backend/src/services/globalSearchService.js`, `backend/src/routes/globalSearch.js` |
| **Security impact** | **High** — unrestricted student directory/resume search for recruiters. |
| **Proposed fix** | Reject recruiter requests for sensitive types (STUDENT, RESUME, APPLICATION, ADMIN). Allow JOB, COMPANY, RECRUITER (own company context). Return 403 when forbidden types requested. |
| **Database impact** | None |
| **E2E tests affected** | REG-SEC-04, SRCH-* |
| **Migration required** | No |

---

## SEC-05 — Unauthenticated placement AI

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-05 |
| **Current behavior** | `POST /api/placement/ai` has IP rate limit only — no JWT. |
| **Root cause** | `backend/src/routes/placement.js` — no `authenticate` middleware on `/ai`. |
| **Affected files** | `backend/src/routes/placement.js` |
| **Security impact** | **High** — cost/abuse vector; unauthenticated AI generation. |
| **Proposed fix** | Require `authenticate` + `authorize(['STUDENT'])`. Keep rate limiter. Frontend already calls via authenticated `apiRequest`. |
| **Database impact** | None |
| **E2E tests affected** | REG-SEC-05 |
| **Migration required** | No |

---

## SEC-07 — Empty admin scope = full access

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-07 |
| **Current behavior** | `isFullAccessScope()` treats all-empty `allowed*` arrays as full access (`legacyEmpty` branch). `createAdmin` defaults new admins to full access when no scope provided. |
| **Root cause** | `backend/src/utils/adminScope.js` lines 42–55; `superAdmin.js` `createAdmin` lines 120–122. |
| **Affected files** | `backend/src/utils/adminScope.js`, `backend/src/controllers/superAdmin.js`, `frontend/src/utils/adminScopeDisplay.js` (mirror logic) |
| **Security impact** | **High** — misconfigured admin with empty scope sees all students. |
| **Proposed fix** | Empty scope = **block all** (`{ id: 'BLOCK_ALL' }`). Full access only via explicit `['*']` wildcard on all three name dimensions OR `fullAccess: true` at create time. Update `createAdmin` default. Enhance filter to also use UUID ID fields. |
| **Database impact** | None — semantic change; existing super-admin seed uses explicit `*`. |
| **E2E tests affected** | REG-SEC-07, SCOPE-* |
| **Migration required** | No (prod admins with intentional full access must have `*` stored) |

---

## DATA-05 — Double submission / race

| Field | Detail |
|-------|--------|
| **Issue ID** | DATA-05 |
| **Current behavior** | Parallel `completeAssessment` calls both return 200. Duplicate apply relies on unique constraint but returns 400 not 409; check-then-act race possible. |
| **Root cause** | `completeAssessment` has no ownership check, no `IN_PROGRESS` guard, unconditional update. `applyToJob` check-then-create without transaction. |
| **Affected files** | `backend/src/controllers/assessment.js`, `backend/src/controllers/applications.js` |
| **Security impact** | **Medium** — data integrity; IDOR on session complete (SCOPE ISO). |
| **Proposed fix** | Verify session ownership. Use conditional `updateMany` where `status = 'IN_PROGRESS'`; second caller gets 409. Wrap apply in transaction with upsert / handle P2002 as 409. |
| **Database impact** | None |
| **E2E tests affected** | REG-DATA-05a/b, p0-scope-iso |
| **Migration required** | No |

---

## SEC-06 — SUPER_ADMIN route bypass

| Field | Detail |
|-------|--------|
| **Issue ID** | SEC-06 |
| **Current behavior** | `ProtectedRoute` grants access when `roleLower === 'super_admin'` regardless of `allowRoles`. |
| **Root cause** | `frontend/src/components/ProtectedRoute.jsx` line 25. |
| **Affected files** | `frontend/src/components/ProtectedRoute.jsx` |
| **Security impact** | **Low (UX)** — super admin can browse student UI; backend still enforces API auth. |
| **Proposed fix** | Remove unconditional super_admin bypass from frontend route guard. Super admin uses `/super-admin` and `/admin` routes. |
| **Database impact** | None |
| **E2E tests affected** | RBAC-08 (update to expect redirect) |
| **Migration required** | No |

---

## ProtectedRoute TDZ / RBAC UI

| Field | Detail |
|-------|--------|
| **Issue ID** | UI-RBAC-01 |
| **Current behavior** | Unauthorized users crash on `redirectPath` TDZ; remain on forbidden routes. Invalid hooks in conditional. |
| **Root cause** | `redirectPath` referenced before `const` declaration; debug 5s delay. |
| **Affected files** | `frontend/src/components/ProtectedRoute.jsx` |
| **Security impact** | **UX only** — backend is real boundary. |
| **Proposed fix** | Compute redirect path before use; immediate `<Navigate>`; remove conditional hooks. |
| **E2E tests affected** | RBAC-01, RBAC-06, UI-01 |
| **Migration required** | No |

---

## Logout / token invalidation

| Field | Detail |
|-------|--------|
| **Issue ID** | AUTH-07 |
| **Current behavior** | Frontend clears tokens before calling `/auth/logout`. Backend deletes refresh token only if sent; no `sessionVersion` bump. Access JWT valid until expiry. `sessionVersion` checked only for STUDENT. |
| **Root cause** | `AuthContextJWT.jsx` order of operations; `auth.js` logout handler; `generateAccessToken` omits sessionVersion for non-students. |
| **Affected files** | `frontend/src/context/AuthContextJWT.jsx`, `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`, `backend/src/utils/sessionManager.js` |
| **Security impact** | **Medium** — stolen access token usable after logout until expiry. |
| **Proposed fix** | Add `invalidateUserSession()` — bump `sessionVersion`, delete all refresh tokens. Include `sessionVersion` in all access tokens. Check on all roles in `authenticate`. Frontend: call logout API before clearing tokens. |
| **Database impact** | None (uses existing `User.sessionVersion`) |
| **E2E tests affected** | AUTH-07 (expect 401 after logout) |
| **Migration required** | No |

---

## Job creation null handling

| Field | Detail |
|-------|--------|
| **Issue ID** | JOB-NULL |
| **Current behavior** | `createJob` sets `linkedAssessmentId: null` alongside Prisma relation connects → 500. |
| **Root cause** | Prisma rejects scalar FK when relation syntax used (`auditContext.js` adds `creator.connect`). |
| **Affected files** | `backend/src/controllers/jobs.js` |
| **Security impact** | **Low** — availability/validation. |
| **Proposed fix** | Omit `linkedAssessmentId` field when null/undefined; use `linkedAssessment: { connect }` when set. |
| **E2E tests affected** | JOB-02, JOB-03, REC-03, REC-04, ERR-01 |
| **Migration required** | No |

---

## Scope consistency (UUID vs name)

| Field | Detail |
|-------|--------|
| **Issue ID** | SCOPE-ID |
| **Current behavior** | `getAdminScopeFilter` uses name fields only; UUID fields ignored if names empty → effective unrestricted. |
| **Root cause** | `adminScope.js` `getAdminScopeFilter` reads only `allowedSchools/Centers/Batches`. |
| **Proposed fix** | Also apply `schoolId`, `centerId`, `batchId` filters from `allowedSchoolIds` etc. Extend `mergeScopeIntoStudentWhere`. |
| **E2E tests affected** | SCOPE-*, REG-SEC-07 |
| **Migration required** | No |

---

## SQL / CASE / PROGRAMMING_CHALLENGE grading

| Field | Detail |
|-------|--------|
| **Issue ID** | GRADE-REVIEW |
| **Current behavior** | Types stored and importable but skipped in `completeAssessment` grading loop — score stays 0, may incorrectly pass job screening. |
| **Root cause** | Grading `if/else` only handles MCQ, CODING, DESCRIPTIVE. |
| **Proposed fix** | Treat `SQL`, `CASE_STUDY`, `PROGRAMMING_CHALLENGE` like DESCRIPTIVE → `PENDING_REVIEW`, no auto points. Document in report (no invented grading). |
| **E2E tests affected** | ASM-10 (expect PENDING_REVIEW / score 0) |
| **Migration required** | No |

---

## Implementation order

1. `adminScope.js` (SEC-07, scope IDs) + `adminResourceScope.js` + `assessmentStudentDto.js`
2. Assessment controller (SEC-01, DATA-05, grading)
3. Coding engine (SEC-02)
4. Global search (SEC-03/04)
5. Placement AI (SEC-05)
6. Mock/AI/scheduling/queries scope (SEC-03)
7. Jobs null fix
8. Auth/logout (AUTH-07)
9. ProtectedRoute (UI + SEC-06)
10. E2E test strict assertions + full validation run
