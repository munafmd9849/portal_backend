import React from 'react';

const STEP_TONES = [
  { card: 'bg-white border-slate-200', label: 'text-sky-700', value: 'text-slate-900' },
  { card: 'bg-white border-amber-200', label: 'text-amber-700', value: 'text-amber-900' },
  { card: 'bg-white border-indigo-200', label: 'text-indigo-700', value: 'text-indigo-900' },
  { card: 'bg-white border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900' },
  { card: 'bg-white border-green-200', label: 'text-green-700', value: 'text-green-900' },
];

export default function FunnelBar({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div className="flex flex-wrap gap-2.5 items-stretch">
      {steps.map((step, idx) => {
        const tone = STEP_TONES[idx % STEP_TONES.length];
        return (
          <div key={step.id || step.label} className="flex items-center gap-2 min-w-0">
            <div
              className={`rounded-lg px-3 py-3 min-h-[88px] min-w-[110px] border shadow-sm flex flex-col justify-center ${tone.card}`}
            >
              <p className={`text-xs font-medium leading-tight ${tone.label}`}>{step.label}</p>
              <p className={`text-2xl font-semibold tabular-nums mt-1 ${tone.value}`}>{step.count ?? 0}</p>
            </div>
            {idx < steps.length - 1 && (
              <span className="text-slate-300 text-lg hidden sm:inline" aria-hidden>›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
