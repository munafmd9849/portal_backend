import React from 'react';
import Skeleton from './Skeleton';

/**
 * Row of compact funnel / manager stat cards (FunnelStatCard, CrManagerCard shape).
 */
export default function SkeletonFunnelRow({ count = 5, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg px-3 py-3 min-h-[88px] min-w-[110px] flex-1 border border-slate-200 bg-white shadow-sm"
        >
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-7 w-10" />
        </div>
      ))}
    </div>
  );
}
