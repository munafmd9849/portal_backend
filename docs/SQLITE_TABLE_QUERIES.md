## SQLite Table Queries Reference

Use the macOS terminal inside the workspace root (`/Users/saicharan/Downloads/Portal-main`) to inspect each schema table. Replace `<table>` with the table name below:

```bash
sqlite3 backend/prisma/dev.db '.tables'
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("<table>");'
sqlite3 backend/prisma/dev.db 'SELECT * FROM <table> LIMIT 5;'
```

### Available Tables

| Table | Purpose |
|---|---|
| `_prisma_migrations` | Prisma migration history. |
| `achievements` | Student achievements metadata. |
| `admin_requests` | Pending administrator access requests. |
| `admins` | Application admin users. |
| `applications` | Student job application records. |
| `certifications` | Student certifications. |
| `coding_profiles` | Coding profile links (GitHub, LeetCode, etc.). |
| `companies` | Partner company metadata. |
| `education` | Student education history. |
| `email_notifications` | Email queue records for notifications. |
| `job_tracking` | Job moderation workflow tracking. |
| `jobs` | Recruiter-created job postings. |
| `notifications` | Notification feed data delivered to users. |
| `otps` | One-time passcodes for login flows. |
| `projects` | Student project metadata. |
| `recruiters` | Recruiter directory records. |
| `refresh_tokens` | Refresh tokens for JWT sessions. |
| `resumes` | Resume metadata/storage references. |
| `skills` | Master list of student skills. |
| `student_queries` | Student query submissions. |
| `students` | Student profiles. |
| `users` | Authenticated user accounts. |

### Example: inspect the `notifications` table

```bash
sqlite3 backend/prisma/dev.db 'PRAGMA table_info("notifications");'
sqlite3 backend/prisma/dev.db 'SELECT id, title, body, data, isRead, createdAt FROM notifications ORDER BY createdAt DESC LIMIT 10;'
```

Repeat the pattern for any table above.

