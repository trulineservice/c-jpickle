'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ReceiptText,
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
  ShoppingCart,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { addDailyExpense, deleteDailyExpense } from '@/app/actions';
import type { DailyExpenseRecord } from './page';

const EXPENSE_CATEGORIES = [
  { id: 'supplies', label: 'Kitchen & Bar Supplies' },
  { id: 'ice', label: 'Tube Ice & Beverages' },
  { id: 'maintenance', label: 'Court & Facility Maintenance' },
  { id: 'utilities', label: 'Electricity, Water & Internet' },
  { id: 'petty_cash', label: 'Petty Cash Disbursal / Change Fund' },
  { id: 'staff_food', label: 'Staff Meal & Emergency Ops' },
  { id: 'other', label: 'Miscellaneous' },
];

export default function CashierExpensesClient({
  expenses: initialExpenses,
  todayPosSales,
  todayPosCashSales,
  userRole,
}: {
  expenses: DailyExpenseRecord[];
  todayPosSales: number;
  todayPosCashSales: number;
  userRole: string;
}) {
  const [expenses, setExpenses] = useState<DailyExpenseRecord[]>(initialExpenses);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'all'>('today');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filtering
  const filteredExpenses = expenses.filter((e) => {
    // Date filter
    if (dateFilter === 'today' && e.expense_date !== todayStr) return false;
    if (dateFilter === '7days' && e.expense_date < sevenDaysAgo) return false;

    // Category filter
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const match =
        e.title.toLowerCase().includes(q) ||
        (e.receipt_reference && e.receipt_reference.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.recorder_name && e.recorder_name.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Today's Expense Metrics
  const todayExpenses = expenses.filter((e) => e.expense_date === todayStr);
  const todayTotalExpenses = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayCashExpenses = todayExpenses
    .filter((e) => e.payment_method === 'cash')
    .reduce((acc, e) => acc + e.amount, 0);

  // Shift Margins
  const todayNetMargin = todayPosSales - todayTotalExpenses;
  const todayMarginPercent =
    todayPosSales > 0 ? Math.round((todayNetMargin / todayPosSales) * 100) : 0;
  const netCashDrawer = todayPosCashSales - todayCashExpenses;

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
      // Optimistic append
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
      }, 800);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount (PHP)', 'Payment Method', 'Receipt No', 'Notes', 'Logged By'];
    const rows = filteredExpenses.map((e) => [
      `"${e.expense_date}"`,
      `"${e.category}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      `"${e.payment_method}"`,
      `"${e.receipt_reference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${e.recorder_name || 'Staff'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `CJ_Shift_Expenses_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '—';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1440px] mx-auto space-y-6 text-foreground font-sans">
      {/* Header & Record CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cacacb] dark:border-[#222226] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Operations
            </span>
            <span className="text-xs text-[#cacacb] dark:text-[#27272a]">•</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
              Shift Financial Disbursals
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display uppercase tracking-tight text-foreground">
            DAILY EXPENSES &amp; SHIFT MARGIN
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Record operating expenses (ice, cups, court fixes, petty cash out) and track real-time net shift cash drawer margin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 h-9 px-4 text-xs font-semibold rounded-full cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Record Shift Expense
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-[#cacacb] dark:border-[#27272a] text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Real-time Shift Margin Ribbon (Sales vs Expenses vs Margin) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Today's POS Gross Sales */}
        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#007d48] dark:text-[#10b981]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Today&apos;s POS Sales</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#007d48] dark:text-[#10b981]">
              ₱{todayPosSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              Cash: ₱{todayPosCashSales.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* 2. Today's Operational Expenses */}
        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#d30005] dark:text-red-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Today&apos;s Expenses</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#d30005] dark:text-red-400">
              -₱{todayTotalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              {todayExpenses.length} operational disbursal{todayExpenses.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        {/* 3. Net Shift Cash Margin */}
        <Card className={`border shadow-xs ${
          todayNetMargin >= 0
            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
        }`}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Net Shift Margin</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className={`text-2xl font-bold font-mono ${todayNetMargin >= 0 ? 'text-[#007d48] dark:text-[#10b981]' : 'text-[#d30005]'}`}>
              ₱{todayNetMargin.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] font-semibold text-[#707072] dark:text-[#8a8a93]">
              Margin: <span className="text-foreground">{todayMarginPercent}%</span> of daily gross
            </p>
          </CardContent>
        </Card>

        {/* 4. Cash Drawer Reconciliation */}
        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Net Cash Drawer</span>
              <Wallet className="w-4 h-4 text-[#707072]" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              ₱{netCashDrawer.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              Cash In - Cash Disbursals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#121215] p-4 border border-[#cacacb] dark:border-[#222226]">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description, receipt #..."
            className="pl-9 h-9 text-xs bg-[#f5f5f5] dark:bg-black rounded-full border border-[#cacacb] dark:border-[#27272a]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-full text-xs font-semibold bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-foreground outline-none cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Date Segmented Filter */}
          <div className="flex items-center border border-[#cacacb] dark:border-[#27272a] rounded-full p-0.5 bg-[#f5f5f5] dark:bg-[#18181c]">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              Today ({todayExpenses.length})
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                dateFilter === '7days'
                  ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              All History
            </button>
          </div>
        </div>
      </div>

      {/* Main Expenses Registry Table */}
      <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226]">
              <TableRow className="border-[#cacacb] dark:border-[#222226]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground w-28">Date</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Category</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Description</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Payment Channel</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Receipt / Reference</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Logged By</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Amount (PHP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[#707072] text-xs font-medium">
                    No expense records found for this date selection.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => {
                  const catObj = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
                  const isToday = exp.expense_date === todayStr;

                  return (
                    <TableRow
                      key={exp.id}
                      className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors"
                    >
                      <TableCell className="text-xs font-mono text-foreground">
                        {exp.expense_date}
                        {isToday && (
                          <span className="block text-[10px] text-[#007d48] font-bold">Today</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] dark:text-[#a1a1aa] border border-[#cacacb] dark:border-[#27272a]">
                          {catObj ? catObj.label : exp.category}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground">{exp.title}</span>
                        {exp.notes && (
                          <span className="block text-[11px] text-[#707072] dark:text-[#8a8a93] italic">
                            {exp.notes}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                          {exp.payment_method}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-[#707072] dark:text-[#8a8a93]">
                        {exp.receipt_reference || '—'}
                      </TableCell>

                      <TableCell className="text-xs text-[#707072] dark:text-[#8a8a93]">
                        {exp.recorder_name || 'Staff'}
                      </TableCell>

                      <TableCell className="text-right text-xs font-bold font-mono text-[#d30005] dark:text-red-400">
                        -₱{exp.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Record Shift Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
                Financial Disbursal
              </span>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Record Shift Expense
              </h3>
              <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                Log operational expenses or petty cash out to keep the register drawer reconciled.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 text-[#d30005] text-xs font-semibold mb-3">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-[#007d48] text-xs font-semibold mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5 pt-1">
              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Expense Amount (₱ PHP) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-foreground">
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
                    className="h-11 pl-8 text-base font-mono font-bold bg-[#f5f5f5] dark:bg-black rounded-xl"
                  />
                </div>
              </div>

              {/* Title / Description */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Description / Purpose *
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 2 Sacks Tube Ice for Cafe"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 text-xs bg-[#f5f5f5] dark:bg-black rounded-xl"
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Category
                  </Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#27272a] rounded-xl outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Payment Source
                  </Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#27272a] rounded-xl outline-none"
                  >
                    <option value="cash">Cash Register Drawer</option>
                    <option value="gcash">Store GCash</option>
                    <option value="bank_transfer">Bank / Owner Card</option>
                  </select>
                </div>
              </div>

              {/* Receipt Reference */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Receipt / OR Reference Number (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. OR-98412 or invoice #"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="h-10 text-xs font-mono bg-[#f5f5f5] dark:bg-black rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Additional Notes (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Purchased from local market, approved by manager"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10 text-xs bg-[#f5f5f5] dark:bg-black rounded-xl"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-10 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-xl font-bold cursor-pointer"
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
