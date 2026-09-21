import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CashierExpensesClient from './cashier-expenses-client';
import {
  parsePaginationParams,
  buildRangeFromPage,
  buildPaginationMeta,
  getManilaToday,
  getManilaDateWindow,
  type PaginationMeta,
} from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export interface DailyExpenseRecord {
  id: string;
  expense_date: string;
  category: string;
  title: string;
  amount: number;
  payment_method: string;
  receipt_reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorder_name?: string;
  created_at: string;
}

export interface DailySalesInvoiceRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  source: 'pos' | 'walk_in';
}

export interface ExpensesFinancialSummary {
  totalPosSales: number;
  totalPosCashSales: number;
  totalExpenses: number;
  totalExpensesCash: number;
  netMargin: number;
  marginPercent: number;
  netCashDrawer: number;
}

export default async function CashierExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    if (profile?.role === 'coordinator') redirect('/cashier/schedule');
    redirect('/dashboard');
  }

  // 1. Parse params
  const today = getManilaToday();
  const { page, limit, dateFrom, dateTo, tab, category } = parsePaginationParams(sp, {
    limit: 25,
    dateFrom: today,
    dateTo: today,
    tab: 'invoices',
    category: 'all',
  });

  const effectiveDateFrom = dateFrom || today;
  const effectiveDateTo = dateTo || today;
  const activeTab = (['invoices', 'disbursals', 'ledger'] as const).includes(
    tab as 'invoices' | 'disbursals' | 'ledger'
  )
    ? (tab as 'invoices' | 'disbursals' | 'ledger')
    : 'invoices';

  const { startISO: startFrom } = getManilaDateWindow(effectiveDateFrom);
  const { endISO: endTo } = getManilaDateWindow(effectiveDateTo);
  const { from, to } = buildRangeFromPage(page, limit);

  // 2. Determine which tab drives pagination
  const isPosTab = activeTab === 'invoices' || activeTab === 'ledger';
  const isDisbursalsTab = activeTab === 'disbursals' || activeTab === 'ledger';

  // 3. Run all queries in parallel
  const [
    // Full-window POS summary (no pagination)
    { data: allPosTx },
    // Full-window bookings summary (no pagination)
    { data: allBookings },
    // Full-window expense summary (no pagination)
    { data: allExpenses },
    // Paginated POS invoices (for invoices tab)
    { data: rawPosTxPage, count: posTxCount },
    // Paginated walk-in bookings (merged with POS for invoices tab)
    { data: rawBookingsPage },
    // Paginated disbursals
    { data: rawExpensesPage, count: expensesCount },
    // Expense recorder names
  ] = await Promise.all([
    // Summary: all POS tx in window
    supabase
      .from('pos_transactions')
      .select('total_amount, payment_method, status')
      .gte('created_at', startFrom)
      .lte('created_at', endTo)
      .neq('status', 'voided'),

    // Summary: all bookings (walk-in) in window
    supabase
      .from('bookings')
      .select('total_price, payment_method, status')
      .gte('created_at', startFrom)
      .lte('created_at', endTo)
      .in('status', ['paid', 'checked_in', 'walk_in']),

    // Summary: all expenses in window
    supabase
      .from('daily_expenses')
      .select('amount, payment_method')
      .gte('created_at', startFrom)
      .lte('created_at', endTo),

    // Paginated POS invoices
    supabase
      .from('pos_transactions')
      .select('id, invoice_number, customer_name, total_amount, gross_amount, payment_method, status, created_at', { count: 'exact' })
      .gte('created_at', startFrom)
      .lte('created_at', endTo)
      .neq('status', 'voided')
      .order('created_at', { ascending: false })
      .range(from, to),

    // Paginated walk-in bookings (small — fetch all in window for merging)
    supabase
      .from('bookings')
      .select('id, guest_name, total_price, payment_method, status, created_at')
      .gte('created_at', startFrom)
      .lte('created_at', endTo)
      .in('status', ['paid', 'checked_in', 'walk_in'])
      .order('created_at', { ascending: false }),

    // Paginated disbursals (with optional category filter)
    (() => {
      let q = supabase
        .from('daily_expenses')
        .select(`
          id, expense_date, category, title, amount,
          payment_method, receipt_reference, notes,
          recorded_by, created_at,
          profiles:recorded_by ( full_name )
        `, { count: 'exact' })
        .gte('created_at', startFrom)
        .lte('created_at', endTo)
        .order('created_at', { ascending: false });
      if (category !== 'all') q = q.eq('category', category);
      return q.range(from, to);
    })(),
  ]);

  // 4. Financial summary (from full-window data)
  const totalPosSales = (allPosTx ?? []).reduce((s, t) => s + Number(t.total_amount || 0), 0);
  const totalWalkInSales = (allBookings ?? []).reduce((s, b) => s + Number(b.total_price || 0), 0);
  const totalPosCashSales =
    (allPosTx ?? [])
      .filter((t) => (t.payment_method ?? '').toLowerCase().includes('cash'))
      .reduce((s, t) => s + Number(t.total_amount || 0), 0) +
    (allBookings ?? [])
      .filter((b) => !(b.payment_method ?? '').toLowerCase().includes('qr') && !(b.payment_method ?? '').toLowerCase().includes('gcash'))
      .reduce((s, b) => s + Number(b.total_price || 0), 0);

  const combinedSales = totalPosSales + totalWalkInSales;
  const totalExpenses = (allExpenses ?? []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExpensesCash = (allExpenses ?? [])
    .filter((e) => e.payment_method === 'cash')
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const netMargin = combinedSales - totalExpenses;
  const marginPercent = combinedSales > 0 ? Math.round((netMargin / combinedSales) * 100) : 0;
  const netCashDrawer = totalPosCashSales - totalExpensesCash;

  const financialSummary: ExpensesFinancialSummary = {
    totalPosSales: combinedSales,
    totalPosCashSales,
    totalExpenses,
    totalExpensesCash,
    netMargin,
    marginPercent,
    netCashDrawer,
  };

  // 5. Map POS invoices page
  const posInvoices: DailySalesInvoiceRecord[] = (rawPosTxPage ?? []).map((tx) => ({
    id: tx.id,
    invoice_number: tx.invoice_number || `SI-${tx.id.slice(0, 8).toUpperCase()}`,
    customer_name: tx.customer_name || 'Retail Customer',
    total_amount: Number(tx.total_amount) || 0,
    payment_method: tx.payment_method || 'Cash',
    status: tx.status,
    created_at: tx.created_at,
    source: 'pos' as const,
  }));

  const bookingInvoices: DailySalesInvoiceRecord[] = (rawBookingsPage ?? []).map((b) => ({
    id: b.id,
    invoice_number: `COURT-${b.id.slice(0, 8).toUpperCase()}`,
    customer_name: b.guest_name || 'Walk-in Player',
    total_amount: Number(b.total_price) || 0,
    payment_method: (b.payment_method || '').toLowerCase().includes('qr') ? 'GCash / QR Ph' : 'Cash',
    status: b.status,
    created_at: b.created_at,
    source: 'walk_in' as const,
  }));

  const todaySalesInvoices: DailySalesInvoiceRecord[] = [...posInvoices, ...bookingInvoices].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 6. Map disbursals
  const expenses: DailyExpenseRecord[] = (rawExpensesPage ?? []).map((e) => {
    const prof = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    return {
      id: e.id,
      expense_date: e.expense_date,
      category: e.category,
      title: e.title,
      amount: Number(e.amount) || 0,
      payment_method: e.payment_method || 'cash',
      receipt_reference: e.receipt_reference,
      notes: e.notes,
      recorded_by: e.recorded_by,
      recorder_name: (prof as { full_name?: string } | null)?.full_name || 'Staff Cashier',
      created_at: e.created_at,
    };
  });

  // 7. Pagination meta — differs by active tab
  const invoiceTotal = (posTxCount ?? 0) + (rawBookingsPage ?? []).length;
  const disbursalTotal = expensesCount ?? 0;
  const paginatedTotal = activeTab === 'disbursals' ? disbursalTotal : invoiceTotal;
  const meta: PaginationMeta = buildPaginationMeta(page, limit, paginatedTotal);

  return (
    <CashierExpensesClient
      expenses={expenses}
      todaySalesInvoices={todaySalesInvoices}
      financialSummary={financialSummary}
      meta={meta}
      activeTab={activeTab}
      dateRange={{ dateFrom: effectiveDateFrom, dateTo: effectiveDateTo }}
      categoryFilter={category}
      manilaTodayStr={today}
      userRole={profile.role}
    />
  );
}
