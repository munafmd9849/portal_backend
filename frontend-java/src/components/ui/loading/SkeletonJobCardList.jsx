import React from 'react';
import Skeleton from './Skeleton';

/**
 * Stacked job cards — Manage Jobs, job postings list.
 */
export default function SkeletonJobCardList({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 px-2 sm:px-3 ${className}`} aria-busy="true" aria-label="Loading jobs">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md shrink-0" />
          </div>
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
