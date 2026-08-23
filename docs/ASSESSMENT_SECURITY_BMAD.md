# Assessment Capture Protection — BMAD Security Report

## Architecture

### Current (before this epic)
- Scattered security in `AssessmentApp.jsx`, `ProctoringEngine.js`, `screenShareGuard.js`
- Hybrid enforcement: server pause for tab/focus/devtools; **client-only** blank for screen share
- Timer anchored to `session.startTime` at session create (before proctor ready)
- No `securityState`; no configurable `maxViolations`

### New architecture
```
CaptureDetectionAdapter (screenShareGuard.js)
        ↓
AssessmentSecurityMonitor (assessmentSecurityMonitor.js)
        ↓
ProctoringEngine → logViolation API
        ↓
SecurityPolicyEngine (assessmentSecurityPolicy.js)
        ↓
secureModeMeta JSON (AssessmentSession)
        ↓
resolveActiveExamSession (all mutations)
```

**Trust boundaries**
| Layer | Responsibility |
|-------|----------------|
| Browser | Detect supported signals only |
| Frontend | Blank UI, disable interaction, report events |
| Backend | Authoritative pause, timer, recovery, termination |
| Database | Violations, session meta, answers |

---

## Capture detection

### Browser APIs used
- `navigator.mediaDevices.getDisplayMedia` — **blocked** (in-browser share picker)
- `window.getScreenDetails()` — multi-display (Chrome, permission-gated)
- `window.screen.isExtended` — macOS mirroring / extended desktop
- Display geometry heuristics — mirror/scaled desktop hints on Mac

### Canonical events
- `SCREEN_CAPTURE_DETECTED`
- `SCREEN_CAPTURE_STOPPED`

Legacy types (`SCREEN_SHARE_ATTEMPT`, `SCREEN_MIRRORING`, `MULTI_MONITOR`) normalize to `SCREEN_CAPTURE_DETECTED`.

### Supported scenarios
- In-browser screen/tab/window share attempt
- Multiple monitors (when Screen Details API available)
- macOS extended desktop / mirroring (when OS reports `isExtended`)

### NOT detectable (documented limitations)
- OS Print Screen / Snipping Tool (all environments)
- macOS screenshot shortcuts (Cmd+Shift+3/4/5)
- OBS / hardware capture without browser share API
- Zoom/Teams/Meet capturing outside browser
- Phone camera pointed at screen
- VNC / macOS Screen Sharing to another machine
- Disabling JavaScript / direct API abuse (mitigated by server gates, not detection)

**Do not claim 100% capture prevention.**

---

## Backend changes

| Endpoint | Purpose |
|----------|---------|
| `POST /session/security-ready/:sessionId` | Start authoritative timer (`timerStartedAt`) |
| `POST /session/security-recovery/:sessionId` | Server-authorized resume after re-check |
| `POST /session/violation/:sessionId` | Capture events → `SECURITY_PAUSED` via policy |
| Existing mutations | Reject with **423** when `paused` |

**Session meta fields** (in `secureModeMeta`, no schema migration):
- `securityState`: `SECURITY_CHECK` \| `IN_PROGRESS` \| `SECURITY_PAUSED`
- `timerStartedAt`: authoritative timer anchor
- `securityPausedAt`, `lastCaptureEventAt`

**Policy** (`assessment.config.security` or `proctoring` extensions):
- `screenCapture.onDetect`: `PAUSE` (default)
- `maxViolations` / `onMaxViolations`: `TERMINATE` \| `PAUSE` \| `LOG`
- `recovery.enabled`, `recovery.requireSecurityCheck`

---

## Frontend changes

- `assessmentSecurityMonitor.js` — event normalization + capture incident tracking
- `AssessmentApp.jsx` — white security overlay, Re-check Security, server recovery
- Timer starts after `postSecurityReady` (post proctor boot)
- Interaction blocked while `examPaused` or capture active

---

## Tests

- `e2e/specs/p0-capture-security.spec.js` — CAP-01 through CAP-05
- Simulated via violation API (Playwright cannot trigger real `getDisplayMedia` reliably)
- Manual Chromium checklist required for real share picker / AirPlay

---

## Manual Chromium validation

1. Pass pre-assessment security gate (camera, face, fullscreen, single display)
2. Confirm timer starts only after proctor boots (`security-ready`)
3. Trigger in-browser share (if available) → blank overlay + server pause
4. Stop sharing → Re-check Security → resume
5. Refresh while paused → still paused (server state)
6. Second tab → same session state
7. Document Chrome version + HTTPS (port 5173)

---

## Production recommendation

**GO with documented limitations** for browser-supported capture on Chromium + HTTPS, provided:
- Backend restarted after deploy
- E2E `p0-capture-security` + existing `p0-proctoring` pass
- Admins understand undetectable vectors (phone, OBS, OS screenshots)

**NO-GO** if claiming full screenshot/recording prevention.
