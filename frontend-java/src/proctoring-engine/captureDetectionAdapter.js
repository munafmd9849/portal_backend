/**
 * Narrow abstraction for browser capture signals.
 * Production: real APIs via screenShareGuard.
 * Tests: inject synthetic risk via createTestCaptureDetectionAdapter().
 */
import {
  auditDisplayEnvironment,
  installScreenShareGuard,
  detectMacOs,
} from './screenShareGuard.js';

export { auditDisplayEnvironment, detectMacOs };

export function createCaptureDetectionAdapter({ onRiskChange, pollIntervalMs = 5000 } = {}) {
  return installScreenShareGuard({
    onBlockedAttempt: (source) => onRiskChange?.({ active: true, reason: `Blocked ${source}` }),
    onDisplayRisk: (audit) => onRiskChange?.({ active: true, reason: audit?.reason || 'Display risk' }),
    onDisplayClear: () => onRiskChange?.({ active: false, reason: 'Display risk cleared' }),
  });
}

/** Playwright / unit tests — inject capture on/off without real getDisplayMedia. */
export function createTestCaptureDetectionAdapter({ onRiskChange } = {}) {
  let active = false;
  return {
    async emitCaptureDetected(reason = 'test capture') {
      if (active) return;
      active = true;
      await onRiskChange?.({ active: true, reason });
    },
    async emitCaptureStopped(reason = 'test capture stopped') {
      if (!active) return;
      active = false;
      await onRiskChange?.({ active: false, reason });
    },
    destroy() {},
  };
}
