'use client';

import { type PaginationMeta } from '@/lib/pagination';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationBarProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  label?: string;
  isLoading?: boolean;
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

/**
 * Compute visible page numbers with ellipsis markers.
 * Always shows first, last, current ±2, collapsing the rest to '...'.
 */
function buildPageButtons(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);

  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

export function PaginationBar({
  meta,
  onPageChange,
  onLimitChange,
  label = 'records',
  isLoading = false,
}: PaginationBarProps) {
  const { page, limit, totalCount, totalPages, from, to } = meta;
  const pageButtons = buildPageButtons(page, totalPages);

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 text-xs font-bold border border-[#cacacb] dark:border-[#27272a] transition-colors select-none';
  const btnActive =
    'bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] border-[#0B2A67] dark:border-[#FFD21C]';
  const btnInactive =
    'bg-white dark:bg-[#121215] text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] cursor-pointer';
  const btnDisabled =
    'opacity-40 cursor-not-allowed bg-white dark:bg-[#121215] text-[#a0a0a2]';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#cacacb] dark:border-[#27272a]">
      {/* Record counter */}
      <div className="flex items-center gap-3 text-xs text-[#707072] dark:text-[#8a8a93]">
        {isLoading ? (
          <span className="animate-pulse bg-[#e5e5e5] dark:bg-[#27272a] rounded h-4 w-40 inline-block" />
        ) : totalCount === 0 ? (
          <span>No {label} found</span>
        ) : (
          <span>
            Showing <strong className="text-foreground">{from}–{to}</strong> of{' '}
            <strong className="text-foreground">{totalCount.toLocaleString()}</strong> {label}
          </span>
        )}

        {/* Rows per page */}
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider">Rows</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-7 text-xs border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-foreground px-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0B2A67] dark:focus:ring-[#FFD21C] disabled:opacity-50"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-0.5">
        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className={`${btnBase} ${page <= 1 || isLoading ? btnDisabled : btnInactive}`}
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className={`${btnBase} ${page <= 1 || isLoading ? btnDisabled : btnInactive}`}
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page buttons */}
        {pageButtons.map((btn, idx) =>
          btn === '...' ? (
            <span key={`ellipsis-${idx}`} className={`${btnBase} border-transparent cursor-default text-[#a0a0a2]`}>
              …
            </span>
          ) : (
            <button
              key={btn}
              onClick={() => onPageChange(btn)}
              disabled={isLoading}
              className={`${btnBase} ${btn === page ? btnActive : isLoading ? btnDisabled : btnInactive}`}
            >
              {btn}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className={`${btnBase} ${page >= totalPages || isLoading ? btnDisabled : btnInactive}`}
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className={`${btnBase} ${page >= totalPages || isLoading ? btnDisabled : btnInactive}`}
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
