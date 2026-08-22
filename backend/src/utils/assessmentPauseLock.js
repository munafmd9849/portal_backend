/**
 * Opt-in exam pause lock (tab-switch) stored in AssessmentSession.secureModeMeta.
 * Default: disabled. Violation-threshold auto-submit has been removed.
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
    pauseOnTabSwitch: p.pauseOnTabSwitch === true,
    tabSwitchGraceCount: Math.max(0, Number(p.tabSwitchGraceCount ?? 2) || 2),
  };
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
  if (!session?.startTime) return 0;
  const started = new Date(session.startTime);
  if (Number.isNaN(started.getTime())) return 0;

  const meta = parseSecureModeMeta(session.secureModeMeta);
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

export function buildPausedMeta(existingMeta, { reason = 'TAB_SWITCH', tabSwitchCount } = {}) {
  const meta = { ...parseSecureModeMeta(existingMeta) };
  if (meta.paused) return meta;
  meta.paused = true;
  meta.pauseReason = reason;
  meta.pauseStartedAt = new Date().toISOString();
  if (tabSwitchCount != null) meta.tabSwitchCount = tabSwitchCount;
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
  return meta;
}

export function pauseSnapshot(meta) {
  const m = parseSecureModeMeta(meta);
  return {
    paused: Boolean(m.paused),
    pauseReason: m.pauseReason || null,
    pauseStartedAt: m.pauseStartedAt || null,
    tabSwitchCount: Number(m.tabSwitchCount) || 0,
    totalPausedMs: Number(m.totalPausedMs) || 0,
    unlockedAt: m.unlockedAt || null,
  };
}
