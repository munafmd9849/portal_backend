/**
 * Client-side fallback; prefer server `remainingSeconds` when resuming a session.
 * Mirrors backend pause-lock elapsed adjustment when secureModeMeta is present.
 */

function parseSecureModeMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getEffectiveElapsedSeconds(session, nowMs) {
  if (!session?.startTime) return 0;
  const started = new Date(session.startTime).getTime();
  if (Number.isNaN(started)) return 0;

  const meta = parseSecureModeMeta(session.secureModeMeta);
  const totalPausedMs = Number(meta.totalPausedMs) || 0;
  let activePauseMs = 0;
  if ((session.paused || meta.paused) && meta.pauseStartedAt) {
    const pauseStart = new Date(meta.pauseStartedAt).getTime();
    if (Number.isFinite(pauseStart)) {
      activePauseMs = Math.max(0, nowMs - pauseStart);
    }
  }

  const rawElapsedMs = Math.max(0, nowMs - started);
  return Math.floor(Math.max(0, rawElapsedMs - totalPausedMs - activePauseMs) / 1000);
}

export function getRemainingSecondsFromSession(session, durationMinutes, now = Date.now()) {
  const duration = Number(durationMinutes);
  const totalSeconds = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
  if (!session?.startTime) return totalSeconds;

  const elapsed = getEffectiveElapsedSeconds(session, now);
  return Math.max(0, totalSeconds - elapsed);
}

export function resolveSessionRemainingSeconds(session, durationMinutes) {
  if (session && Number.isFinite(session.remainingSeconds)) {
    return Math.max(0, session.remainingSeconds);
  }
  return getRemainingSecondsFromSession(session, durationMinutes);
}
