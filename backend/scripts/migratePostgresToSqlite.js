/**
 * Copy all portal data from PostgreSQL (Render) into local SQLite.
 *
 * Usage:
 *   POSTGRES_SOURCE_URL="postgresql://..." DATABASE_URL="file:./dev.db" node scripts/migratePostgresToSqlite.js
 *
 * Or set POSTGRES_SOURCE_URL in backend/.env and run:
 *   npm run db:pull-from-postgres
 */

import pg from 'pg';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env'), override: true });

/** Parent tables first — respects foreign keys */
const TABLE_ORDER = [
  'users',
  'schools',
  'centers',
  'batches',
  'refresh_tokens',
  'otps',
  'companies',
  'recruiters',
  'recruiter_mou_documents',
  'admins',
  'admin_requests',
  'students',
  'skills',
  'education',
  'experiences',
  'projects',
  'achievements',
  'certifications',
  'coding_profiles',
  'student_resume_files',
  'resumes',
  'jobs',
  'job_tracking',
  'job_student_targets',
  'applications',
  'notifications',
  'email_notifications',
  'student_queries',
  'endorsements',
  'endorsement_tokens',
  'google_calendar_tokens',
  'announcements',
  'mock_interview_drives',
  'mock_interview_slots',
  'mock_interview_feedback',
  'mock_interview_recordings',
  'ai_mock_interviews',
  'ai_mock_interview_questions',
  'ai_mock_interview_enrollments',
  'ai_mock_interview_answers',
  'ai_mock_interview_violations',
  'ai_mock_interview_screenshots',
  'ai_mock_interview_reviews',
  'ai_mock_interview_ai_insights',
  'interview_sessions',
  'interviews',
  'interview_rounds',
  'interview_slots',
  'interviewer_invites',
  'interview_evaluations',
  'interview_activities',
  'round_evaluations',
  'recruiter_screening_sessions',
  'student_activity_logs',
  'audit_logs',
  'assessments',
  'assessment_questions',
  'assessment_assignments',
  'assessment_sessions',
  'assessment_violations',
  'assessment_media',
  'assessment_screenshots',
];

function normalizeKey(name) {
  return String(name).toLowerCase().replace(/_/g, '');
}

function resolveSqlitePath(databaseUrl) {
  const url = (databaseUrl || '').trim();
  if (!url.toLowerCase().startsWith('file:')) {
    throw new Error('DATABASE_URL must be SQLite (file:./dev.db) for the target.');
  }
  const relative = url.replace(/^file:/i, '');
  const prismaDir = join(__dirname, '../prisma');
  return resolve(prismaDir, relative);
}

function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object' && value !== null) {
    if (Buffer.isBuffer(value)) return value;
    return JSON.stringify(value);
  }
  return value;
}

function getSqliteColumns(db, table) {
  try {
    return db.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name);
  } catch {
    return [];
  }
}

async function getPostgresColumns(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

async function postgresTableExists(pool, table) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table],
  );
  return rows.length > 0;
}

function buildColumnMap(pgCols, sqliteCols) {
  const sqliteByNorm = new Map(sqliteCols.map((c) => [normalizeKey(c), c]));
  const pairs = [];

  for (const pgCol of pgCols) {
    const sqliteCol = sqliteByNorm.get(normalizeKey(pgCol));
    if (sqliteCol) pairs.push({ pg: pgCol, sqlite: sqliteCol });
  }
  return pairs;
}

async function migrateTable(pool, sqlite, table) {
  const sqliteCols = getSqliteColumns(sqlite, table);
  if (!sqliteCols.length) {
    console.log(`  ⏭  ${table} — not in SQLite schema`);
    return { table, copied: 0, skipped: true };
  }

  const exists = await postgresTableExists(pool, table);
  if (!exists) {
    console.log(`  ⏭  ${table} — not in Postgres`);
    return { table, copied: 0, skipped: true };
  }

  const pgCols = await getPostgresColumns(pool, table);
  const columnMap = buildColumnMap(pgCols, sqliteCols);
  if (!columnMap.length) {
    console.log(`  ⚠️  ${table} — no matching columns`);
    return { table, copied: 0, skipped: true };
  }

  const pgSelect = columnMap.map((c) => `"${c.pg}"`).join(', ');
  const sqliteInsertCols = columnMap.map((c) => `"${c.sqlite}"`).join(', ');
  const placeholders = columnMap.map(() => '?').join(', ');

  const { rows } = await pool.query(`SELECT ${pgSelect} FROM "${table}"`);
  if (!rows.length) {
    console.log(`  ·  ${table} — 0 rows`);
    return { table, copied: 0, skipped: false };
  }

  sqlite.prepare(`DELETE FROM "${table}"`).run();

  const insert = sqlite.prepare(
    `INSERT INTO "${table}" (${sqliteInsertCols}) VALUES (${placeholders})`,
  );

  const insertMany = sqlite.transaction((batch) => {
    for (const row of batch) {
      insert.run(columnMap.map((c) => serializeValue(row[c.pg])));
    }
  });

  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    insertMany(rows.slice(i, i + CHUNK));
  }

  console.log(`  ✓  ${table} — ${rows.length} rows`);
  return { table, copied: rows.length, skipped: false };
}

async function wakePostgres(pool) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === 5) throw err;
      console.log(`  ⏳ Postgres waking up (attempt ${attempt}/5)…`);
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
}

async function main() {
  const sourceUrl = process.env.POSTGRES_SOURCE_URL || process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl?.startsWith('postgres')) {
    throw new Error('Set POSTGRES_SOURCE_URL to your Render PostgreSQL connection string in backend/.env');
  }
  if (!targetUrl?.toLowerCase().startsWith('file:')) {
    throw new Error('DATABASE_URL must point to SQLite (file:./dev.db)');
  }

  const sqlitePath = resolveSqlitePath(targetUrl);
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found: ${sqlitePath}. Run: npm run db:push`);
  }

  console.log('📥 Source: PostgreSQL');
  console.log(`📤 Target: ${sqlitePath}`);
  console.log('');

  const pool = new pg.Pool({
    connectionString: sourceUrl,
    ssl: sourceUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30000,
  });

  const sqlite = new Database(sqlitePath);
  sqlite.pragma('foreign_keys = OFF');

  try {
    await wakePostgres(pool);
    console.log('✅ Connected to PostgreSQL\n');

    const results = [];
    for (const table of TABLE_ORDER) {
      results.push(await migrateTable(pool, sqlite, table));
    }

    const copied = results.reduce((sum, r) => sum + (r.copied || 0), 0);
    console.log(`\n✅ Done — ${copied} total rows copied into SQLite`);
  } finally {
    sqlite.pragma('foreign_keys = ON');
    sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
