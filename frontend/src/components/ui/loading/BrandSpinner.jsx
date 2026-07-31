import React from 'react';

const SIZE_CLASS = {
  sm: 'h-7 w-7 border-2',
  lg: 'h-9 w-9 border-2',
};

const TONE_CLASS = {
  primary: 'border-slate-200 border-t-indigo-600',
  muted: 'border-slate-200 border-t-slate-400',
};

/**
 * Larger clean ring — auth boot, full-page and panel loading.
 */
export default function BrandSpinner({ size = 'lg', tone = 'primary', className = '' }) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.lg;
  const toneClass = TONE_CLASS[tone] || TONE_CLASS.primary;

  return (
    <span
      className={`inline-block shrink-0 rounded-full animate-spin ${toneClass} ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
