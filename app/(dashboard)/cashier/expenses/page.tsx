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

  // 2. Fetch Today's POS transactions to calculate shift margin
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: rawTodayTx } = await supabase
    .from('pos_transactions')
    .select('id, total_amount, payment_method, status, created_at')
    .gte('created_at', `${todayStr}T00:00:00Z`)
    .neq('status', 'voided');

  const todayPosSales = (rawTodayTx || []).reduce(
    (acc, tx) => acc + (Number(tx.total_amount) || 0),
    0
  );

  const todayPosCashSales = (rawTodayTx || [])
    .filter((tx) => (tx.payment_method || '').toLowerCase() === 'cash')
    .reduce((acc, tx) => acc + (Number(tx.total_amount) || 0), 0);

  return (
    <CashierExpensesClient
      expenses={expenses}
      todayPosSales={todayPosSales}
      todayPosCashSales={todayPosCashSales}
      userRole={profile.role}
    />
  );
}
