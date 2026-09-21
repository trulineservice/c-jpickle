import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CashierExpensesClient from './cashier-expenses-client';

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

export default async function CashierExpensesPage() {
  const supabase = await createClient();

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
    if (profile?.role === 'coordinator') {
      redirect('/cashier/schedule');
    }
    redirect('/dashboard');
  }

  // 1. Fetch Expenses with profile join
  const { data: rawExpenses } = await supabase
    .from('daily_expenses')
    .select(`
      id,
      expense_date,
      category,
      title,
      amount,
      payment_method,
      receipt_reference,
      notes,
      recorded_by,
      created_at,
      profiles:recorded_by ( full_name )
    `)
    .order('created_at', { ascending: false });

  const expenses: DailyExpenseRecord[] = (rawExpenses || []).map((e) => {
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
      recorder_name: prof?.full_name || 'Staff Cashier',
      created_at: e.created_at,
    };
  });

  // 2. Compute today's full window in Asia/Manila (UTC+8)
  const manilaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const startOfManilaDayUTC = new Date(`${manilaDateStr}T00:00:00+08:00`).toISOString();
  const endOfManilaDayUTC = new Date(`${manilaDateStr}T23:59:59.999+08:00`).toISOString();

  // 3. Fetch Today's POS transactions & Walk-In bookings concurrently
  const [
    { data: rawTodayTx },
    { data: rawTodayBookings }
  ] = await Promise.all([
    supabase
      .from('pos_transactions')
      .select('id, invoice_number, customer_name, total_amount, gross_amount, payment_method, status, created_at')
      .gte('created_at', startOfManilaDayUTC)
      .lte('created_at', endOfManilaDayUTC)
      .neq('status', 'voided')
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id, guest_name, total_price, payment_method, status, created_at')
      .gte('created_at', startOfManilaDayUTC)
      .lte('created_at', endOfManilaDayUTC)
      .in('status', ['paid', 'checked_in', 'walk_in'])
      .order('created_at', { ascending: false }),
  ]);

  const posInvoices: DailySalesInvoiceRecord[] = (rawTodayTx || []).map((tx) => ({
    id: tx.id,
    invoice_number: tx.invoice_number || `SI-${tx.id.slice(0, 8).toUpperCase()}`,
    customer_name: tx.customer_name || 'Retail Customer',
    total_amount: Number(tx.total_amount) || 0,
    payment_method: tx.payment_method || 'Cash',
    status: tx.status,
    created_at: tx.created_at,
    source: 'pos' as const,
  }));

  const bookingInvoices: DailySalesInvoiceRecord[] = (rawTodayBookings || []).map((b) => ({
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

  const todayPosSales = todaySalesInvoices.reduce(
    (acc, tx) => acc + tx.total_amount,
    0
  );

  const todayPosCashSales = todaySalesInvoices
    .filter((tx) => (tx.payment_method || '').toLowerCase().includes('cash'))
    .reduce((acc, tx) => acc + tx.total_amount, 0);

  return (
    <CashierExpensesClient
      expenses={expenses}
      todayPosSales={todayPosSales}
      todayPosCashSales={todayPosCashSales}
      todaySalesInvoices={todaySalesInvoices}
      manilaTodayStr={manilaDateStr}
      userRole={profile.role}
    />
  );
}

