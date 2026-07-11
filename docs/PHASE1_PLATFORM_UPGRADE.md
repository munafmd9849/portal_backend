# Phase 1 Platform Upgrade

Security, CMS, Search & Assessment enhancements delivered as first-class platform modules.

## Modules

### 1. Secure Assessment Mode (Anti-Cheating)

**Client:** `frontend/src/proctoring-engine/`
- Expanded violation taxonomy (copy/paste/cut, right-click, selection, DevTools shortcuts, Print Screen, multi-monitor, resize, minimize, refresh, navigation, connectivity).
- Configurable auto-submit threshold with live warning countdown.
- `SecureExamStatusBar` + `ViolationTimeline` in the live exam UI.

**Server:** `AssessmentViolation.severity`, `AssessmentSession.warningCount` / `lastWarningAt` / `secureModeMeta`.
- `POST /api/assessments/session/violation/:sessionId` stores severity + increments counters.
- Admin review continues via existing proctoring session details / live monitor.

**Config (Assessment.config.proctoring JSON):**
```json
{
  "webcam": true,
  "mic": false,
  "fullscreen": true,
  "tabSwitch": true,
  "autoSubmit": true,
  "violationLimit": 10
}
```

> Browsers cannot disable extensions. This mode detects, blocks where possible, logs, warns, and can auto-submit.

### 2. Landing Page CMS

**Models:** `CmsSection`, `CmsVersion`  
**API:** `/api/cms`
| Method | Path | Access |
|--------|------|--------|
| GET | `/public/landing` | Public |
| GET/POST | `/sections` | SUPER_ADMIN (list also ADMIN) |
| POST | `/sections/reorder` | SUPER_ADMIN |
| PUT | `/sections/:id/status` | SUPER_ADMIN |
| DELETE | `/sections/:id` | SUPER_ADMIN |
| POST | `/publish` | SUPER_ADMIN |
| GET | `/versions` | SUPER_ADMIN |
| POST | `/versions/:version/restore` | SUPER_ADMIN |
| POST | `/media` | SUPER_ADMIN |

**Admin UI:** Admin → Content → Landing CMS (`?tab=landingCms`)

### 3. Success Story Management

**Model:** `SuccessStory`  
**API:** `/api/success-stories`
- Public: `GET /public`, `GET /public/:id`
- Admin CRUD + media upload (ADMIN / SUPER_ADMIN)

**Admin UI:** `?tab=successStories`  
**Landing:** `SuccessStoryCarousel` on the public home page.

### 4. Global Search

**Service:** `backend/src/services/globalSearchService.js`  
**API:** `/api/search` (ADMIN / SUPER_ADMIN / RECRUITER)
- `GET /` federated search with scoring, highlight, pagination
- `GET /suggest` autocomplete
- `GET /meta` entity type list

**Admin UI:** Overview → Search (`?tab=globalSearch`)

### 5. Bulk Assessment Upload

**Model:** `AssessmentImportBatch`  
**API:** `/api/assessment-imports`
- Template download, preview (validate + duplicates), commit (partial), rollback, history

**Admin UI:** Assessments → Server bulk import panel  
Also retains client Excel import via `AssessmentQuestionExcelUpload`.

## Schema apply

```bash
cd backend
npx prisma db push
npx prisma generate
node scripts/seedPhase1Content.js
```

## RBAC & audit

- CMS publish/edit: SUPER_ADMIN
- Success stories: ADMIN + SUPER_ADMIN
- Search: ADMIN, SUPER_ADMIN, RECRUITER
- Bulk import: ADMIN + SUPER_ADMIN
- Sensitive mutations write `AuditLog` via `logAction`

## Notes

- Image/video uploads use Cloudinary (`cms/landing`, `cms/success-stories`).
- SQLite-local search uses `contains` filters (case-sensitive on SQLite); scoring provides fuzzy ranking.
- Landing static sections remain as fallbacks until CMS content is published and wired per-section in future iterations; Success Stories carousel is live from the API.
