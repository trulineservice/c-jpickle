/**
 * Shared pagination utilities for server-side paginated modules.
 * Parses URL searchParams → Supabase range offsets, computes totals.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  from: number; // 1-indexed display
  to: number;   // 1-indexed display
}

export interface ParsedPaginationParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
  tab: string;
  dateFrom: string;
  dateTo: string;
  category: string;
}

const VALID_LIMITS = [10, 25, 50, 100] as const;
type ValidLimit = (typeof VALID_LIMITS)[number];

function isValidLimit(n: number): n is ValidLimit {
  return (VALID_LIMITS as readonly number[]).includes(n);
}

/**
 * Parse pagination-related URL searchParams into typed values.
 * All params are optional and fall back to safe defaults.
 */
export function parsePaginationParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaults: Partial<ParsedPaginationParams> = {}
): ParsedPaginationParams {
  const getString = (key: string, fallback = '') => {
    const val = searchParams[key];
    return typeof val === 'string' ? val : fallback;
  };

  const rawPage = parseInt(getString('page', '1'), 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const rawLimit = parseInt(getString('limit', String(defaults.limit ?? 25)), 10);
  const limit = isValidLimit(rawLimit) ? rawLimit : (defaults.limit ?? 25);

  return {
    page,
    limit,
    search: getString('search', defaults.search ?? ''),
    sort: getString('sort', defaults.sort ?? ''),
    tab: getString('tab', defaults.tab ?? ''),
    dateFrom: getString('dateFrom', defaults.dateFrom ?? ''),
    dateTo: getString('dateTo', defaults.dateTo ?? ''),
    category: getString('category', defaults.category ?? 'all'),
  };
}

/**
 * Compute Supabase 0-indexed range bounds from 1-indexed page/limit.
 * Supabase `.range(from, to)` is inclusive on both ends.
 */
export function buildRangeFromPage(page: number, limit: number): { from: number; to: number } {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

/**
 * Build a PaginationMeta object from query results.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(page, totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, totalCount);
  return { page: safePage, limit, totalCount, totalPages, from, to };
}

/**
 * Get today's date string in Asia/Manila timezone (YYYY-MM-DD).
 */
export function getManilaToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Build ISO UTC boundary timestamps for a Manila-timezone date string.
 * Returns { startISO, endISO } suitable for Supabase `.gte/.lte` filters.
 */
export function getManilaDateWindow(dateStr: string): { startISO: string; endISO: string } {
  return {
    startISO: new Date(`${dateStr}T00:00:00+08:00`).toISOString(),
    endISO: new Date(`${dateStr}T23:59:59.999+08:00`).toISOString(),
  };
}

/**
 * Resolve a preset shorthand into a { dateFrom, dateTo } Manila date pair.
 */
export function resolvePresetDates(preset: string, todayStr: string): { dateFrom: string; dateTo: string } {
  const today = new Date(`${todayStr}T12:00:00+08:00`);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

  switch (preset) {
    case 'today':
      return { dateFrom: todayStr, dateTo: todayStr };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = fmt(y);
      return { dateFrom: yStr, dateTo: yStr };
    }
    case '7days': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { dateFrom: fmt(d), dateTo: todayStr };
    }
    case 'month': {
      const m = `${todayStr.slice(0, 7)}-01`;
      return { dateFrom: m, dateTo: todayStr };
    }
    default:
      return { dateFrom: todayStr, dateTo: todayStr };
  }
}
