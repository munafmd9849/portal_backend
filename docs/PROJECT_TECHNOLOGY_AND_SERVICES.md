# Placement Portal — Technology and Services Inventory

**Audit scope:** repository source, configuration templates, package manifests, Prisma schema, routes, and service modules.  
**Updated:** 1 August 2026

## 1. What this project is

PWIOI/d-PORTAL is a web-based placement-management platform for four role groups:

- **Students:** profiles, jobs, applications, resumes, assessments, coding, calendars, endorsements, mock interviews, and placement preparation.
- **Recruiters:** company/job management, candidate screening, interview sessions, and hiring analytics.
- **Admins:** job approval, student and recruiter operations, assessments, interview scheduling, announcements, analytics, placements, CMS, and audits.
- **Super admins:** cross-campus controls, admin accounts, academic structure, and expanded analytics.

The repository has three executable applications:

| Application | Location | Purpose |
| --- | --- | --- |
| Main frontend | `frontend/` | React user interface for all portal roles |
| Main backend | `backend/` | REST API, realtime services, business rules, workers, and database access |
| Email worker | `email-worker/` | Separately deployable authenticated SMTP email endpoint |
| Standalone AI interview/resume app | `AI_Interview_Resume-main/` | Separate React + Express + Prisma/Mongo AI interview preparation and ATS-resume app |

`docs/`, root HTML files, and mockup/metrics files are product/design/reference material; they are not runtime services.

## 2. Core technology stack

| Area | Technology used |
| --- | --- |
| Frontend | React 19, React DOM, React Router, Vite |
| Styling | CSS, SCSS/Sass, Tailwind CSS, Styled Components, PostCSS, Autoprefixer |
| Backend | Node.js, Express 5, ES modules |
| Data access | Prisma ORM |
| Databases | SQLite for local development; PostgreSQL is supported/configured for hosted use. The standalone AI module is configured for MongoDB. |
| Authentication | JWT access/refresh tokens, bcrypt/bcryptjs password hashing, OTP and password-reset flows, role-based authorization |
| Realtime | Socket.IO for realtime portal/mock-coding behaviour; browser WebRTC for live proctoring |
| Validation/security | Helmet, CORS, express-rate-limit, express-validator, server-side role checks and token-based magic links |
| Background processing | BullMQ + ioredis/Redis queues for email/CSV/background jobs |
| Testing/tooling | Jest, Supertest, Nodemon, ESLint, Prisma migrations/ERD generator, TSX |

## 3. Implemented user-facing modules

### Placement operations

- Job posting, approval, publishing, bulk Excel upload, job-description upload, eligibility rules, targeting by school/center/batch, and placement-policy validation.
- Student job search, recommendations/matching, application submission, custom application questions, application timeline, withdrawal/status transitions, and offer/joined-placement tracking.
- Recruiter screening portal with expiring token links, resume viewing, screening outcomes, and candidate history.
- Admin/recruiter/student dashboards, job-opportunity pipeline, application funnel, control-tower views, directory metrics, readiness/probability scoring, placement registry, and calendar views.

### Profiles, resumes, and public presence

- Student profile, education, experience, projects, skills, achievements, certifications, social/coding profiles, profile completion, and public-profile sharing.
- Multiple PDF resume uploads, default-resume selection, resume text extraction, ATS analysis, AI optimization, custom resume builder/templates, and PDF generation/preview.
- Endorsement requests through expiring token links, endorsement status tracking, and faculty response workflow.

### Interviews

- Recruiter/admin interview sessions with multiple rounds, candidate selection, interview slots, attendance, evaluations, activity logs, freeze controls, and token-based interviewer access.
- Google Calendar-based event/slot synchronization and interview invitation/reminder emails.
- Dedicated live mock-interview drives, slots, feedback, recordings, result views, and a Jitsi-based interview-room option.
- Guided **AI mock interviews**: admin-created interviews, enrollment/session lifecycle, questions and recorded answers, progress tracking, violations/screenshots, admin review, AI insight regeneration, and student result pages.

### Assessments and assignments

- Admin-created, editable, publishable, and deletable assessments; student assignment listing and session start/complete flow.
- Question bank support, including coding-question editor, allowed-language picker, and Excel question import with preview, commit, history, and rollback.
- Student results and admin assessment dashboards, candidate lists, manual candidate evaluation, and live-session monitoring.
- Assessment-to-job bridge: assessment assignments and scores can participate in job application flow.

### Coding questions and code execution

- Browser coding workspace using Monaco Editor, starter-code storage, test-case handling, answer parsing, and a coding-problem panel.
- Authenticated `run` and `evaluate` APIs with code/input sanitization and per-user execution throttling.
- Supported languages: **JavaScript, Python, Java, and C++**.
- Execution uses local runners when available and can use **Judge0 CE** instead (RapidAPI-hosted Judge0 or a self-hosted Judge0 instance). Public and hidden test cases can be evaluated.

### Assessment proctoring

- Secure exam status UI, timer/session state, tab/activity violation logging, screenshot capture/upload, media upload, violation timeline, and admin proctoring detail views.
- Browser camera/face detection uses MediaPipe Tasks Vision.
- Live WebRTC proctoring can obtain TURN/STUN credentials from Metered; credentials are fetched by the backend so the Metered key is not exposed to the browser.

### Communication, calendars, and content

