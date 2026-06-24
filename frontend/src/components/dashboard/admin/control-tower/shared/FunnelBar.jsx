import React from 'react';

export default function FunnelBar({ steps = [] }) {
  if (!steps.length) return null;
  const max = Math.max(...steps.map((s) => s.count || 0), 1);

  return (
    <div className="flex flex-wrap gap-2 items-stretch">
      {steps.map((step, idx) => (
        <div key={step.id || step.label} className="flex items-center gap-2 min-w-0">
          <div
            className="rounded-lg bg-[#e8dff5] border border-[#d4c4eb] px-3 py-3 min-w-[100px] flex-1"
            style={{ minWidth: `${Math.max(80, (step.count / max) * 140)}px` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 truncate">{step.label}</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{step.count ?? 0}</p>
          </div>
          {idx < steps.length - 1 && (
            <span className="text-gray-400 text-lg hidden sm:inline" aria-hidden>›</span>
          )}
        </div>
      ))}
    </div>
  );
}
