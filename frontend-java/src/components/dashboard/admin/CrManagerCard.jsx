import React, { useState } from 'react';

const VALUE_COLORS = {
  green: 'text-emerald-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
  blue: 'text-sky-700',
  gray: 'text-slate-600',
};

const STATUS_BADGE = {
  green: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
  red: 'bg-rose-50 text-rose-800 border border-rose-100',
  amber: 'bg-amber-50 text-amber-800 border border-amber-100',
  gray: 'bg-slate-50 text-slate-700 border border-slate-200',
  blue: 'bg-sky-50 text-sky-800 border border-sky-100',
};

/**
 * Admin / CR manager stat card — matches My Stats / FunnelStatCard look.
 */
export default function CrManagerCard({
  name,
  value,
  breakdown = [],
  variant = 'manager',
  popoverAlign = 'start',
  adminStatusLabel,
}) {
  const [hovered, setHovered] = useState(false);
  const isJds = variant === 'jds';
  const expandable = !isJds && breakdown.length > 0;

  const cardClass = isJds
    ? 'rounded-lg px-3 py-3 min-h-[88px] min-w-[120px] flex-1 flex flex-col justify-center border shadow-sm bg-white border-indigo-200'
    : `rounded-lg px-3 py-3 min-h-[88px] min-w-[110px] flex-1 flex flex-col justify-center border shadow-sm bg-white border-emerald-200 transition-all duration-200 ${
        expandable ? 'cursor-pointer' : ''
      } ${hovered && expandable ? 'ring-2 ring-indigo-200' : ''}`;

  const labelClass = isJds ? 'text-xs font-medium leading-tight text-indigo-700' : 'text-xs font-medium leading-tight text-emerald-700';
  const valueClass = isJds
    ? 'text-2xl font-semibold text-indigo-900 tabular-nums mt-1'
    : 'text-2xl font-semibold text-emerald-900 tabular-nums mt-1';

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cardClass}>
        <p className={`${labelClass} truncate`} title={name}>
          {name}
        </p>
        <p className={valueClass}>{value ?? 0}</p>
        {!isJds && adminStatusLabel && (
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{adminStatusLabel}</p>
        )}
      </div>

      {expandable && hovered && (
        <div
          className={`absolute z-[100] min-w-[260px] max-w-[300px] top-full mt-1
            bg-white rounded-lg border border-slate-200 shadow-lg py-2 px-3
            opacity-0 translate-y-1 animate-[crPopoverIn_0.2s_ease-out_forwards]
            ${popoverAlign === 'end' ? 'right-0 left-auto' : 'left-0'}`}
          role="tooltip"
        >
          <p className="text-xs font-semibold text-slate-900 mb-2 pb-1 border-b border-slate-100 truncate" title={name}>
            {name}
          </p>
          {breakdown.map((item, idx) => (
            <div
              key={item.label}
              className={`flex justify-between gap-4 py-1.5 text-sm ${idx < breakdown.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <span className="text-slate-600 shrink-0">{item.label}</span>
              {item.value != null ? (
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${STATUS_BADGE[item.color] || STATUS_BADGE.gray}`}>
                  {item.value}
                </span>
              ) : (
                <span className={`font-semibold tabular-nums ${VALUE_COLORS[item.color] || 'text-slate-900'}`}>
                  {item.count ?? 0}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes crPopoverIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
