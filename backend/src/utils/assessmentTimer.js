/**
 * Remaining exam time from session.startTime + assessment duration (server clock).
 * Respects opt-in pause lock and admin-extended time via secureModeMeta.
 */

import { getEffectiveElapsedSeconds, pauseSnapshot, parseSecureModeMeta } from './assessmentPauseLock.js';

export function getSessionTotalSeconds(session, durationMinutes) {
  const duration = Number(durationMinutes);
  const base = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  const extra = Math.max(0, Number(meta.extraSeconds) || 0);
  return base + extra;
}

export function getSessionRemainingSeconds(session, durationMinutes, now = new Date()) {
  const totalSeconds = getSessionTotalSeconds(session, durationMinutes);
  if (!session?.startTime) return totalSeconds;

  const elapsed = getEffectiveElapsedSeconds(session, now);
  return Math.max(0, totalSeconds - elapsed);
}

export function isSessionTimeExpired(session, durationMinutes, now = new Date()) {
  return getSessionRemainingSeconds(session, durationMinutes, now) <= 0;
}

export function enrichSessionWithTimer(session, durationMinutes, now = new Date()) {
  const duration = Number(durationMinutes) || 60;
  const remainingSeconds = getSessionRemainingSeconds(session, duration, now);
  const pause = pauseSnapshot(session?.secureModeMeta);
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  return {
    ...session,
    durationMinutes: duration,
    remainingSeconds,
    timeExpired: remainingSeconds <= 0,
    paused: pause.paused,
    pauseReason: pause.pauseReason,
    tabSwitchCount: pause.tabSwitchCount,
    extraSeconds: Number(meta.extraSeconds) || 0,
    questionOrder: Array.isArray(meta.questionOrder) ? meta.questionOrder : null,
    optionOrders: meta.optionOrders && typeof meta.optionOrders === 'object' ? meta.optionOrders : null,
    clientDeviceId: meta.clientDeviceId || null,
  };
}

/** Practice coding tests may reset the clock after a timed-out in-progress attempt. */
export function allowsPracticeTimerReset(assessment) {
  return assessment?.type === 'CODING_TEST';
}
