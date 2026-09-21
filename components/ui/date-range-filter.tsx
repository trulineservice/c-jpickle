'use client';

import { CalendarDays } from 'lucide-react';
import { getManilaToday } from '@/lib/pagination';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  isLoading?: boolean;
}

const today = getManilaToday();

function subtractDays(from: string, days: number): string {
  const d = new Date(`${from}T12:00:00+08:00`);
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const PRESETS: { label: string; resolve: () => DateRange }[] = [
  { label: 'Today', resolve: () => ({ dateFrom: today, dateTo: today }) },
  {
    label: 'Yesterday',
    resolve: () => {
      const y = subtractDays(today, 1);
      return { dateFrom: y, dateTo: y };
    },
  },
  {
    label: 'Last 7 Days',
    resolve: () => ({ dateFrom: subtractDays(today, 6), dateTo: today }),
  },
  {
    label: 'This Month',
    resolve: () => ({ dateFrom: `${today.slice(0, 7)}-01`, dateTo: today }),
  },
  {
    label: 'Last Month',
    resolve: () => {
      const d = new Date(`${today}T12:00:00+08:00`);
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      return {
        dateFrom: `${year}-${month}-01`,
        dateTo: `${year}-${month}-${lastDay}`,
      };
    },
  },
];

function matchesPreset(value: DateRange, preset: (typeof PRESETS)[number]): boolean {
  const resolved = preset.resolve();
  return value.dateFrom === resolved.dateFrom && value.dateTo === resolved.dateTo;
}

/**
 * Date range audit filter bar with quick presets and custom date pickers.
 * Designed to sit inline above filtered tables.
 */
export function DateRangeFilter({ value, onChange, isLoading = false }: DateRangeFilterProps) {
  const activePreset = PRESETS.find((p) => matchesPreset(value, p));

  const btnBase =
    'h-8 px-3 text-[11px] font-bold uppercase tracking-wider border transition-colors select-none whitespace-nowrap';
  const btnActive =
    'bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] border-[#0B2A67] dark:border-[#FFD21C]';
  const btnInactive =
    'bg-white dark:bg-[#121215] text-[#707072] dark:text-[#8a8a93] border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] cursor-pointer';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-[#cacacb] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#18181c]">
      {/* Label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CalendarDays className="w-3.5 h-3.5 text-[#707072] dark:text-[#8a8a93]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
          Audit Range
        </span>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.resolve())}
            disabled={isLoading}
            className={`${btnBase} ${matchesPreset(value, preset) ? btnActive : btnInactive} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-5 w-px bg-[#cacacb] dark:bg-[#27272a]" />

      {/* Custom date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value.dateFrom}
          max={value.dateTo || today}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
          disabled={isLoading}
          className="h-8 px-2 text-xs border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-foreground focus:outline-none focus:ring-1 focus:ring-[#0B2A67] dark:focus:ring-[#FFD21C] disabled:opacity-50 cursor-pointer"
        />
        <span className="text-xs text-[#a0a0a2]">—</span>
        <input
          type="date"
          value={value.dateTo}
          min={value.dateFrom}
          max={today}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          disabled={isLoading}
          className="h-8 px-2 text-xs border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-foreground focus:outline-none focus:ring-1 focus:ring-[#0B2A67] dark:focus:ring-[#FFD21C] disabled:opacity-50 cursor-pointer"
        />
      </div>

      {/* Active range display (when custom) */}
      {!activePreset && value.dateFrom && value.dateTo && (
        <span className="text-[10px] font-mono text-[#707072] dark:text-[#8a8a93] shrink-0">
          {value.dateFrom} → {value.dateTo}
        </span>
      )}
    </div>
  );
}
