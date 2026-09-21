'use client';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** If true, first column gets a wider shimmer (e.g. name column) */
  wideFirst?: boolean;
}

/**
 * Animated pulse skeleton placeholder for table rows.
 * Renders while paginating, filtering, or waiting for server data.
 */
export function TableSkeleton({ rows = 5, columns = 5, wideFirst = true }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr
          key={rowIdx}
          className="border-b border-[#cacacb] dark:border-[#27272a] animate-pulse"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="py-4 px-4">
              <div
                className={`h-3.5 bg-[#e5e5e5] dark:bg-[#27272a] rounded-sm ${
                  colIdx === 0 && wideFirst ? 'w-3/4' : colIdx === columns - 1 ? 'w-12 ml-auto' : 'w-1/2'
                }`}
              />
              {colIdx === 0 && (
                <div className="h-2.5 bg-[#ebebeb] dark:bg-[#222226] rounded-sm w-1/2 mt-1.5" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Full-width skeleton card for KPI / summary cards.
 */
export function KpiCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] p-6 animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-2.5 bg-[#e5e5e5] dark:bg-[#27272a] rounded-sm w-28" />
            <div className="w-8 h-8 rounded-full bg-[#e5e5e5] dark:bg-[#27272a]" />
          </div>
          <div className="h-8 bg-[#e5e5e5] dark:bg-[#27272a] rounded-sm w-2/3" />
          <div className="h-2.5 bg-[#ebebeb] dark:bg-[#222226] rounded-sm w-1/2" />
        </div>
      ))}
    </>
  );
}
