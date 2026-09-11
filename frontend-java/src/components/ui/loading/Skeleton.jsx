import React from 'react';

/**
 * Base shimmer block. Compose into cards, stats grids, lists, etc.
 */
export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`skeleton-shimmer rounded-md ${className}`}
      aria-hidden
      {...props}
    />
  );
}
