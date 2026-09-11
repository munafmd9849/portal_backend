import React from 'react';

/** Matches Admin Home “My Stats” / FunnelStatCard tones */
const VARIANTS = {
  default: {
    card: 'bg-white border-slate-200',
    label: 'text-sky-700',
    value: 'text-slate-900',
    sub: 'text-slate-500',
  },
  blue: {
    card: 'bg-white border-indigo-200',
    label: 'text-indigo-700',
    value: 'text-indigo-900',
    sub: 'text-indigo-600/70',
  },
  green: {
    card: 'bg-white border-emerald-200',
    label: 'text-emerald-700',
    value: 'text-emerald-900',
    sub: 'text-emerald-600/70',
  },
  amber: {
    card: 'bg-white border-amber-200',
    label: 'text-amber-700',
    value: 'text-amber-900',
    sub: 'text-amber-600/70',
  },
};

export default function MetricCard({
  label,
  value,
  subValue,
  variant = 'default',
  className = '',
  onClick,
}) {
  const styles = VARIANTS[variant] || VARIANTS.default;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg px-3 py-3 min-h-[88px] border shadow-sm flex flex-col justify-center text-left transition-all duration-200 hover:ring-2 hover:ring-indigo-200 ${styles.card} ${className}`}
    >
      <p className={`text-xs font-medium leading-tight ${styles.label}`}>{label}</p>
      <p className={`text-2xl font-semibold tabular-nums mt-1 ${styles.value}`}>{value ?? 0}</p>
      {subValue != null && subValue !== '' && (
        <p className={`text-[10px] mt-0.5 tabular-nums ${styles.sub}`}>{subValue}</p>
      )}
    </Tag>
  );
}

export function SectionHeader({ title }) {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

export function SectionBody({ children, className = '' }) {
  return (
    <div className={`p-4 bg-slate-50 ${className}`}>
      {children}
    </div>
  );
}
