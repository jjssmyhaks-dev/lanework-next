"use client";

export default function ShipmentsLoading() {
  return (
    <div className="p-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
