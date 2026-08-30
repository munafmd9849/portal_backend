import React from 'react';
import SkeletonStatsStrip from './SkeletonStatsStrip';
import SkeletonFilterBar from './SkeletonFilterBar';
import SkeletonTable from './SkeletonTable';

/**
 * Full directory page shimmer — stats + filters + table.
 */
export default function SkeletonDirectoryPage({
  statsCount = 3,
  filterFields = 5,
  tableRows = 10,
  tableColumns = 8,
  className = '',
}) {
  return (
    <div className={`space-y-4 ${className}`} aria-busy="true" aria-label="Loading directory">
      <SkeletonStatsStrip count={statsCount} />
      <SkeletonFilterBar fields={filterFields} />
      <SkeletonTable rows={tableRows} columns={tableColumns} minWidth="min-w-[900px]" />
    </div>
  );
}
