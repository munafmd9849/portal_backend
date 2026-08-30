import React from 'react';
import Skeleton from './Skeleton';
import SkeletonCard from './SkeletonCard';

export function SkeletonCompanyCard({ className = '' }) {
  return (
    <SkeletonCard className={`p-5 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-11 h-11 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-14 rounded-md" />
    </SkeletonCard>
  );
}

/**
 * Grid of card placeholders — applicants hub, recommendations, etc.
 */
export default function SkeletonCardGrid({
  count = 6,
  columns = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  className = '',
  Card = SkeletonCompanyCard,
}) {
  return (
    <div className={`grid ${columns} gap-4 ${className}`} aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} />
      ))}
    </div>
  );
}
