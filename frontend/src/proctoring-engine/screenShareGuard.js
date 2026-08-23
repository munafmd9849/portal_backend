/**
 * Blocks in-browser screen capture and detects Mac/external display mirroring where possible.
 * Note: macOS VNC or sharing to another person outside the browser cannot be detected from the web.
 */

function nowMs() {
  return Date.now();
}

export function detectMacOs() {
  if (typeof navigator === 'undefined') return false;
  const p = navigator.platform || '';
  const ua = navigator.userAgent || '';
  return /Mac/i.test(p) || /Macintosh|Mac OS X/i.test(ua);
}

/**
 * @returns {Promise<{ screenCount: number|null, extended: boolean|null, mirrored: boolean, risk: boolean, reason: string|null }>}
 */
export async function auditDisplayEnvironment() {
  let screenCount = 1;
  let extended = false;
  let mirrored = false;
  let reason = null;

  try {
    if (typeof window.getScreenDetails === 'function') {
      const details = await window.getScreenDetails();
      const screens = details?.screens || [];
      screenCount = Math.max(1, screens.length);
      extended = screenCount > 1;
      if (extended) {
        reason = `Multiple displays detected (${screenCount})`;
      }
      if (typeof details.addEventListener === 'function') {
        // noop — listener attached by installScreenShareGuard
      }
    } else if (typeof window.screen?.isExtended === 'boolean') {
      extended = window.screen.isExtended;
      screenCount = extended ? 2 : 1;
      if (extended) reason = 'Extended display detected (macOS mirroring or second monitor)';
    }
  } catch {
    screenCount = null;
    extended = null;
  }

  // macOS AirPlay / mirror heuristics when Screen Details API is unavailable
  if (!extended && typeof window !== 'undefined' && window.screen) {
    const s = window.screen;
    const innerW = window.innerWidth || 0;
    const innerH = window.innerHeight || 0;
    const screenW = s.width || 0;
    const screenH = s.height || 0;
    const availW = s.availWidth || 0;
    const availH = s.availHeight || 0;

    if (detectMacOs()) {
      const dockOrMenuGap =
        (screenH > 0 && availH > 0 && screenH - availH > 80) ||
        (screenW > 0 && availW > 0 && screenW - availW > 80);
      const fullscreenMismatch =
        document.fullscreenElement &&
        innerW > 0 &&
        screenW > 0 &&
        Math.abs(innerW - screenW) > 120;
      if (fullscreenMismatch && dockOrMenuGap) {
        mirrored = true;
        reason = reason || 'Display mirroring or scaled desktop detected';
      }
    }

    if (
      !reason &&
      typeof s.availLeft === 'number' &&
      (Math.abs(s.availLeft) > 40 || Math.abs(s.availTop) > 40)
    ) {
      extended = true;
      screenCount = Math.max(screenCount || 1, 2);
      reason = 'Secondary display offset detected';
    }
  }

  const risk = Boolean(extended || mirrored || (screenCount != null && screenCount > 1));
  return { screenCount, extended, mirrored, risk, reason };
}

/**
 * Install hooks that block screen capture APIs and notify on attempts.
 * @returns {() => void} uninstall
 */
export function installScreenShareGuard({ onBlockedAttempt, onDisplayRisk, onDisplayClear } = {}) {
  const cleanups = [];
  const notifyAttempt = (source) => {
    try {
      onBlockedAttempt?.(source);
    } catch {
      /* ignore */
    }
  };

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
    const original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async function blockedGetDisplayMedia(...args) {
      notifyAttempt('getDisplayMedia');
      const err = new DOMException(
        'Screen sharing is disabled during this secure exam.',
        'NotAllowedError'
      );
      throw err;
    };
    cleanups.push(() => {
      navigator.mediaDevices.getDisplayMedia = original;
    });
  }

  if (typeof navigator !== 'undefined' && typeof navigator.getDisplayMedia === 'function') {
    const legacy = navigator.getDisplayMedia.bind(navigator);
    navigator.getDisplayMedia = async function blockedLegacyGetDisplayMedia(...args) {
      notifyAttempt('getDisplayMedia_legacy');
      throw new DOMException(
        'Screen sharing is disabled during this secure exam.',
        'NotAllowedError'
      );
    };
    cleanups.push(() => {
      navigator.getDisplayMedia = legacy;
    });
  }

  if (typeof window !== 'undefined' && window.PresentationRequest) {
    const Orig = window.PresentationRequest;
    window.PresentationRequest = function BlockedPresentationRequest(...args) {
      notifyAttempt('PresentationRequest');
      throw new DOMException(
        'Screen presentation is disabled during this secure exam.',
        'NotAllowedError'
      );
    };
    window.PresentationRequest.prototype = Orig.prototype;
    cleanups.push(() => {
      window.PresentationRequest = Orig;
    });
  }

  let auditTimer = null;
  let lastRiskAt = 0;
  let lastRisk = false;
  const runAudit = async () => {
    const audit = await auditDisplayEnvironment();
    if (audit.risk) {
      if (!lastRisk || nowMs() - lastRiskAt > 12_000) {
        lastRiskAt = nowMs();
        try {
          onDisplayRisk?.(audit);
        } catch {
          /* ignore */
        }
      }
      lastRisk = true;
    } else if (lastRisk) {
      lastRisk = false;
      try {
        onDisplayClear?.(audit);
      } catch {
        /* ignore */
      }
    }
    return audit;
  };

  runAudit().catch(() => {});
  auditTimer = setInterval(() => {
    runAudit().catch(() => {});
  }, 5000);

  let screenDetails = null;
  const onScreensChange = () => {
    runAudit().catch(() => {});
  };
  if (typeof window.getScreenDetails === 'function') {
    window
      .getScreenDetails()
      .then((details) => {
        screenDetails = details;
        details.addEventListener('screenschange', onScreensChange);
      })
      .catch(() => {});
  }
  window.addEventListener('resize', onScreensChange);

  cleanups.push(() => {
    if (auditTimer) clearInterval(auditTimer);
    window.removeEventListener('resize', onScreensChange);
    if (screenDetails) {
      try {
        screenDetails.removeEventListener('screenschange', onScreensChange);
      } catch {
        /* ignore */
      }
    }
  });

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  };
}
