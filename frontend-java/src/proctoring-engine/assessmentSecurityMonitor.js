/**
 * Assessment security monitor — normalizes browser signals into canonical security events.
 * Detection adapters live in screenShareGuard.js; policy enforcement is server-authoritative.
 */

import { ProctoringViolationType } from '../proctoring-engine/constants';

export const SecurityEventType = Object.freeze({
  SCREEN_CAPTURE_DETECTED: 'SCREEN_CAPTURE_DETECTED',
  SCREEN_CAPTURE_STOPPED: 'SCREEN_CAPTURE_STOPPED',
});

/** Map legacy/proctoring types → canonical security events for the violation API. */
export function normalizeSecurityEvent(type) {
  const t = String(type || '');
  if (
    t === ProctoringViolationType.SCREEN_SHARE_ATTEMPT ||
    t === ProctoringViolationType.SCREEN_MIRRORING ||
    t === ProctoringViolationType.MULTI_MONITOR ||
    t === SecurityEventType.SCREEN_CAPTURE_DETECTED
  ) {
    return SecurityEventType.SCREEN_CAPTURE_DETECTED;
  }
  if (t === SecurityEventType.SCREEN_CAPTURE_STOPPED) {
    return SecurityEventType.SCREEN_CAPTURE_STOPPED;
  }
  return t;
}

/**
 * @param {object} opts
 * @param {(type: string, details: string, meta?: object) => Promise<any>} opts.logViolation
 * @param {(active: boolean, reason?: string) => void} opts.onCaptureStateChange
 */
export function createAssessmentSecurityMonitor({ logViolation, onCaptureStateChange } = {}) {
  let captureActive = false;

  return {
    async reportCaptureDetected(details, meta = {}) {
      if (captureActive) return { deduped: true };
      captureActive = true;
      onCaptureStateChange?.(true, details);
      const result = await logViolation?.(
        SecurityEventType.SCREEN_CAPTURE_DETECTED,
        details || 'Screen capture/sharing detected',
        { severity: 'CRITICAL', ...meta }
      );
      return result;
    },

    async reportCaptureStopped(details) {
      if (!captureActive) return { deduped: true };
      captureActive = false;
      onCaptureStateChange?.(false, details);
      await logViolation?.(
        SecurityEventType.SCREEN_CAPTURE_STOPPED,
        details || 'Screen capture/sharing stopped',
        { severity: 'LOW' }
      );
      return { stopped: true };
    },

    isCaptureActive() {
      return captureActive;
    },

    reset() {
      captureActive = false;
    },
  };
}
