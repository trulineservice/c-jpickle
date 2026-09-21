'use client';

import React, { useState, useMemo, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Plus,
  Search,
  Calendar,
  Wallet,
  CheckCircle2,
  X,
  Loader2,
  Download,
  LayoutGrid,
  Table as TableIcon,
  Coffee,
  Wrench,
  Zap,
  Coins,
  Utensils,
  Layers,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  RefreshCw,
  Receipt,
  ArrowLeftRight,
} from 'lucide-react';
import { addDailyExpense } from '@/app/actions';
import type { DailyExpenseRecord, DailySalesInvoiceRecord, ExpensesFinancialSummary } from './page';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { DateRangeFilter, type DateRange } from '@/components/ui/date-range-filter';
import type { PaginationMeta } from '@/lib/pagination';

export const EXPENSE_CATEGORIES = [
  { id: 'supplies', label: 'Kitchen & Bar Supplies', icon: Coffee, color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800' },
  { id: 'ice', label: 'Tube Ice & Beverages', icon: Layers, color: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800' },
  { id: 'maintenance', label: 'Court & Facility Fixes', icon: Wrench, color: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800' },
  { id: 'utilities', label: 'Electricity & Water', icon: Zap, color: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800' },
  { id: 'petty_cash', label: 'Petty Cash / Change Fund', icon: Coins, color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' },
  { id: 'staff_food', label: 'Staff Meal & Ops', icon: Utensils, color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800' },
  { id: 'other', label: 'Miscellaneous', icon: Building2, color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' },
];

export default function CashierExpensesClient({
  expenses: initialExpenses,
  todaySalesInvoices = [],
  financialSummary,
  meta,
  activeTab: initialActiveTab,
  dateRange: initialDateRange,
  categoryFilter: initialCategoryFilter,
  manilaTodayStr,
  userRole,
}: {
  expenses: DailyExpenseRecord[];
  todaySalesInvoices?: DailySalesInvoiceRecord[];
  financialSummary: ExpensesFinancialSummary;
  meta: PaginationMeta;
  activeTab: 'invoices' | 'disbursals' | 'ledger';
  dateRange: DateRange;
  categoryFilter: string;
  manilaTodayStr?: string;
  userRole: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<DailyExpenseRecord[]>(initialExpenses);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('supplies');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const todayStr = manilaTodayStr || new Date().toISOString().split('T')[0];

  // URL navigation helper
  const pushParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const handleTabChange = (tab: 'invoices' | 'disbursals' | 'ledger') =>
    pushParams({ tab, page: 1 });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    pushParams({ dateFrom: range.dateFrom, dateTo: range.dateTo, page: 1 });
  };

  const handleCategoryChange = (cat: string) =>
    pushParams({ category: cat, page: 1 });

  const handlePageChange = (page: number) => pushParams({ page });
  const handleLimitChange = (limit: number) => pushParams({ limit, page: 1 });

  // Manual live refresh
  const handleRefresh = () => startTransition(() => router.refresh());

  // Destructure summary (always from full date window)
  const {
    totalPosSales,
    totalPosCashSales,
    totalExpenses,
    totalExpensesCash,
    netMargin,
    marginPercent,
    netCashDrawer,
  } = financialSummary;

  // Today's expenses for optimistic new entries
  const todayExpenses = useMemo(() => expenses.filter((e) => e.expense_date === todayStr), [expenses, todayStr]);

  // Unified ledger: combine server-provided invoices + current-page expenses
  const unifiedLedger = useMemo(() => {
    const inflows = todaySalesInvoices.map((inv) => ({
      id: `in-${inv.id}`,
      type: 'inflow' as const,
      source: inv.source === 'pos' ? 'POS Sales Invoice' : 'Court Walk-in',
      reference: inv.invoice_number,
      description: `${inv.customer_name} (${inv.source === 'pos' ? 'Retail / Cafe' : 'Court Slot'})`,
      payment_method: inv.payment_method,
      amount: inv.total_amount,
      created_at: inv.created_at,
    }));

    const outflows = expenses.map((e) => ({
      id: `out-${e.id}`,
      type: 'outflow' as const,
      source: 'Operational Disbursal',
      reference: e.receipt_reference || 'Disbursal',
      description: e.title,
      payment_method: e.payment_method,
      amount: -e.amount,
      created_at: e.created_at,
    }));

    return [...inflows, ...outflows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [todaySalesInvoices, expenses]);

  const todayTotalExpenses = useMemo(
    () => todayExpenses.reduce((acc, e) => acc + e.amount, 0),
    [todayExpenses]
  );


  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter an expense description.');
      return;
    }

    setIsSubmitting(true);
    const res = await addDailyExpense({
      expenseDate: todayStr,
      category,
      title: title.trim(),
      amount: numAmount,
      paymentMethod,
      receiptReference: receiptRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to record expense.');
    } else {
      setFormSuccess('Expense successfully recorded!');
      const newRec: DailyExpenseRecord = {
        id: 'temp-' + Date.now(),
        expense_date: todayStr,
        category,
        title: title.trim(),
        amount: numAmount,
        payment_method: paymentMethod,
        receipt_reference: receiptRef.trim() || null,
        notes: notes.trim() || null,
        recorded_by: null,
        recorder_name: 'You (Current Session)',
        created_at: new Date().toISOString(),
      };
      setExpenses((prev) => [newRec, ...prev]);

      setTimeout(() => {
        setIsModalOpen(false);
        setTitle('');
        setAmount('');
        setReceiptRef('');
        setNotes('');
        setFormSuccess(null);
      }, 700);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'Reference', 'Customer / Description', 'Amount (PHP)', 'Payment Source', 'Timestamp'];
    const rows = unifiedLedger.map((row) => [
      `"${row.source}"`,
      `"${row.reference}"`,
      `"${row.description.replace(/"/g, '""')}"`,
      row.amount.toFixed(2),
      `"${row.payment_method}"`,
      `"${row.created_at}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CJ_Shift_Reconciliation_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryMeta = (catId: string) => {
    return (
      EXPENSE_CATEGORIES.find((c) => c.id === catId) || {
        id: 'other',
        label: 'Miscellaneous',
        icon: Building2,
        color: 'bg-slate-100 text-slate-800 border-slate-300',
      }
    );
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-300 dark:border-white/15 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C] bg-[#EDF4FC] dark:bg-[#0c1a3b] px-2.5 py-0.5 border border-[#0B2A67]/20 dark:border-[#FFD21C]/30">
              Shift Reconcile &bull; Cash Register Drawer
            </span>
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">&bull;</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline font-mono">
              Date: {todayStr} (Asia/Manila)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            Daily Expenses &amp; Shift Margin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl mt-0.5">
            Real-time reconciliation of today&apos;s cashier sales invoices, operational disbursals, cash drawer float, and net profitability.
          </p>
        </div>

        {/* Global Action Triggers & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none h-9 px-3.5 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-[#0B2A67] dark:text-[#FFD21C] ${isPending ? 'animate-spin' : ''}`} />
            <span>{isPending ? 'Refreshing...' : 'Refresh Margins'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none h-9 px-3.5 text-xs font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#0B2A67] dark:text-[#FFD21C]" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-none text-xs font-black bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] h-9 px-4 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1 stroke-[2.5]" />
            <span>Record Disbursal</span>
          </Button>
        </div>
      </div>

      {/* Date Range Audit Filter */}
      <DateRangeFilter
        value={dateRange}
        onChange={handleDateRangeChange}
        isLoading={isPending}
      />

      {/* ========================================================================= */}
      {/* 4 REAL-TIME SHIFT MARGIN KPI CARDS (CRISP NON-ROUNDED GRID)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Today's POS Gross Sales */}
        <div
          onClick={() => handleTabChange('invoices')}
          className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs hover:border-[#0B2A67] dark:hover:border-[#FFD21C] transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today&apos;s Gross Sales (Inflow)
            </span>
            <div className="w-7 h-7 rounded-none bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black font-mono text-[#007d48] dark:text-emerald-400 tracking-tight">
              ₱{totalPosSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Cash Tender:</span>
            <span className="font-bold text-[#0B2A67] dark:text-white font-mono">
              ₱{totalPosCashSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-[#0B2A67] dark:text-[#FFD21C] font-bold">
            <span>{todaySalesInvoices.length} Invoices Today</span>
            <span className="group-hover:underline">View Sales &rarr;</span>
          </div>
        </div>

        {/* 2. Today's Operational Expenses */}
        <div
          onClick={() => handleTabChange('disbursals')}
          className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today&apos;s Disbursals (Outflow)
            </span>
            <div className="w-7 h-7 rounded-none bg-red-50 dark:bg-red-950/60 text-[#bf050b] flex items-center justify-center border border-red-200 dark:border-red-800">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black font-mono text-[#bf050b] tracking-tight">
              -₱{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cash Disbursals:</span>
            <span className="font-bold text-[#bf050b] font-mono">
              -₱{totalExpensesCash.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            <span>{expenses.length} Records Logged</span>
            <span className="text-[#bf050b] group-hover:underline">View Disbursals &rarr;</span>
          </div>
        </div>

        {/* 3. Net Shift Cash Margin */}
        <div className={`rounded-none border p-4 shadow-xs flex flex-col justify-between ${
          netMargin >= 0
            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
            : 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Net Shift Margin (Profit)
            </span>
            <div className={`w-7 h-7 rounded-none flex items-center justify-center border ${
              netMargin >= 0
                ? 'bg-[#007d48] text-white border-[#005e36]'
                : 'bg-[#bf050b] text-white border-red-700'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className={`text-2xl font-black font-mono tracking-tight ${
              netMargin >= 0 ? 'text-[#007d48] dark:text-emerald-400' : 'text-[#bf050b]'
            }`}>
              ₱{netMargin.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Margin Ratio:</span>
            <span className={`font-black px-2 py-0.5 rounded-none text-[11px] ${
              netMargin >= 0
                ? 'bg-[#FFD21C] text-[#0B2A67]'
                : 'bg-[#bf050b] text-white'
            }`}>
              {marginPercent}% of gross
            </span>
          </div>

          <div className="mt-1 text-[11px] text-slate-500">
            Gross Sales minus operational expenses
          </div>
        </div>

        {/* 4. Net Cash Drawer Reconciliation */}
        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Cash Drawer
            </span>
            <div className="w-7 h-7 rounded-none bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center border border-[#0B2A67]/20 dark:border-[#FFD21C]/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black font-mono text-[#0B2A67] dark:text-white tracking-tight">
              ₱{netCashDrawer.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Physical Drawer:</span>
            <span className="font-bold text-[#0B2A67] dark:text-[#FFD21C]">
              Cash In minus Cash Out
            </span>
          </div>

          <div className="mt-1 text-[11px] text-slate-500">
            Must reconcile with actual cash count
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SHIFT LEDGER TABS & VIEW CONTROLS (NON-ROUNDED RECTANGULAR GRID)         */}
      {/* ========================================================================= */}
      <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        
        {/* Main Tab Switcher */}
        <div className="flex items-center border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-black/40">
          <button
            type="button"
            onClick={() => handleTabChange('invoices')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              initialActiveTab === 'invoices'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales Invoices ({meta.totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('disbursals')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              initialActiveTab === 'disbursals'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Disbursals ({initialActiveTab === 'disbursals' ? meta.totalCount : expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('ledger')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
              initialActiveTab === 'ledger'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Unified Shift Ledger ({unifiedLedger.length})</span>
          </button>
        </div>

        {/* Search Input — removed (server-side search via URL) */}

        {/* Disbursals Specific Category Filter */}
        {initialActiveTab === 'disbursals' && (
          <div className="flex items-center gap-2">
            <select
              value={initialCategoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-9 px-3 rounded-none text-xs font-bold bg-[#EDF4FC] dark:bg-[#0c1a3b] border border-[#0B2A67]/20 dark:border-white/15 text-[#0B2A67] dark:text-white outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASHIER SALES INVOICES (REVENUE INFLOW GRID)                       */}
      {/* ========================================================================= */}
      {initialActiveTab === 'invoices' && (
        <>
          <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-x-auto shadow-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#007d48]" />
                <span>Cashier Sales Invoices (Gross Revenue: ₱{totalPosSales.toFixed(2)})</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All retail POS counter invoices and court walk-in bookings recorded in this shift.
              </p>
            </div>
            <Link
              href="/cashier"
              className="text-xs font-black text-[#0B2A67] dark:text-[#FFD21C] hover:underline"
            >
              + Go to POS Counter &rarr;
            </Link>
          </div>

          <Table>
            <TableHeader className="bg-[#0B2A67] text-white rounded-none">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3 w-32">Time</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Invoice / Ref #</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Customer Name</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Source</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Payment Mode</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Gross Amount (PHP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaySalesInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No sales invoices recorded for the selected date range yet.
                  </TableCell>
                </TableRow>
              ) : (
                todaySalesInvoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 py-3">
                      {formatTime(inv.created_at)}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-mono font-black text-xs text-[#0B2A67] dark:text-[#FFD21C]">
                        {inv.invoice_number}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 font-bold text-xs text-foreground">
                      {inv.customer_name}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border ${
                        inv.source === 'pos'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0B2A67] dark:text-blue-300 border-blue-200 dark:border-blue-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                      }`}>
                        {inv.source === 'pos' ? 'POS Retail' : 'Court Walk-in'}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        {inv.payment_method.toLowerCase().includes('cash') ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{inv.payment_method}</span>
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-[#007d48] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {inv.status}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-right font-black font-mono text-xs sm:text-sm text-[#007d48] dark:text-emerald-400">
                      +₱{inv.total_amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationBar
          meta={meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          label="invoices"
          isLoading={isPending}
        />
      </>
    )}

      {/* ========================================================================= */}
      {/* TAB 2: OPERATIONAL EXPENSES & DISBURSALS                                   */}
      {/* ========================================================================= */}
      {initialActiveTab === 'disbursals' && (
        <>
          <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-x-auto shadow-xs">
              <Table>
                <TableHeader className="bg-[#0B2A67] text-white">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3 w-28">Date</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Category</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Description &amp; Notes</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Payment Source</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Receipt Ref</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Recorded By</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Amount (PHP)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No operational disbursals logged for this date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => {
                      const catMeta = getCategoryMeta(exp.category);
                      const CatIcon = catMeta.icon;
                      const isToday = exp.expense_date === todayStr;

                      return (
                        <TableRow
                          key={exp.id}
                          className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-xs font-mono font-bold text-[#0B2A67] dark:text-white py-3">
                            {exp.expense_date}
                            {isToday && (
                              <span className="block text-[9px] text-[#007d48] font-black uppercase tracking-wider">
                                Today
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase border ${catMeta.color}`}>
                              <CatIcon className="w-3 h-3 shrink-0" />
                              <span>{catMeta.label}</span>
                            </span>
                          </TableCell>

                          <TableCell className="py-3">
                            <span className="font-black text-xs text-[#0B2A67] dark:text-white block">
                              {exp.title}
                            </span>
                            {exp.notes && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 italic block mt-0.5">
                                {exp.notes}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-xs font-medium capitalize">
                            {exp.payment_method === 'cash' ? 'Cash Drawer' : exp.payment_method}
                          </TableCell>

                          <TableCell className="py-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                            {exp.receipt_reference || '—'}
                          </TableCell>

                          <TableCell className="py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {exp.recorder_name || 'Staff'}
                          </TableCell>

                          <TableCell className="py-3 text-right font-black font-mono text-xs sm:text-sm text-[#bf050b]">
                            -₱{exp.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          <PaginationBar
            meta={meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            label="disbursals"
            isLoading={isPending}
          />
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UNIFIED SHIFT CASH LEDGER (INFLOWS & OUTFLOWS CHRONOLOGICALLY)      */}
      {/* ========================================================================= */}
      {initialActiveTab === 'ledger' && (
        <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-x-auto shadow-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-[#FFD21C]" />
                <span>Unified Shift Cash Reconciliation Ledger</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Complete audit trail of sales revenues collected and petty cash disbursals disbursed during this shift.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500">Net Shift Margin: </span>
              <span className={`font-mono font-black text-xs sm:text-sm ${netMargin >= 0 ? 'text-[#007d48]' : 'text-[#bf050b]'}`}>
                {netMargin >= 0 ? '+' : ''}₱{netMargin.toFixed(2)}
              </span>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-[#0B2A67] text-white">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3 w-28">Time</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Type</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Reference</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Customer / Description</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Payment Source</TableHead>
                <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Flow Amount (PHP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No transactions or disbursals logged for today yet.
                  </TableCell>
                </TableRow>
              ) : (
                unifiedLedger.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 py-3">
                      {formatTime(row.created_at)}
                    </TableCell>

                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase border ${
                        row.type === 'inflow'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50 dark:bg-red-950/60 text-[#bf050b] dark:text-red-300 border-red-200 dark:border-red-800'
                      }`}>
                        {row.type === 'inflow' ? '+ Revenue Inflow' : '- Disbursal Outflow'}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 font-mono font-bold text-xs text-[#0B2A67] dark:text-[#FFD21C]">
                      {row.reference}
                    </TableCell>

                    <TableCell className="py-3 text-xs font-semibold text-foreground">
                      {row.description}
                    </TableCell>

                    <TableCell className="py-3 text-xs font-medium capitalize">
                      {row.payment_method}
                    </TableCell>

                    <TableCell className={`py-3 text-right font-black font-mono text-xs sm:text-sm ${
                      row.amount >= 0 ? 'text-[#007d48] dark:text-emerald-400' : 'text-[#bf050b]'
                    }`}>
                      {row.amount >= 0 ? `+₱${row.amount.toFixed(2)}` : `-₱${Math.abs(row.amount).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD SHIFT EXPENSE MODAL (CRISP NON-ROUNDED)                           */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 p-6 shadow-2xl max-w-lg w-full text-foreground space-y-4 rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-[#bf050b] text-white flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Record Shift Disbursal
                  </h3>
                  <p className="text-[11px] text-slate-500">Log petty cash out or operational expense</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-none text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-[#bf050b] font-semibold">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-[#007d48] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Expense Amount (₱ PHP) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-base text-[#0B2A67] dark:text-[#FFD21C]">
                    ₱
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 pl-8 text-base font-mono font-black rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Description / Purpose *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 2 Sacks Tube Ice for Cafe, Court net clamps..."
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs font-semibold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Category
                  </Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-[#071E4B]">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Payment Source
                  </Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-bold rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white"
                  >
                    <option value="cash">Cash Register Drawer</option>
                    <option value="gcash">Store GCash</option>
                    <option value="bank_transfer">Bank / Owner Card</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Receipt / OR Reference Number (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. OR-98412 or invoice #"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="h-9 text-xs font-mono rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  Notes (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Purchased from local market, approved by manager"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs rounded-none bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/15"
                />
              </div>

              <div className="pt-2 flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-9 text-xs font-bold rounded-none border-slate-300 dark:border-white/15 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-9 text-xs bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] rounded-none font-black shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording...
                    </span>
                  ) : (
                    'Record Expense'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
