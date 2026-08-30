import React from 'react';
import Skeleton from './Skeleton';
import SkeletonCard from './SkeletonCard';

/**
 * Stat card grid — matches AdminHome / dashboard stat rows (4-up by default).
 */
export default function SkeletonStatsGrid({
  count = 4,
  className = '',
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}) {
  return (
    <div className={`grid ${columns} gap-4 ${className}`} aria-busy="true" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} showHeader bodyLines={1}>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16" />
        </SkeletonCard>
      ))}
    </div>
  );
}
