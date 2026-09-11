import React from 'react';
import Skeleton from './Skeleton';

/**
 * Card with table-shaped shimmer — stats tables, admin lists, etc. (not directory tables).
 */
export default function SkeletonTableCard({ rows = 5, className = '' }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="flex gap-4 pb-2 border-b border-gray-100">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
