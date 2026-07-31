/**
 * Skeleton Loader for Job Description Modal
 * Shows while job details are being fetched
 */

import React from 'react';
import { Skeleton, SkeletonText } from '../../ui/loading';

const JobDescriptionSkeleton = () => {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b">
        <div className="flex px-6">
          <Skeleton className="h-12 w-24 rounded-t mr-4" />
          <Skeleton className="h-12 w-32 rounded-t mr-4" />
          <Skeleton className="h-12 w-24 rounded-t" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-6">
        {/* Key Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 p-4 rounded-lg">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>

        {/* Countdown Timer Skeleton */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded px-3 py-2">
                  <Skeleton className="h-6 w-8 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description Skeleton */}
        <div>
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="bg-gray-50 p-4 rounded-lg">
            <SkeletonText lines={3} />
          </div>
        </div>

        {/* Responsibilities Skeleton */}
        <div>
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionSkeleton;
