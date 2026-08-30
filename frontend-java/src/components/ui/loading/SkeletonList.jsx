import React from 'react';
import Skeleton from './Skeleton';

/**
 * List row placeholders — e.g. active drives, table-like rows without fake table chrome.
 */
export default function SkeletonList({ rows = 3, className = '' }) {
  return (
    <ul className={`divide-y divide-slate-200 ${className}`} aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-white">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-28 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
