import React from 'react';
import {
  Shield,
  Camera,
  Mic,
  Maximize2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Monitor,
  ScanFace,
} from 'lucide-react';

function StatusItem({ ok, warn, fail, label, icon: Icon }) {
  const tone = fail
    ? 'text-rose-800 bg-rose-50'
    : warn
      ? 'text-amber-800 bg-amber-50'
      : ok
        ? 'text-slate-600'
        : 'text-rose-800 bg-rose-50';
  const iconTone = fail || (!ok && !warn)
    ? 'text-rose-600'
    : warn
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${tone}`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconTone}`} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Compact exam integrity strip — semantic status, not a rainbow of pills.
 */
export default function SecureExamStatusBar({
  status = {},
  violations = 0,
  lastAlert = null,
  className = '',
}) {
  const {
    secureMode = true,
    fullscreen = false,
    camera = false,
    microphone = false,
    online = true,
    multiMonitor = null,
    screenSharing = false,
    face = null,
  } = status;

  const faceFail = face === false;
  const alertText = lastAlert && String(lastAlert).trim();

  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-800">
        <Shield className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
        {secureMode ? 'Secure exam' : 'Monitoring off'}
      </span>

      <span className="hidden sm:block w-px h-4 bg-slate-200 mx-0.5" aria-hidden />

      <StatusItem ok={camera} label={camera ? 'Camera' : 'Camera off'} icon={Camera} />
      <StatusItem
        ok={microphone}
        warn={!microphone}
        label={microphone ? 'Mic' : 'Mic off'}
        icon={Mic}
      />
      {face != null && (
        <StatusItem
          ok={face}
          fail={faceFail}
          label={faceFail ? 'No face' : 'Face'}
          icon={ScanFace}
        />
      )}
      <StatusItem
        ok={fullscreen}
        fail={!fullscreen}
        label={fullscreen ? 'Fullscreen' : 'Exit fullscreen'}
        icon={Maximize2}
      />
      <StatusItem
        ok={online}
        fail={!online}
        label={online ? 'Online' : 'Offline'}
        icon={online ? Wifi : WifiOff}
      />
      {multiMonitor != null && (
        <StatusItem
          ok={!multiMonitor && !screenSharing}
          warn={multiMonitor || screenSharing}
          label={
            screenSharing
              ? 'Screen share'
              : multiMonitor
                ? 'Extra display'
                : 'One display'
          }
          icon={Monitor}
        />
      )}

      {alertText && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" aria-hidden />
          {alertText}
        </span>
      )}

      <span
        className={`ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${
          violations > 0
            ? 'bg-rose-50 text-rose-800'
            : 'text-slate-500'
        }`}
      >
        <AlertTriangle className={`h-3.5 w-3.5 ${violations > 0 ? 'text-rose-600' : 'text-slate-400'}`} aria-hidden />
        {violations} {violations === 1 ? 'flag' : 'flags'}
      </span>
    </div>
  );
}
