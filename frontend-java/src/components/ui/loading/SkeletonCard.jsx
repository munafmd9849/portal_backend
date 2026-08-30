import React from 'react';
import Skeleton from './Skeleton';

/**
 * Generic card placeholder — rounded border + optional header/body blocks.
 */
export default function SkeletonCard({
  className = '',
  showHeader = true,
  bodyLines = 2,
  children,
}) {
  if (children) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
        aria-busy="true"
        aria-label="Loading"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      aria-busy="true"
      aria-label="Loading"
    >
      {showHeader && <Skeleton className="h-4 w-24 mb-3" />}
      {bodyLines > 0 && (
        <div className="space-y-2">
          {Array.from({ length: bodyLines }).map((_, idx) => (
            <Skeleton key={idx} className={`h-4 ${idx === 0 ? 'w-16' : 'w-full'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
