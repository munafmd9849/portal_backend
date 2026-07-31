import React from 'react';
import Skeleton from './Skeleton';

/**
 * Horizontal stats bar — e.g. Student Directory summary strip.
 */
export default function SkeletonStatsStrip({ count = 3, className = '' }) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5 ${className}`}
      aria-busy="true"
      aria-label="Loading statistics"
    >
      <div className={`grid divide-x divide-gray-100`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="px-3 sm:px-5 space-y-2">
            <Skeleton className="h-3 w-20 mx-auto sm:mx-0" />
            <Skeleton className="h-7 w-12 mx-auto sm:mx-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
