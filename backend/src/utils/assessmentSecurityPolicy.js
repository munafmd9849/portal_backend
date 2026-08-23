/**
 * Centralized assessment security policy — single source for server-side enforcement.
 */

import {
  parseProctoringConfig,
  parseSecureModeMeta,
  buildPausedMeta,
  buildUnlockedMeta,
  serializeSecureModeMeta,
  getTimerAnchorIso,
} from './assessmentPauseLock.js';

export const SecurityState = Object.freeze({
  SECURITY_CHECK: 'SECURITY_CHECK',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  SECURITY_PAUSED: 'SECURITY_PAUSED',
});

export const CaptureEventType = Object.freeze({
  DETECTED: 'SCREEN_CAPTURE_DETECTED',
  STOPPED: 'SCREEN_CAPTURE_STOPPED',
});

/** Legacy client types normalized to canonical security events. */
export const CAPTURE_VIOLATION_TYPES = new Set([
  CaptureEventType.DETECTED,
  'SCREEN_SHARE_ATTEMPT',
  'SCREEN_MIRRORING',
  'MULTI_MONITOR',
]);

export function normalizeSecurityEventType(type) {
  const t = String(type || '');
  if (t === 'SCREEN_SHARE_ATTEMPT' || t === 'SCREEN_MIRRORING' || t === 'MULTI_MONITOR') {
    return CaptureEventType.DETECTED;
  }
  return t;
}

/**
 * Parse security policy from assessment.config (proctoring + optional security block).
 */
export function parseAssessmentSecurityPolicy(assessmentConfigRaw) {
  let cfg = assessmentConfigRaw;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = {};
    }
  }
  const p = cfg?.proctoring || {};
  const sec = cfg?.security || {};

  const proctor = parseProctoringConfig(cfg);

  const maxViolations = Math.max(0, Number(sec.maxViolations ?? p.maxViolations ?? 0) || 0);
  const onMaxViolations = String(sec.onMaxViolations ?? p.onMaxViolations ?? 'TERMINATE').toUpperCase();

  return {
    ...proctor,
    securityEnabled: sec.enabled !== false,
    screenCapture: {
      enabled: sec.screenCapture?.enabled !== false && p.screenCapture !== false,
      onDetect: String(sec.screenCapture?.onDetect ?? p.screenCaptureOnDetect ?? 'PAUSE').toUpperCase(),
    },
    maxViolations,
    onMaxViolations: ['PAUSE', 'TERMINATE', 'LOG'].includes(onMaxViolations) ? onMaxViolations : 'TERMINATE',
    recovery: {
      enabled: sec.recovery?.enabled !== false,
      requireSecurityCheck: sec.recovery?.requireSecurityCheck !== false,
    },
    /** When false (default), security-paused time is excluded from elapsed (timer frozen). */
    pausedTimeCounts: sec.pausedTimeCounts === true,
  };
}

export function getSecurityState(meta) {
  const m = parseSecureModeMeta(meta);
  if (m.securityState) return m.securityState;
  if (m.paused && (m.pauseReason === 'SCREEN_CAPTURE' || m.securityState === SecurityState.SECURITY_PAUSED)) {
    return SecurityState.SECURITY_PAUSED;
  }
  if (m.timerStartedAt) return SecurityState.IN_PROGRESS;
  return SecurityState.SECURITY_CHECK;
}

export function isTimerStarted(session) {
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  if (meta.timerStartedAt || meta.readyAt) return true;
  if (
    meta.securityState === SecurityState.IN_PROGRESS ||
    meta.securityState === SecurityState.SECURITY_PAUSED
  ) {
    return true;
  }
  if (!meta.securityState && session?.startTime) return true;
  return false;
}

export function sessionHasExamActivity(session) {
  if (!session) return false;
  if (Number(session.violationsCount) > 0) return true;
  if (session.responses) {
    try {
      const parsed =
        typeof session.responses === 'string' ? JSON.parse(session.responses) : session.responses;
      const answers = parsed?.rawAnswers || parsed;
      if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) return true;
    } catch {
      /* ignore */
    }
  }
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  return Boolean(meta.readyAt || meta.lastHeartbeatAt);
}

export function initialSecurityMeta(extras = {}) {
  return {
    securityState: SecurityState.SECURITY_CHECK,
    timerStartedAt: null,
    ...extras,
  };
}

export function markTimerReady(meta, now = new Date()) {
  const m = { ...parseSecureModeMeta(meta) };
  const iso = m.timerStartedAt || m.readyAt || now.toISOString();
  m.timerStartedAt = iso;
  m.readyAt = m.readyAt || iso;
  m.securityState = SecurityState.IN_PROGRESS;
  return m;
}

export function applyCaptureSecurityPause(meta, { now = new Date() } = {}) {
  const m = buildPausedMeta(parseSecureModeMeta(meta), { reason: 'SCREEN_CAPTURE' });
  m.securityState = SecurityState.SECURITY_PAUSED;
  m.securityPausedAt = now.toISOString();
  m.lastCaptureEventAt = now.toISOString();
  return m;
}

export function applySecurityRecovery(meta, { now = new Date() } = {}) {
  const m = buildUnlockedMeta(parseSecureModeMeta(meta));
  m.securityState = SecurityState.IN_PROGRESS;
  m.securityRecoveredAt = now.toISOString();
  m.lastCaptureEventAt = null;
  return m;
}

/** Idempotency: same capture incident within window → skip duplicate DB rows. */
export function shouldDedupeCaptureEvent(meta, now = Date.now()) {
  const last = meta?.lastCaptureEventAt ? new Date(meta.lastCaptureEventAt).getTime() : 0;
  if (!Number.isFinite(last)) return false;
  return now - last < 15_000;
}

/**
 * Apply policy after a violation is recorded (violationsCount already incremented).
 * @returns {{ nextMeta, securityPaused, terminate, pauseReason }}
 */
export function evaluateViolationPolicy({
  policy,
  violationType,
  secureMeta,
  violationsCount,
  now = new Date(),
}) {
  const normalized = normalizeSecurityEventType(violationType);
  let nextMeta = { ...parseSecureModeMeta(secureMeta) };
  let securityPaused = false;
  let terminate = false;
  let pauseReason = null;

  if (
    CAPTURE_VIOLATION_TYPES.has(violationType) ||
    normalized === CaptureEventType.DETECTED
  ) {
    if (policy.screenCapture.enabled && policy.screenCapture.onDetect === 'PAUSE') {
      if (!nextMeta.paused && !shouldDedupeCaptureEvent(nextMeta, now.getTime())) {
        nextMeta = applyCaptureSecurityPause(nextMeta, { now });
        securityPaused = true;
        pauseReason = 'SCREEN_CAPTURE';
      } else if (nextMeta.paused) {
        securityPaused = true;
        pauseReason = nextMeta.pauseReason;
      }
    }
  }

  if (policy.maxViolations > 0 && violationsCount >= policy.maxViolations) {
    if (policy.onMaxViolations === 'TERMINATE') {
      terminate = true;
    } else if (policy.onMaxViolations === 'PAUSE' && !nextMeta.paused) {
      nextMeta = applyCaptureSecurityPause(nextMeta, { now });
      securityPaused = true;
      pauseReason = 'MAX_VIOLATIONS';
    }
  }

  return { nextMeta, securityPaused, terminate, pauseReason };
}

export function serializePolicyMeta(meta) {
  return serializeSecureModeMeta(meta);
}
