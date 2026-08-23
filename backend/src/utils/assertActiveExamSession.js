/**
 * Server-side exam session guards — enforces ownership, device binding, pause, timer, heartbeat.
 */

import {
  parseSecureModeMeta,
  serializeSecureModeMeta,
  isSessionPaused,
  buildPausedMeta,
  pauseSnapshot,
} from './assessmentPauseLock.js';
import { isSessionTimeExpired } from './assessmentTimer.js';
import { initialSecurityMeta } from './assessmentSecurityPolicy.js';

/** Expected client heartbeat interval (ms). */
export const HEARTBEAT_INTERVAL_MS = 25_000;
/** Pause if no heartbeat for this long while IN_PROGRESS. */
export const HEARTBEAT_MISS_MS = 90_000;

export const ALLOWED_VIOLATION_TYPES = new Set([
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
  'NO_FACE_DETECTED',
  'MULTIPLE_FACES',
  'AUDIO_SPIKE',
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'CUT_ATTEMPT',
  'SELECT_ALL',
  'RIGHT_CLICK',
  'TEXT_SELECTION',
  'DEVTOOLS_SHORTCUT',
  'VIEW_SOURCE',
  'PRINT_SCREEN',
  'PRINT_ATTEMPT',
  'MULTI_MONITOR',
  'SCREEN_SHARE_ATTEMPT',
  'SCREEN_MIRRORING',
  'SCREEN_CAPTURE_DETECTED',
  'SCREEN_CAPTURE_STOPPED',
  'SCREEN_RESIZE',
  'WINDOW_MINIMIZE',
  'PAGE_REFRESH',
  'NAVIGATION_ATTEMPT',
  'HISTORY_NAVIGATION',
  'CONNECTIVITY_LOSS',
]);

export function getClientDeviceIdFromRequest(req) {
  const header = req.headers['x-exam-device-id'] || req.headers['X-Exam-Device-Id'];
  const body = req.body?.clientDeviceId;
  const raw = header || body;
  return raw ? String(raw).slice(0, 128) : null;
}

export function isHeartbeatStale(meta, now = Date.now()) {
  const last = meta?.lastHeartbeatAt ? new Date(meta.lastHeartbeatAt).getTime() : NaN;
  if (!Number.isFinite(last)) return false;
  return now - last > HEARTBEAT_MISS_MS;
}

function deviceCheck(meta, clientDeviceId) {
  const bound = meta.clientDeviceId ? String(meta.clientDeviceId) : null;
  if (!bound) {
    if (clientDeviceId) return { ok: true, bindDevice: clientDeviceId };
    return { ok: true };
  }
  if (!clientDeviceId) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Exam device verification required', code: 'DEVICE_REQUIRED' },
    };
  }
  if (bound !== clientDeviceId) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'This attempt is active on another device/browser',
        code: 'DEVICE_CONFLICT',
      },
    };
  }
  return { ok: true };
}

async function maybePauseStaleHeartbeat(prisma, session, meta) {
  if (meta.paused || !isHeartbeatStale(meta)) return { session, meta, paused: false };
  const nextMeta = buildPausedMeta(meta, { reason: 'HEARTBEAT_MISSED' });
  const updated = await prisma.assessmentSession.update({
    where: { id: session.id },
    data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
  });
  return {
    session: updated,
    meta: parseSecureModeMeta(updated.secureModeMeta),
    paused: true,
    pauseReason: 'HEARTBEAT_MISSED',
  };
}

async function maybeBindDevice(prisma, session, meta, clientDeviceId) {
  if (!clientDeviceId || meta.clientDeviceId) return { session, meta };
  const nextMeta = {
    ...meta,
    clientDeviceId: String(clientDeviceId).slice(0, 128),
    deviceClaimedAt: meta.deviceClaimedAt || new Date().toISOString(),
  };
  const updated = await prisma.assessmentSession.update({
    where: { id: session.id },
    data: { secureModeMeta: serializeSecureModeMeta(nextMeta) },
  });
  return { session: updated, meta: parseSecureModeMeta(updated.secureModeMeta) };
}

/**
 * Load and validate a student's in-progress exam session.
 * @returns {{ ok: true, session, meta, assessment, pauseInfo }} | {{ ok: false, status, body }}
 */
export async function resolveActiveExamSession(
  prisma,
  {
    sessionId,
    userId,
    clientDeviceId = null,
    requireUnpaused = true,
    requireNotExpired = true,
    checkHeartbeat = true,
    bindDevice = true,
  } = {}
) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      student: { select: { userId: true, id: true } },
      assessment: { select: { id: true, duration: true, config: true, type: true } },
    },
  });

  if (!session) {
    return { ok: false, status: 404, body: { error: 'Session not found' } };
  }
  if (session.student?.userId !== userId) {
    return { ok: false, status: 403, body: { error: 'Forbidden' } };
  }
  if (session.status !== 'IN_PROGRESS') {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'Assessment already submitted',
        status: session.status,
        sessionId: session.id,
      },
    };
  }

  let meta = parseSecureModeMeta(session.secureModeMeta);
  const device = deviceCheck(meta, clientDeviceId);
  if (!device.ok) return { ok: false, status: device.status, body: device.body };

  let working = session;
  if (bindDevice && device.bindDevice) {
    const bound = await maybeBindDevice(prisma, working, meta, device.bindDevice);
    working = bound.session;
    meta = bound.meta;
  }

  if (checkHeartbeat) {
    const stale = await maybePauseStaleHeartbeat(prisma, working, meta);
    working = stale.session;
    meta = stale.meta;
  }

  const pauseInfo = pauseSnapshot(working.secureModeMeta);
  const duration = working.assessment?.duration;

  if (requireUnpaused && pauseInfo.paused) {
    return {
      ok: false,
      status: 423,
      body: {
        error: 'Exam is paused. Wait for an admin to allow you to continue.',
        paused: true,
        pauseReason: pauseInfo.pauseReason,
        code: 'EXAM_PAUSED',
      },
    };
  }

  if (requireNotExpired && isSessionTimeExpired(working, duration)) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'Assessment time has expired',
        code: 'TIME_EXPIRED',
      },
    };
  }

  return {
    ok: true,
    session: working,
    meta,
    assessment: working.assessment,
    pauseInfo,
  };
}

export function touchHeartbeatMeta(meta, now = new Date()) {
  return {
    ...parseSecureModeMeta(meta),
    lastHeartbeatAt: now.toISOString(),
  };
}

export function mergeDeviceBindingMeta(existingMeta, clientDeviceId) {
  const meta = { ...parseSecureModeMeta(existingMeta) };
  const now = new Date().toISOString();
  if (clientDeviceId) {
    meta.clientDeviceId = String(clientDeviceId).slice(0, 128);
    if (!meta.deviceClaimedAt) meta.deviceClaimedAt = now;
  }
  meta.lastHeartbeatAt = now;
  return meta;
}

/** Initial secureModeMeta for a brand-new session only — never merge onto an existing attempt. */
export function initialSecureMetaExtras(clientDeviceId) {
  const now = new Date().toISOString();
  const device = clientDeviceId
    ? { clientDeviceId: String(clientDeviceId).slice(0, 128), deviceClaimedAt: now }
    : {};
  return {
    ...initialSecurityMeta(device),
    lastHeartbeatAt: now,
  };
}
