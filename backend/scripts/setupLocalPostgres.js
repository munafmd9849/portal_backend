/**
 * One-time local PostgreSQL setup for PORTAL dev.
 *
 * Creates database `portal_db` and user `portal_user` / `portal_password`
 * on your machine's PostgreSQL (localhost:5432).
 *
 * Usage (PowerShell):
 *   $env:POSTGRES_ADMIN_PASSWORD="your-postgres-superuser-password"
 *   npm run db:setup-local
 *
 * Optional overrides:
 *   POSTGRES_HOST=localhost
 *   POSTGRES_PORT=5432
 *   POSTGRES_ADMIN_USER=postgres
 *   PORTAL_DB_NAME=portal_db
 *   PORTAL_DB_USER=portal_user
 *   PORTAL_DB_PASSWORD=portal_password
 */

import pg from 'pg';

const {
  POSTGRES_HOST = 'localhost',
  POSTGRES_PORT = '5432',
  POSTGRES_ADMIN_USER = 'postgres',
  POSTGRES_ADMIN_PASSWORD,
  PORTAL_DB_NAME = 'portal_db',
  PORTAL_DB_USER = 'portal_user',
  PORTAL_DB_PASSWORD = 'portal_password',
} = process.env;

if (!POSTGRES_ADMIN_PASSWORD) {
  console.error(`
❌ Set POSTGRES_ADMIN_PASSWORD to your local PostgreSQL superuser password.

PowerShell:
  $env:POSTGRES_ADMIN_PASSWORD="YOUR_PASSWORD"
  npm run db:setup-local

This is the password you chose when installing PostgreSQL (user: ${POSTGRES_ADMIN_USER}).
`);
  process.exit(1);
}

const adminUrl = `postgresql://${POSTGRES_ADMIN_USER}:${encodeURIComponent(POSTGRES_ADMIN_PASSWORD)}@${POSTGRES_HOST}:${POSTGRES_PORT}/postgres`;

async function main() {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  console.log(`✅ Connected as ${POSTGRES_ADMIN_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}`);

  const userExists = await client.query(
    'SELECT 1 FROM pg_roles WHERE rolname = $1',
    [PORTAL_DB_USER]
  );

  if (userExists.rowCount === 0) {
    await client.query(
      `CREATE USER ${quoteIdent(PORTAL_DB_USER)} WITH PASSWORD $1 LOGIN CREATEDB`,
      [PORTAL_DB_PASSWORD]
    );
    console.log(`✅ Created user ${PORTAL_DB_USER}`);
  } else {
    await client.query(
      `ALTER USER ${quoteIdent(PORTAL_DB_USER)} WITH PASSWORD $1`,
      [PORTAL_DB_PASSWORD]
    );
    console.log(`ℹ️  User ${PORTAL_DB_USER} already exists — password updated`);
  }

  const dbExists = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [PORTAL_DB_NAME]
  );

  if (dbExists.rowCount === 0) {
    await client.query(
      `CREATE DATABASE ${quoteIdent(PORTAL_DB_NAME)} OWNER ${quoteIdent(PORTAL_DB_USER)}`
    );
    console.log(`✅ Created database ${PORTAL_DB_NAME}`);
  } else {
    console.log(`ℹ️  Database ${PORTAL_DB_NAME} already exists`);
  }

  await client.end();

  const portalUrl = `postgresql://${PORTAL_DB_USER}:${encodeURIComponent(PORTAL_DB_PASSWORD)}@${POSTGRES_HOST}:${POSTGRES_PORT}/${PORTAL_DB_NAME}`;
  console.log(`
✅ Local database ready.

Add this to backend/.env:

DATABASE_URL=${portalUrl}

Then run:
  npx prisma db push
  node prisma/seed-auth-users.js
  npm run dev
`);
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  if (/password authentication failed/i.test(err.message)) {
    console.error('   Wrong POSTGRES_ADMIN_PASSWORD — use your postgres superuser password.');
  }
  process.exit(1);
});
