import React from 'react';
import Skeleton from './Skeleton';

/**
 * Table-shaped shimmer — directories, assessments, placement records, etc.
 */
export default function SkeletonTable({
  rows = 8,
  columns = 6,
  className = '',
  minWidth = 'min-w-[640px]',
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className={`overflow-x-auto ${minWidth ? '' : ''}`}>
        <div className={minWidth}>
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-6">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className={`h-3 shrink-0 ${i === 0 ? 'w-28' : 'w-16'}`} />
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, row) => (
              <div key={row} className="px-4 py-3.5 flex items-center gap-6">
                {Array.from({ length: columns }).map((_, col) => (
                  <Skeleton
                    key={col}
                    className={`h-4 shrink-0 ${col === 0 ? 'w-36' : col === columns - 1 ? 'w-14' : 'w-20'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
