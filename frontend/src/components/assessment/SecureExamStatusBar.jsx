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
} from 'lucide-react';

function StatusPill({ ok, warn, label, icon: Icon }) {
  const tone = ok
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : warn
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

/**
 * Secure Exam Mode status strip — camera, mic, fullscreen, connectivity, violations.
 */
export default function SecureExamStatusBar({
  status = {},
  violations = 0,
  threshold = 10,
  autoSubmitEnabled = true,
  className = '',
}) {
  const {
    secureMode = true,
    fullscreen = false,
    camera = false,
    microphone = false,
    online = true,
    multiMonitor = null,
  } = status;

  const remaining = Math.max(0, (threshold || 10) - (violations || 0));

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3 py-2 backdrop-blur ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
        <Shield className="h-3.5 w-3.5" />
        {secureMode ? 'Secure Exam Mode' : 'Monitoring Off'}
      </span>

      <StatusPill ok={camera} label={camera ? 'Camera On' : 'Camera Off'} icon={Camera} />
      <StatusPill
        ok={microphone}
        warn={!microphone}
        label={microphone ? 'Mic On' : 'Mic Off'}
        icon={Mic}
      />
      <StatusPill ok={fullscreen} label={fullscreen ? 'Fullscreen' : 'Not Fullscreen'} icon={Maximize2} />
      <StatusPill
        ok={online}
        label={online ? 'Online' : 'Offline'}
        icon={online ? Wifi : WifiOff}
      />
      {multiMonitor != null && (
        <StatusPill
          ok={!multiMonitor}
          warn={multiMonitor}
          label={multiMonitor ? 'Multi-Monitor' : 'Single Display'}
          icon={Monitor}
        />
      )}

      <span
        className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
          violations > 0
            ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        <AlertTriangle className="h-3 w-3" />
        Violations {violations}
        {autoSubmitEnabled ? ` · ${remaining} left` : ''}
      </span>
    </div>
  );
}
