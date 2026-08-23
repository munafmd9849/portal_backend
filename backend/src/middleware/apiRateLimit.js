/**
 * API rate limiting.
 *
 * Live assessment monitor + student exam heartbeats easily exceed a naive
 * 100 req / 15 min / IP cap (polling, screenshots, progress). Shared NAT and
 * Vercel→EC2 proxies make IP keys even worse. Authenticated traffic is keyed
 * by user; high-frequency assessment paths are excluded from the global cap.
 */

import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/secrets.js';

const isDev = process.env.NODE_ENV === 'development';

const GENERAL_WINDOW_MS = 15 * 60 * 1000;
const GENERAL_MAX = isDev
  ? 10000
  : Number.parseInt(process.env.API_RATE_LIMIT_MAX || '2000', 10);

/** Assessment engine heartbeats — auth still required on the routes themselves. */
const HIGH_FREQUENCY_ASSESSMENT = [
  /\/api\/assessments\/[^/]+\/live-sessions\/?$/i,
  /\/api\/assessments\/session\/(status|progress|violation|screenshot|media|proctoring)\//i,
  /\/api\/assessments\/session\/screenshot\/[^/]+\/url\/?$/i,
  /\/api\/code\/(run|evaluate)\/?$/i,
];

function requestPath(req) {
  return String(req.originalUrl || req.url || req.path || '').split('?')[0];
}

function isHighFrequencyAssessment(req) {
  const path = requestPath(req);
  return HIGH_FREQUENCY_ASSESSMENT.some((re) => re.test(path));
}

function peekUserId(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice(7), getJwtSecret());
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function rateLimitKey(req) {
  const userId = peekUserId(req);
  if (userId) return `user:${userId}`;
  return `ip:${clientIp(req)}`;
}

export const generalApiLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: rateLimitKey,
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    if (isHighFrequencyAssessment(req)) return true;
    return false;
  },
  validate: false,
});
