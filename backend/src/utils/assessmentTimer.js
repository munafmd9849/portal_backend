/**
 * Remaining exam time from session.startTime + assessment duration (server clock).
 * Respects opt-in pause lock and admin-extended time via secureModeMeta.
 */

import { getEffectiveElapsedSeconds, pauseSnapshot, parseSecureModeMeta } from './assessmentPauseLock.js';
import { isTimerStarted } from './assessmentSecurityPolicy.js';

export function getSessionTotalSeconds(session, durationMinutes) {
  const duration = Number(durationMinutes);
  const base = (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60;
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  const extra = Math.max(0, Number(meta.extraSeconds) || 0);
  return base + extra;
}

export function getSessionRemainingSeconds(session, durationMinutes, now = new Date()) {
  const totalSeconds = getSessionTotalSeconds(session, durationMinutes);
  const elapsed = getEffectiveElapsedSeconds(session, now);
  if (!getTimerAnchorNeeded(session)) return totalSeconds;
  return Math.max(0, totalSeconds - elapsed);
}

function getTimerAnchorNeeded(session) {
  const meta = parseSecureModeMeta(session?.secureModeMeta);
  if (meta.timerStartedAt || meta.readyAt) return true;
  if (meta.securityState === 'IN_PROGRESS' || meta.securityState === 'SECURITY_PAUSED') {
    return Boolean(session?.startTime);
  }
  if (!meta.securityState && session?.startTime) return true;
  return false;
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
    focusStrikeCount: pause.focusStrikeCount,
    extraSeconds: Number(meta.extraSeconds) || 0,
    timerStarted: isTimerStarted(session),
    timerStartedAt: pause.timerStartedAt,
    securityState: pause.securityState,
    questionOrder: Array.isArray(meta.questionOrder) ? meta.questionOrder : null,
    optionOrders: meta.optionOrders && typeof meta.optionOrders === 'object' ? meta.optionOrders : null,
    clientDeviceId: meta.clientDeviceId || null,
  };
}

/** Practice coding tests may reset the clock after a timed-out in-progress attempt. */
export function allowsPracticeTimerReset(assessment) {
  return assessment?.type === 'CODING_TEST';
}
