import React from 'react';

const SettingsPageSkeleton = () => {
  return (
    <main className="container px-4 py-8 mx-auto animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-9 bg-gray-300 rounded w-1/4"></div>
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="flex mb-6 border-b border-gray-200">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 px-4 py-2 -mb-px">
            <div className="h-5 bg-gray-300 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Tab Content Skeleton - General Structure */}
      <div className="space-y-8">
        {/* Section Skeleton */}
        {[...Array(2)].map((_, i) => (
          <section key={i} className="p-6 mb-8 bg-white rounded-lg shadow-md">
            <div className="h-7 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4"></div>
              <div className="h-10 bg-gray-200 rounded w-1/2"></div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default SettingsPageSkeleton;