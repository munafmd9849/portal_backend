/**
 * Database Configuration
 * Prisma Client singleton for database access
 * Supports SQLite (local dev) and PostgreSQL (production)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env'), override: true });

import { PrismaClient } from '@prisma/client';

function getOptimizedDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('CRITICAL: DATABASE_URL is required.');
  }

  const lowered = url.toLowerCase().trim();

  // SQLite: return as-is, no connection pool params needed
  if (lowered.startsWith('file:')) {
    console.log('📦 Using local SQLite database');
    return url;
  }

  // Validate: Must be PostgreSQL connection string for non-file URLs
  if (!lowered.startsWith('postgresql://') && !lowered.startsWith('postgres://')) {
    throw new Error('CRITICAL: DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://) or a local SQLite file (file:).');
  }

  // PostgreSQL: keep pool small — Render shares a low connection budget across clients/processes
  const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT || '5';
  const poolTimeout = process.env.DATABASE_POOL_TIMEOUT || '30';

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('connection_limit', connectionLimit);
    urlObj.searchParams.set('pool_timeout', poolTimeout);
    if (!urlObj.searchParams.has('connect_timeout')) {
      urlObj.searchParams.set('connect_timeout', '15');
    }
    return urlObj.toString();
  } catch (error) {
    console.warn('Failed to parse DATABASE_URL for optimization:', error.message);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&connect_timeout=15`;
  }
}

const optimizedDatabaseUrl = getOptimizedDatabaseUrl();
process.env.DATABASE_URL = optimizedDatabaseUrl;

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export function handleDatabaseError(error) {
  if (error?.code === 'P2024') {
    console.error('Database connection pool exhausted.');
  } else if (error?.code === 'P1017') {
    console.error('Database server closed the connection.');
  } else if (error?.code === 'P1001') {
    console.error('Cannot reach database server. Check DATABASE_URL and connectivity.');
  }
  return error;
}

const RETRYABLE_CODES = new Set(['P2024', 'P1017', 'P1001']);

/**
 * Retry transient DB pool / connectivity errors (Render free tier P2024).
 */
export async function withDbRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = handleDatabaseError(error);
      if (RETRYABLE_CODES.has(error?.code) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export default prisma;
