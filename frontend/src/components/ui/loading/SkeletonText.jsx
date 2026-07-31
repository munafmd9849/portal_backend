import React from 'react';
import Skeleton from './Skeleton';

export default function SkeletonText({ lines = 1, className = '', lineClassName = '' }) {
  if (lines === 1) {
    return <Skeleton className={`h-4 w-full ${lineClassName} ${className}`} />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`h-4 ${idx === lines - 1 ? 'w-3/4' : 'w-full'} ${lineClassName}`}
        />
      ))}
    </div>
  );
}
