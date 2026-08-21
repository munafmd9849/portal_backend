/**
 * Remaining exam time from session.startTime + assessment duration (server clock).
 * Respects opt-in pause lock (tab-switch) via secureModeMeta — inactive unless paused.
 */

import { getEffectiveElapsedSeconds, pauseSnapshot } from './assessmentPauseLock.js';

export function getSessionRemainingSeconds(session, durationMinutes, now = new Date()) {
  const duration = Number(durationMinutes);
  const totalSeconds = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
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
  return {
    ...session,
    durationMinutes: duration,
    remainingSeconds,
    timeExpired: remainingSeconds <= 0,
    paused: pause.paused,
    pauseReason: pause.pauseReason,
    tabSwitchCount: pause.tabSwitchCount,
  };
}

/** Practice coding tests may reset the clock after a timed-out in-progress attempt. */
export function allowsPracticeTimerReset(assessment) {
  return assessment?.type === 'CODING_TEST';
}
