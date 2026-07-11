import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatViolationLabel } from '../../proctoring-engine/constants';

const SEVERITY_CLASS = {
  LOW: 'border-slate-600 bg-slate-800/60 text-slate-300',
  MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  HIGH: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  CRITICAL: 'border-red-500/50 bg-red-500/20 text-red-100',
};

/**
 * Chronological violation timeline for student exam UI or admin review.
 */
export default function ViolationTimeline({
  items = [],
  emptyLabel = 'No violations recorded yet.',
  compact = false,
  className = '',
}) {
  if (!items.length) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ol className={`space-y-2 ${className}`}>
      {[...items]
        .slice()
        .reverse()
        .map((item, idx) => {
          const severity = item.severity || item.meta?.severity || 'MEDIUM';
          const at = item.at || item.timestamp || item.createdAt;
          const timeLabel = at
            ? new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '—';
          return (
            <li
              key={item.id || `${item.type}-${at}-${idx}`}
              className={`flex gap-3 rounded-lg border px-3 py-2 ${SEVERITY_CLASS[severity] || SEVERITY_CLASS.MEDIUM}`}
            >
              <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${compact ? 'opacity-70' : ''}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">{formatViolationLabel(item.type)}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-70">{severity}</span>
                </div>
                {item.details && (
                  <p className={`mt-0.5 text-slate-300/90 ${compact ? 'text-[11px]' : 'text-xs'}`}>{item.details}</p>
                )}
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] opacity-60">
                  <Clock className="h-3 w-3" />
                  {timeLabel}
                </p>
              </div>
            </li>
          );
        })}
    </ol>
  );
}
