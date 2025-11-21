# PWIOI Placement Portal - Migration Package

Complete migration from Firebase/Firestore to PostgreSQL + Express + Socket.IO.

## 📁 Directory Structure

```
MIGRATION/
├── prisma/
│   └── schema.prisma          # Database schema (PostgreSQL/SQLite)
├── backend/
│   ├── src/
│   │   ├── config/            # Configuration (DB, Redis, S3, Email, Socket)
│   │   ├── middleware/        # Auth, roles, validation
│   │   ├── controllers/       # Business logic
│   │   ├── routes/            # API endpoints
│   │   ├── workers/           # BullMQ workers
│   │   └── server.js          # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── src/
│       ├── services/
│       │   ├── api.js         # API client (replaces Firebase SDK)
│       │   └── socket.js      # Socket.IO client (replaces Firestore listeners)
│       └── context/
│           └── AuthContext.migrated.jsx  # Updated auth context
├── scripts/
│   └── migrate-firestore-to-postgres.js  # Data migration script
├── MIGRATION_GUIDE.md         # Detailed step-by-step guide
├── MIGRATION_SUMMARY.md       # Quick reference
└── README.md                  # This file
```

## 🚀 Quick Start

1. **Read** `MIGRATION_GUIDE.md` for complete instructions
2. **Set up** backend: `cd backend && npm install && npm run db:migrate`
3. **Configure** environment variables
4. **Run** migration script to import data
5. **Update** frontend to use new API service
6. **Test** thoroughly before production

## 📚 Documentation

- **MIGRATION_GUIDE.md** - Complete step-by-step migration instructions
- **MIGRATION_SUMMARY.md** - API mappings, schema mappings, quick reference

## ⚠️ Important Notes

- Users will need to **reset passwords** (Firebase passwords cannot be migrated)
- **Email verification** will need to be re-sent
- **File URLs** need to be migrated to S3
- Keep **Firebase data** intact during migration for rollback

## 🔗 Related Files

- `PROJECT_ANALYSIS.md` - Original system analysis (in project root)
- Original Firebase code remains in `src/` (frontend) for reference
