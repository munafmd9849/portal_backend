import React from 'react';
import Skeleton from './Skeleton';

/**
 * Filter / search row placeholder.
 */
export default function SkeletonFilterBar({ fields = 4, className = '' }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      aria-busy="true"
      aria-label="Loading filters"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