- In-app notifications and email notifications for OTP, jobs, applications, assessments, screening, interviews, endorsements, announcements, queries, and drive reminders.
- Role-based calendar events, personal events, scheduling, responses, and Google Calendar OAuth synchronization.
- Student/recruiter queries and support workflow; announcements targeted by audience.
- Landing-page CMS with sections, versioning, publish/restore, plus success-story management.
- Global search/autocomplete and placement-preparation resources/guidance.

## 4. External services and integrations

This table separates integrations that are implemented in code from optional configuration. A service still needs its environment variables/credentials before it will operate in a deployed environment.

| Service | How it is used | Configuration/notes |
| --- | --- | --- |
| Google Gemini / Generative AI | Placement guidance, project-content generation, and AI fallback/provider logic | `GOOGLE_AI_API_KEY`/Gemini key and model settings |
| Mistral AI | ATS scoring/optimization, guided AI-interview acknowledgement/insights, and Voxtral audio transcription | `MISTRAL_API_KEY`; defaults include `mistral-large-latest` and `voxtral-mini-latest` |
| Judge0 CE / RapidAPI | Sandboxed remote code execution for coding questions | `JUDGE0_RAPIDAPI_KEY` or self-hosted `JUDGE0_API_URL`; local runners are also implemented |
| Google OAuth + Calendar API | Sign-in/profile scopes, calendar connection, event sync, and token revocation | Google client ID, client secret, and redirect URL |
| Google Sheets API | Student-directory export/configured spreadsheet delivery | Spreadsheet ID and service-account JSON/key path |
| Cloudinary | Profile images, resumes, assessment/AI-interview screenshots, uploads, and CSV-export storage | Cloud name, API key, API secret |
| AWS S3 | S3 upload and signed-URL support | AWS credentials, region, and S3 bucket; available as an alternate storage integration |
| SMTP / Nodemailer | Transactional and bulk portal email | SMTP host, port, user, password, and sender |
| Email worker | Optional isolated SMTP sending service protected by `x-worker-secret` | `EMAIL_WORKER_URL` and `EMAIL_WORKER_SECRET` |
| Redis | BullMQ queues and workers, notably CSV export/background jobs | `REDIS_URL` or host/port/password |
| Metered | TURN/STUN credentials used by live WebRTC proctoring | `METERED_DOMAIN`, `METERED_TURN_API_KEY` |
| Jitsi | Optional embedded mock-interview room | Frontend `VITE_JITSI_DOMAIN`, default compatible with `meet.jit.si` |
| DuckDuckGo HTML search | Fallback research/resource lookup for placement guidance | Implemented without a documented API key |

## 5. Frontend libraries used

- **Editing/media/proctoring:** `@monaco-editor/react`, `@mediapipe/tasks-vision`, `pdfjs-dist`, `react-pdf`, `mammoth`, `jspdf`.
- **Calendar, visualisation, UI:** FullCalendar, Chart.js/react-chartjs-2, Recharts, AG Charts, React Datepicker, React Window, React Masonry, React Minimal Pie Chart.
- **Design and animation:** Font Awesome, Heroicons, Tabler Icons, Lucide, React Icons, Lottie/dotLottie, GSAP, Motion, React Spring, Three.js.
- **Utilities/import-export:** XLSX, Lodash, UUID, date-fns, clsx, Tailwind Merge.

## 6. Backend libraries used

- **API/data/security:** Express, Prisma, `pg`, `better-sqlite3`, bcryptjs, jsonwebtoken, CORS, Helmet, express-rate-limit, express-validator.
- **Uploads/documents:** Multer, Cloudinary, AWS S3 SDK, PDF parsing, Mammoth (DOCX text), XLSX, Puppeteer Core.
- **AI/realtime/jobs:** Google Generative AI SDK, Mistral SDK, Socket.IO, BullMQ, ioredis.
- **Email/observability:** Nodemailer and Winston.

## 7. Data model coverage

The primary Prisma schema models users/roles; students and academic records; companies/recruiters/jobs/targets/applications; resume files; notifications/email logs; queries; endorsements; interview sessions/rounds/slots/evaluations; calendars; mock and AI mock interviews; assessments/questions/assignments/sessions/violations/media/screenshots; audit logs; announcements; CMS versions; success stories; and assessment-import batches.

## 8. Configuration and deployment checklist

Minimum local portal setup:

1. Configure `backend/.env` with `DATABASE_URL`, `JWT_SECRET`, port, and allowed frontend URL.
2. Configure `frontend/.env` with `VITE_API_BASE_URL`, `VITE_SOCKET_URL`, and frontend URL.
3. Install/run frontend and backend independently; Prisma generates the client after backend install.

Enable only the services needed:

- SMTP or the email worker for email delivery.
- Cloudinary (or the available S3 integration) for uploads and hosted artifacts.
- Redis for BullMQ workers/background processing.
- Google credentials for OAuth, Calendar, and Sheets exports.
- Mistral and/or Gemini keys for AI features.
- Judge0 credentials/endpoint for remote code execution.
- Metered/Jitsi settings for enhanced live interview/proctoring features.

## 9. Repository notes

- `AI_Interview_Resume-main/` is a **separate/legacy-looking AI product** with its own frontend/backend, package manifests, Prisma schema, Mistral integration, and MongoDB environment template. It should be deployed and configured separately from the main portal unless intentionally consolidated.
- The main backend supports SQLite locally and PostgreSQL in hosted deployments; do not assume both databases run at the same time.
- Several providers are optional. Their packages and code are present, but service availability depends on credentials and deployment configuration.
- No infrastructure-as-code, container configuration, or CI workflow was found in the audited project files.
