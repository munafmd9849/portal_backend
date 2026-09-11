import React from 'react';
import BrandSpinner from './BrandSpinner';

/**
 * Centered loading panel — clean spinner + simple text.
 */
export default function LoadingPanel({
  title = 'Loading…',
  subtitle,
  spinnerSize = 'lg',
  className = '',
  minHeight = 'min-h-[120px]',
  showSubtitle = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 text-center ${minHeight} ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      <BrandSpinner size={spinnerSize} />
      {title && (
        <p className="mt-4 text-sm font-medium text-slate-600">{title}</p>
      )}
      {showSubtitle && subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
