/**
 * Exam pause lock stored in AssessmentSession.secureModeMeta.
 */

export function parseSecureModeMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...raw };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function serializeSecureModeMeta(meta) {
  return JSON.stringify(meta && typeof meta === 'object' ? meta : {});
}

export function parseProctoringConfig(assessmentConfigRaw) {
  let cfg = assessmentConfigRaw;
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      cfg = {};
    }
  }
  const p = cfg?.proctoring || {};
  return {
    /** Default ON — lock after grace tab switches. */
    pauseOnTabSwitch: p.pauseOnTabSwitch !== false,
    tabSwitchGraceCount: Math.max(0, Number(p.tabSwitchGraceCount ?? 2) || 2),
    fullscreenRequired: p.fullscreen !== false,
    cameraRequired: p.webcam !== false,
    micRequired: p.mic !== false,
  };
}

export const ADMIN_FOCUS_VIOLATIONS = new Set(['FULLSCREEN_EXIT', 'WINDOW_BLUR']);
/** Immediate admin-only pause (devtools / view source only — display share is client-blank + auto-restore). */
export const ADMIN_STRICT_VIOLATIONS = new Set(['DEVTOOLS_SHORTCUT', 'VIEW_SOURCE']);
export const FULLSCREEN_PAUSE_REASON = 'FULLSCREEN_EXIT';
export const FOCUS_LOST_PAUSE_REASON = 'FOCUS_LOST';
export const DEVTOOLS_PAUSE_REASON = 'DEVTOOLS';
export const HEARTBEAT_PAUSE_REASON = 'HEARTBEAT_MISSED';
export const SCREEN_SHARE_PAUSE_REASON = 'SCREEN_SHARE';

export function getTimerAnchorIso(session) {
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  if (meta.timerStartedAt) return meta.timerStartedAt;
  if (meta.readyAt) return meta.readyAt;
  if (
    meta.securityState === 'IN_PROGRESS' ||
    meta.securityState === 'SECURITY_PAUSED'
  ) {
    if (session?.startTime) return new Date(session.startTime).toISOString();
  }
  if (!meta.securityState && session?.startTime) {
    return new Date(session.startTime).toISOString();
  }
  return null;
}

/** Students cannot self-unlock server pauses — admin only. */
export function isSelfResumablePauseReason() {
  return false;
}

/** Ignore blur + fullscreen-exit fired together within a short window. */
export function shouldDedupeFocusPause(meta, now = Date.now()) {
  const lastAt = meta?.lastFocusStrikeAt ? new Date(meta.lastFocusStrikeAt).getTime() : 0;
  if (!Number.isFinite(lastAt)) return false;
  return now - lastAt < 3000;
}

/** First fullscreen exit or window blur → immediate admin-only pause. */
export function applyAdminFocusPause(meta, { violationType, now = Date.now() } = {}) {
  const secure = { ...parseSecureModeMeta(meta) };
  if (!ADMIN_FOCUS_VIOLATIONS.has(violationType)) {
    return {
      nextMeta: secure,
      paused: Boolean(secure.paused),
      pauseReason: secure.pauseReason || null,
      deduped: true,
    };
  }
  if (secure.paused) {
    return {
      nextMeta: secure,
      paused: true,
      pauseReason: secure.pauseReason,
      deduped: true,
    };
  }
  if (shouldDedupeFocusPause(secure, now)) {
    return { nextMeta: secure, paused: false, pauseReason: null, deduped: true };
  }

  const reason =
    violationType === 'WINDOW_BLUR' ? FOCUS_LOST_PAUSE_REASON : FULLSCREEN_PAUSE_REASON;
  const nextMeta = buildPausedMeta(
    {
      ...secure,
      lastFocusStrikeAt: new Date(now).toISOString(),
    },
    { reason }
  );
  return { nextMeta, paused: true, pauseReason: reason, deduped: false };
}

