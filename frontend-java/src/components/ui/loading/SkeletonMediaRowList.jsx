import React from 'react';
import Skeleton from './Skeleton';

/**
 * List rows with thumbnail — stories, announcements, mock interview drives.
 */
export default function SkeletonMediaRowList({ rows = 5, className = '' }) {
  return (
    <ul className={`divide-y divide-slate-100 ${className}`} aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, idx) => (
        <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
          <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
            <Skeleton className="h-3 w-2/3 max-w-sm" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
