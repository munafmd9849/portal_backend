export const ProctoringViolationType = Object.freeze({
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  NO_FACE_DETECTED: 'NO_FACE_DETECTED',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  AUDIO_SPIKE: 'AUDIO_SPIKE',
  COPY_ATTEMPT: 'COPY_ATTEMPT',
  PASTE_ATTEMPT: 'PASTE_ATTEMPT',
  CUT_ATTEMPT: 'CUT_ATTEMPT',
  SELECT_ALL: 'SELECT_ALL',
  RIGHT_CLICK: 'RIGHT_CLICK',
  TEXT_SELECTION: 'TEXT_SELECTION',
  DEVTOOLS_SHORTCUT: 'DEVTOOLS_SHORTCUT',
  VIEW_SOURCE: 'VIEW_SOURCE',
  PRINT_SCREEN: 'PRINT_SCREEN',
  PRINT_ATTEMPT: 'PRINT_ATTEMPT',
  MULTI_MONITOR: 'MULTI_MONITOR',
  SCREEN_RESIZE: 'SCREEN_RESIZE',
  WINDOW_MINIMIZE: 'WINDOW_MINIMIZE',
  PAGE_REFRESH: 'PAGE_REFRESH',
  NAVIGATION_ATTEMPT: 'NAVIGATION_ATTEMPT',
  HISTORY_NAVIGATION: 'HISTORY_NAVIGATION',
  CONNECTIVITY_LOSS: 'CONNECTIVITY_LOSS',
});

export const ScreenshotCaptureType = Object.freeze({
  PERIODIC: 'PERIODIC',
  EVENT: 'EVENT',
});

/** Violation types that trigger immediate (debounced) evidence capture */
export const EVENT_SCREENSHOT_VIOLATIONS = new Set([
  ProctoringViolationType.TAB_SWITCH,
  ProctoringViolationType.WINDOW_BLUR,
  ProctoringViolationType.FULLSCREEN_EXIT,
  ProctoringViolationType.NO_FACE_DETECTED,
  ProctoringViolationType.MULTIPLE_FACES,
  ProctoringViolationType.DEVTOOLS_SHORTCUT,
  ProctoringViolationType.MULTI_MONITOR,
  ProctoringViolationType.PAGE_REFRESH,
  ProctoringViolationType.NAVIGATION_ATTEMPT,
]);

export const VIOLATION_SEVERITY = Object.freeze({
  [ProctoringViolationType.TAB_SWITCH]: 'HIGH',
  [ProctoringViolationType.WINDOW_BLUR]: 'MEDIUM',
  [ProctoringViolationType.FULLSCREEN_EXIT]: 'HIGH',
  [ProctoringViolationType.NO_FACE_DETECTED]: 'HIGH',
  [ProctoringViolationType.MULTIPLE_FACES]: 'CRITICAL',
  [ProctoringViolationType.AUDIO_SPIKE]: 'LOW',
  [ProctoringViolationType.COPY_ATTEMPT]: 'MEDIUM',
  [ProctoringViolationType.PASTE_ATTEMPT]: 'HIGH',
  [ProctoringViolationType.CUT_ATTEMPT]: 'MEDIUM',
  [ProctoringViolationType.SELECT_ALL]: 'LOW',
  [ProctoringViolationType.RIGHT_CLICK]: 'LOW',
  [ProctoringViolationType.TEXT_SELECTION]: 'LOW',
  [ProctoringViolationType.DEVTOOLS_SHORTCUT]: 'CRITICAL',
  [ProctoringViolationType.VIEW_SOURCE]: 'HIGH',
  [ProctoringViolationType.PRINT_SCREEN]: 'HIGH',
  [ProctoringViolationType.PRINT_ATTEMPT]: 'MEDIUM',
  [ProctoringViolationType.MULTI_MONITOR]: 'MEDIUM',
  [ProctoringViolationType.SCREEN_RESIZE]: 'LOW',
  [ProctoringViolationType.WINDOW_MINIMIZE]: 'MEDIUM',
  [ProctoringViolationType.PAGE_REFRESH]: 'HIGH',
  [ProctoringViolationType.NAVIGATION_ATTEMPT]: 'HIGH',
  [ProctoringViolationType.HISTORY_NAVIGATION]: 'HIGH',
  [ProctoringViolationType.CONNECTIVITY_LOSS]: 'MEDIUM',
});

export const defaultProctoringConfig = Object.freeze({
  enabled: true,
  cameraRequired: true,
  micRequired: false,
  fullscreenRequired: true,
  tabSwitch: true,
  windowBlur: true,
  faceMonitoring: true,
  clipboardGuard: true,
  contextMenuGuard: true,
  selectionGuard: true,
  shortcutGuard: true,
  resizeGuard: true,
  navigationGuard: true,
  multiMonitorWarn: true,
  connectivityMonitor: true,
  faceCheckIntervalMs: 2500,
  noFaceGraceMs: 6500,
  multipleFacesGraceMs: 2500,
  violationCooldownMs: 8000,
  softWarningBeforeCount: true,
  /** @deprecated use periodic snapshot settings below */
  snapshotIntervalMs: 45000,
  periodicSnapshotBaseMs: 180000,
  periodicSnapshotJitterMs: 25000,
  screenshotDebounceMs: 8000,
  snapshotJpegQuality: 0.6,
  snapshotMaxWidth: 640,
  snapshotMaxHeight: 360,
  /** Legacy JPEG frames over socket — use WebRTC live video instead */
  liveFrameToAdmin: false,
  liveFrameIntervalMs: 1000,
  liveFrameMaxWidth: 400,
  liveFrameJpegQuality: 0.45,
  audioMonitoring: false,
  audioRmsThreshold: 0.25,
  audioSpikeConsecutiveSamples: 5,
  autoSubmit: {
    enabled: true,
    threshold: 10,
  },
});

export function getViolationSeverity(type) {
  return VIOLATION_SEVERITY[type] || 'MEDIUM';
}

export function formatViolationLabel(type) {
  return String(type || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
