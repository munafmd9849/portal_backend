/**
 * Centralized secret access — production must not use fallbacks.
 */

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isE2E() {
  return process.env.E2E === '1';
}

function devFallback(label) {
  if (isProduction()) {
    throw new Error(`${label} is required when NODE_ENV=production`);
  }
  return `dev-only-${label}-not-for-production`;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  return devFallback('JWT_SECRET');
}

export function getJwtRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET?.trim();
  if (secret) return secret;
  if (isProduction()) {
    throw new Error('JWT_REFRESH_SECRET is required when NODE_ENV=production');
  }
  return getJwtSecret();
}

export function getSuperAdminEmail() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  if (email) return email.toLowerCase();
  if (isProduction()) {
    throw new Error('SUPER_ADMIN_EMAIL is required when NODE_ENV=production');
  }
  if (isE2E()) {
    return 'e2e.super@pwioi.test';
  }
  return 'admin@localhost.dev';
}

/** Fail fast on production boot when required secrets are missing. */
export function assertProductionSecrets() {
  if (!isProduction()) return;
  getJwtSecret();
  getJwtRefreshSecret();
  getSuperAdminEmail();
}