/** DevTools / view-source → immediate admin-only pause. */
export function applyAdminStrictPause(meta, { violationType, now = Date.now() } = {}) {
  const secure = { ...parseSecureModeMeta(meta) };
  if (!ADMIN_STRICT_VIOLATIONS.has(violationType)) {
    return {
      nextMeta: secure,
      paused: Boolean(secure.paused),
      pauseReason: secure.pauseReason || null,
      deduped: true,
    };
  }
  if (secure.paused) {
    return {
      nextMeta: secure,
      paused: true,
      pauseReason: secure.pauseReason,
      deduped: true,
    };
  }
  if (shouldDedupeFocusPause(secure, now)) {
    return { nextMeta: secure, paused: false, pauseReason: null, deduped: true };
  }
  const reason = DEVTOOLS_PAUSE_REASON;
  const nextMeta = buildPausedMeta(
    { ...secure, lastFocusStrikeAt: new Date(now).toISOString() },
    { reason }
  );
  return { nextMeta, paused: true, pauseReason: reason, deduped: false };
}

export function isSessionPaused(sessionOrMeta) {
  const meta =
    sessionOrMeta && typeof sessionOrMeta === 'object' && 'secureModeMeta' in sessionOrMeta
      ? parseSecureModeMeta(sessionOrMeta.secureModeMeta)
      : parseSecureModeMeta(sessionOrMeta);
  return Boolean(meta.paused);
}

/** Elapsed seconds excluding paused time (active pause freezes the clock). */
export function getEffectiveElapsedSeconds(session, now = new Date()) {
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  const anchorIso = getTimerAnchorIso(session);
  if (!anchorIso) return 0;

  const started = new Date(anchorIso);
  if (Number.isNaN(started.getTime())) return 0;

  const totalPausedMs = Number(meta.totalPausedMs) || 0;
  let activePauseMs = 0;
  if (meta.paused && meta.pauseStartedAt) {
    const pauseStart = new Date(meta.pauseStartedAt);
    if (!Number.isNaN(pauseStart.getTime())) {
      activePauseMs = Math.max(0, now.getTime() - pauseStart.getTime());
    }
  }

  const rawElapsedMs = Math.max(0, now.getTime() - started.getTime());
  return Math.floor(Math.max(0, rawElapsedMs - totalPausedMs - activePauseMs) / 1000);
}

export function buildPausedMeta(existingMeta, { reason = 'TAB_SWITCH', tabSwitchCount, focusStrikeCount } = {}) {
  const meta = { ...parseSecureModeMeta(existingMeta) };
  if (meta.paused) return meta;
  meta.paused = true;
  meta.pauseReason = reason;
  meta.pauseStartedAt = new Date().toISOString();
  if (tabSwitchCount != null) meta.tabSwitchCount = tabSwitchCount;
  if (focusStrikeCount != null) meta.focusStrikeCount = focusStrikeCount;
  return meta;
}

export function buildUnlockedMeta(existingMeta) {
  const meta = { ...parseSecureModeMeta(existingMeta) };
  const now = Date.now();
  let totalPausedMs = Number(meta.totalPausedMs) || 0;
  if (meta.paused && meta.pauseStartedAt) {
    const pauseStart = new Date(meta.pauseStartedAt).getTime();
    if (Number.isFinite(pauseStart)) {
      totalPausedMs += Math.max(0, now - pauseStart);
    }
  }
  meta.paused = false;
  meta.pauseReason = null;
  meta.pauseStartedAt = null;
  meta.totalPausedMs = totalPausedMs;
  meta.unlockedAt = new Date(now).toISOString();
  meta.lastFocusStrikeAt = null;
  return meta;
}

export function pauseSnapshot(meta) {
  const m = parseSecureModeMeta(meta);
  return {
    paused: Boolean(m.paused),
    pauseReason: m.pauseReason || null,
    pauseStartedAt: m.pauseStartedAt || null,
    tabSwitchCount: Number(m.tabSwitchCount) || 0,
    focusStrikeCount: Number(m.focusStrikeCount) || 0,
    totalPausedMs: Number(m.totalPausedMs) || 0,
    unlockedAt: m.unlockedAt || null,
    securityState: m.securityState || null,
    timerStartedAt: m.timerStartedAt || null,
    securityPausedAt: m.securityPausedAt || null,
  };
}
