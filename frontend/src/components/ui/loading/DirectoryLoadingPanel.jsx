import React from 'react';
import LoadingPanel from './LoadingPanel';

/**
 * @deprecated Prefer skeleton loaders for content areas. Kept for backward compatibility.
 */
export default function DirectoryLoadingPanel({
  title = 'Loading…',
  subtitle,
  className = '',
}) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-10 shadow-sm sm:p-12 ${className}`}>
      <LoadingPanel
        title={title}
        subtitle={subtitle}
        showSubtitle={Boolean(subtitle)}
        minHeight=""
        className="py-4"
      />
    </div>
  );
}

export { default as DirectoryLoadingSpinner } from './BrandSpinner';
