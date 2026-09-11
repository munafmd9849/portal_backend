import React from 'react';

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5 border-[1.5px]',
  md: 'h-5 w-5 border-2',
  lg: 'h-7 w-7 border-2',
};

const TONE_CLASS = {
  primary: 'border-slate-200 border-t-indigo-600',
  white: 'border-white/30 border-t-white',
  muted: 'border-slate-200 border-t-slate-400',
  teal: 'border-teal-100 border-t-teal-500',
};

/**
 * Minimal ring spinner — buttons, inline refresh, compact spots.
 */
export default function Spinner({ size = 'md', tone = 'primary', className = '' }) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.primary;

  return (
    <span
      className={`inline-block shrink-0 rounded-full animate-spin ${toneClass} ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
