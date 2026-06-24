import React from 'react';

const VARIANTS = {
  default: 'bg-[#e8dff5] border-[#d4c4eb]',
  blue: 'bg-[#dceaf7] border-[#b8d4ea]',
  green: 'bg-[#dff3e4] border-[#b8e0c4]',
  amber: 'bg-[#fff4e0] border-[#f0d9a8]',
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
      className={`rounded-lg border px-4 py-3 min-h-[88px] flex flex-col justify-center text-left transition-shadow hover:shadow-md ${styles} ${className}`}
    >
      <p className="text-[11px] sm:text-xs text-gray-600 font-medium leading-tight">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value ?? 0}</p>
      {subValue != null && subValue !== '' && (
        <p className="text-[10px] text-gray-500 mt-0.5 tabular-nums">{subValue}</p>
      )}
    </Tag>
  );
}

export function SectionHeader({ title }) {
  return (
    <div className="bg-[#c5d9e8] px-4 py-2 rounded-t-md border border-[#b0c9db] border-b-0">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

export function SectionBody({ children, className = '' }) {
  return (
    <div className={`p-3 sm:p-4 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md ${className}`}>
      {children}
    </div>
  );
}
