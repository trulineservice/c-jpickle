import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminDashboardClient from './admin-dashboard-client';
import type { 
  AdminBookingRecord, 
  AdminMetrics, 
  AdminPosProductRecord, 
  AdminPosTransactionRecord,
  AdminExpenseRecord,
  AdminDutySessionRecord,
} from './admin-dashboard-client';

export const dynamic = 'force-dynamic';

interface RawAdminBooking {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: string;
  payment_method: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  created_at: string;
  courts: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_reason?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  refund_processed_at?: string | null;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // 1. Authenticate & Verify Owner / Admin Role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // 2. Fetch All Data in Parallel (eliminates sequential network waterfall)
  const [
    { data: rawData },
    { data: rawPosTransactions },
    { data: rawProducts },
    { data: settingData },
    { data: rawExpenses },
    { data: rawDutySessions },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id,
        court_id,
        start_time,
        end_time,
        duration_hours,
        total_price,
        status,
        payment_method,
        guest_name,
        guest_email,
        guest_phone,
        created_at,
        refund_wallet_type,
        refund_account_name,
        refund_account_number,
        refund_reason,
        refund_status,
        refund_reference,
        refund_processed_at,
        profiles:profiles!bookings_user_id_fkey ( full_name, phone ),
        courts ( name )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('pos_transactions')
      .select(`
        id,
        invoice_number,
        customer_name,
        cashier_id,
        cashier:profiles!pos_transactions_cashier_id_fkey ( full_name, email, role ),
        total_amount,
        gross_amount,
        vatable_sales,
        vat_amount,
        vat_exempt_sales,
        discount_amount,
        discount_type,
        payment_method,
        status,
        created_at,
        void_reason,
        voided_at
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('pos_products')
      .select('*')
      .order('category', { ascending: true })
      .order('sku', { ascending: true }),
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pos_master_pin')
      .maybeSingle(),
    supabase
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
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('cashier_duty_sessions')
      .select(`
        id,
        cashier_id,
        started_at,
        ended_at,
        status,
        opening_float,
        closing_cash,
        notes,
        created_at,
        profiles:cashier_id ( full_name, email, phone, role )
      `)
      .order('started_at', { ascending: false })
      .limit(100),
  ]);

  const rawBookings = (rawData as unknown as RawAdminBooking[]) || [];
  const posTransactions: AdminPosTransactionRecord[] = (rawPosTransactions || []).map((tx: any) => {
    const prof = Array.isArray(tx.cashier) ? tx.cashier[0] : tx.cashier;
    return {
      id: tx.id,
      invoice_number: tx.invoice_number,
      customer_name: tx.customer_name,
      cashier_id: tx.cashier_id,
      cashier_name: prof?.full_name || 'Staff Member',
      cashier_role: prof?.role || 'cashier',
      total_amount: Number(tx.total_amount) || 0,
      gross_amount: tx.gross_amount !== null ? Number(tx.gross_amount) : null,
      vatable_sales: tx.vatable_sales !== null ? Number(tx.vatable_sales) : null,
      vat_amount: tx.vat_amount !== null ? Number(tx.vat_amount) : null,
      vat_exempt_sales: tx.vat_exempt_sales !== null ? Number(tx.vat_exempt_sales) : null,
      discount_amount: tx.discount_amount !== null ? Number(tx.discount_amount) : null,
      discount_type: tx.discount_type,
      payment_method: tx.payment_method,
      status: tx.status,
      created_at: tx.created_at,
      void_reason: tx.void_reason,
      voided_at: tx.voided_at,
    };
  });
  const posProducts = (rawProducts || []) as AdminPosProductRecord[];
  const masterPin = settingData?.value || process.env.POS_MASTER_PIN || '8888';

  const adminDutySessions: AdminDutySessionRecord[] = (rawDutySessions || []).map((s: any) => {
    const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      cashier_id: s.cashier_id,
      cashier_name: prof?.full_name || 'Staff Member',
      cashier_email: prof?.email || '',
      cashier_phone: prof?.phone || '',
      cashier_role: prof?.role || 'cashier',
      started_at: s.started_at,
      ended_at: s.ended_at,
      status: s.status,
      opening_float: Number(s.opening_float || 0),
      closing_cash: s.closing_cash !== null ? Number(s.closing_cash) : null,
      notes: s.notes,
      created_at: s.created_at,
    };
  });

  const adminExpenses: AdminExpenseRecord[] = (rawExpenses || []).map((e) => {
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
      recorder_name: prof?.full_name || 'Staff Member',
      created_at: e.created_at,
    };
  });

  const activeBookings = rawBookings.filter(
    (b) => !['cancelled', 'expired'].includes(b.status)
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  // Start of this month and last month
  const startOfThisMonth = new Date(currentYear, currentMonth, 1);
  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  const startOfYear = new Date(currentYear, 0, 1);

  let thisMonthRevenue = 0;
  let lastMonthRevenue = 0;
  let ytdRevenue = 0;
  let totalHoursBooked = 0;
  let monthlyHoursBooked = 0;
  let paymongoRevenue = 0;
  let cashRevenue = 0;

  // Sales & Discounts Accumulators
  let posGrossSales = 0;
  let posNetSales = 0;
  let posVatableSales = 0;
  let posVatAmount = 0;
  let posVatExemptSales = 0;
  let posDiscounts = 0;

  for (const b of activeBookings) {
    const bookingDate = new Date(b.created_at || b.start_time);
    const amount = Number(b.total_price) || 0;
    const duration = Number(b.duration_hours) || 1;

    // YTD
    if (bookingDate >= startOfYear) {
      ytdRevenue += amount;
    }

    // This month
    if (bookingDate >= startOfThisMonth) {
      thisMonthRevenue += amount;
      monthlyHoursBooked += duration;
    } else if (bookingDate >= startOfLastMonth && bookingDate <= endOfLastMonth) {
      lastMonthRevenue += amount;
    }

    totalHoursBooked += duration;

    if (b.payment_method === 'paymongo') {
      paymongoRevenue += amount;
    } else {
      cashRevenue += amount;
    }
  }

  // Include only active (non-voided) completed POS shop sales into revenue & discount metrics
  for (const tx of posTransactions) {
    if (tx.status === 'voided') continue;

    const txDate = new Date(tx.created_at);
    const txAmount = Number(tx.total_amount) || 0;
    const txGross = Number(tx.gross_amount) || txAmount;

    if (txDate >= startOfYear) ytdRevenue += txAmount;
    if (txDate >= startOfThisMonth) thisMonthRevenue += txAmount;
    else if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) lastMonthRevenue += txAmount;

    const pmLower = tx.payment_method?.toLowerCase() || '';
    if (pmLower.startsWith('split:')) {
      const match = tx.payment_method.match(/Cash\s*(?:\d+%)?\s*\(?₱?([0-9.]+)\)?/i);
      const splitCash = match && match[1] ? Number(match[1]) : txAmount * 0.5;
      cashRevenue += splitCash;
      paymongoRevenue += Math.max(0, txAmount - splitCash);
    } else if (pmLower.includes('gcash') || pmLower.includes('paymongo') || pmLower.includes('card')) {
      paymongoRevenue += txAmount;
    } else {
      cashRevenue += txAmount;
    }

    posGrossSales += txGross;
    posNetSales += txAmount;
    posVatableSales += Number(tx.vatable_sales || 0);
    posVatAmount += Number(tx.vat_amount || 0);
    posVatExemptSales += Number(tx.vat_exempt_sales || 0);
    posDiscounts += Number(tx.discount_amount || 0);
  }

  // Calculate Operational Expenses & Financial Margins
  let thisMonthExpenses = 0;
  let ytdExpenses = 0;
  let todayExpenses = 0;

  for (const exp of adminExpenses) {
    const expDate = new Date(exp.expense_date);
    const amount = Number(exp.amount) || 0;

    if (exp.expense_date === todayStr) {
      todayExpenses += amount;
    }
    if (expDate >= startOfYear) {
      ytdExpenses += amount;
    }
    if (expDate >= startOfThisMonth) {
      thisMonthExpenses += amount;
    }
  }

  const netOperatingProfit = thisMonthRevenue - thisMonthExpenses;
  const profitMarginPct = thisMonthRevenue > 0 ? (netOperatingProfit / thisMonthRevenue) * 100 : 0;

  let totalInventoryCostValuation = 0;
  let totalInventoryRetailValuation = 0;
  for (const p of posProducts) {
    const stock = Number(p.stock_level) || 0;
    const cost = Number(p.cost_price) || 0;
    const price = Number(p.price) || 0;
    totalInventoryCostValuation += stock * cost;
    totalInventoryRetailValuation += stock * price;
  }

  // Calculate Month-over-Month Growth
  const monthOverMonthGrowth =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
      ? 100
      : 0;

  // Calculate Court Occupancy Rate for the current month
  // Operating capacity = Days elapsed this month * 16 operating hours (6am-10pm) * 2 indoor courts
  const daysElapsed = Math.max(1, now.getDate());
  const maxCapacityHours = daysElapsed * 16 * 2;
  const courtOccupancyRate = Math.min(100, (monthlyHoursBooked / maxCapacityHours) * 100);

  const formattedBookings: AdminBookingRecord[] = rawBookings.map((b) => {
    const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : b.courts?.name;
    const guestName =
      b.guest_name ||
      (Array.isArray(b.profiles) ? b.profiles[0]?.full_name : b.profiles?.full_name) ||
      'Walk-in Player';

    return {
      id: b.id,
      start_time: b.start_time,
      end_time: b.end_time,
      duration_hours: b.duration_hours,
      total_price: Number(b.total_price),
      status: b.status,
      payment_method: b.payment_method,
      guest_name: guestName,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone,
      court_name: courtName || 'Court 1 - Indoor',
      created_at: b.created_at,
      refund_wallet_type: b.refund_wallet_type,
      refund_account_name: b.refund_account_name,
      refund_account_number: b.refund_account_number,
      refund_reason: b.refund_reason,
      refund_status: b.refund_status,
      refund_reference: b.refund_reference,
      refund_processed_at: b.refund_processed_at,
    };
  });

  const activePosCount = posTransactions.filter((tx) => tx.status !== 'voided').length;

  const metrics: AdminMetrics = {
    thisMonthRevenue,
    lastMonthRevenue,
    monthOverMonthGrowth,
    ytdRevenue,
    totalHoursBooked,
    monthlyHoursBooked,
    courtOccupancyRate,
    paymongoRevenue,
    cashRevenue,
    totalTransactionsCount: activeBookings.length + activePosCount,
    posGrossSales,
    posNetSales,
    posVatableSales,
    posVatAmount,
    posVatExemptSales,
    posDiscounts,
    thisMonthExpenses,
    ytdExpenses,
    todayExpenses,
    netOperatingProfit,
    profitMarginPct,
    totalInventoryCostValuation,
    totalInventoryRetailValuation,
  };

  return (
    <AdminDashboardClient 
      metrics={metrics} 
      bookings={formattedBookings} 
      products={posProducts}
      posTransactions={posTransactions}
      expenses={adminExpenses}
      dutySessions={adminDutySessions}
      initialMasterPin={masterPin}
    />
  );
}