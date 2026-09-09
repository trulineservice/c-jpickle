import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminDashboardClient from './admin-dashboard-client';
import type { AdminBookingRecord, AdminMetrics } from './admin-dashboard-client';

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
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // 2. Fetch All Bookings
  const { data: rawData } = await supabase
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
      courts ( name )
    `)
    .order('created_at', { ascending: false });

  const rawBookings = (rawData as unknown as RawAdminBooking[]) || [];

  // 3. Fetch POS transactions (pro-shop sales, rentals & equipment)
  const { data: posTransactions } = await supabase
    .from('pos_transactions')
    .select('id, invoice_number, total_amount, gross_amount, vatable_sales, vat_amount, vat_exempt_sales, discount_amount, discount_type, payment_method, status, created_at')
    .neq('status', 'voided');

  const activeBookings = rawBookings.filter(
    (b) => !['cancelled', 'expired'].includes(b.status)
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

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

  // BIR Tax Compliance Accumulators
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

  // Include completed POS shop sales into revenue & tax metrics
  for (const tx of posTransactions || []) {
    const txDate = new Date(tx.created_at);
    const txAmount = Number(tx.total_amount) || 0;

    if (txDate >= startOfYear) ytdRevenue += txAmount;
    if (txDate >= startOfThisMonth) thisMonthRevenue += txAmount;
    else if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) lastMonthRevenue += txAmount;

    if (tx.payment_method?.toLowerCase().includes('gcash') || tx.payment_method?.toLowerCase().includes('paymongo')) {
      paymongoRevenue += txAmount;
    } else {
      cashRevenue += txAmount;
    }

    posVatableSales += Number(tx.vatable_sales || 0);
    posVatAmount += Number(tx.vat_amount || 0);
    posVatExemptSales += Number(tx.vat_exempt_sales || 0);
    posDiscounts += Number(tx.discount_amount || 0);
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
    totalTransactionsCount: activeBookings.length + (posTransactions?.length || 0),
    posVatableSales,
    posVatAmount,
    posVatExemptSales,
    posDiscounts,
  };

  return <AdminDashboardClient metrics={metrics} bookings={formattedBookings} />;
}