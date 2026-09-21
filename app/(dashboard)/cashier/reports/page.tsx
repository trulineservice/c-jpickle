import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { CashierReportsClient, type CashierReportTx, type ReportFinancialSummary } from './cashier-reports-client';
import {
  parsePaginationParams,
  buildRangeFromPage,
  buildPaginationMeta,
  getManilaToday,
  getManilaDateWindow,
  type PaginationMeta,
} from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export default async function CashierReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  // 1. Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    if (profile?.role === 'coordinator') redirect('/cashier/schedule');
    redirect('/dashboard');
  }

  // 2. Parse params
  const today = getManilaToday();
  const { page, limit, dateFrom, dateTo } = parsePaginationParams(sp, {
    limit: 25,
    dateFrom: today,
    dateTo: today,
  });

  const effectiveDateFrom = dateFrom || today;
  const effectiveDateTo = dateTo || today;

  const { startISO: startFrom } = getManilaDateWindow(effectiveDateFrom);
  const { endISO: endTo } = getManilaDateWindow(effectiveDateTo);
  const { from, to } = buildRangeFromPage(page, limit);

  // 3. Run summary + paginated data in parallel
  const [{ data: allForSummary }, { data: rawPage, count: totalCount }] = await Promise.all([
    // Full date-range summary (no pagination limit)
    supabase
      .from('pos_transactions')
      .select('total_amount, gross_amount, vat_amount, vatable_sales, vat_exempt_sales, discount_amount, status, payment_method')
      .eq('cashier_id', user.id)
      .gte('created_at', startFrom)
      .lte('created_at', endTo),

    // Paginated rows for the table
    supabase
      .from('pos_transactions')
      .select(`
        id, invoice_number, customer_name,
        discount_type, discount_id_number,
        gross_amount, discount_amount,
        vatable_sales, vat_amount, vat_exempt_sales,
        total_amount, payment_method, status, created_at,
        void_reason, voided_at
      `, { count: 'exact' })
      .eq('cashier_id', user.id)
      .gte('created_at', startFrom)
      .lte('created_at', endTo)
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  // 4. Compute financial summary from full date-range rows
  const activeSummary = (allForSummary ?? []).filter((t) => t.status !== 'voided');
  const financialSummary: ReportFinancialSummary = {
    totalSales: activeSummary.reduce((s, t) => s + Number(t.total_amount || 0), 0),
    totalGross: activeSummary.reduce((s, t) => s + Number(t.gross_amount || t.total_amount || 0), 0),
    totalVatable: activeSummary.reduce((s, t) => s + Number(t.vatable_sales || 0), 0),
    totalVat: activeSummary.reduce((s, t) => s + Number(t.vat_amount || 0), 0),
    totalVatExempt: activeSummary.reduce((s, t) => s + Number(t.vat_exempt_sales || 0), 0),
    totalDiscounts: activeSummary.reduce((s, t) => s + Number(t.discount_amount || 0), 0),
    totalTransactions: activeSummary.length,
    voidedCount: (allForSummary ?? []).length - activeSummary.length,
    cashSales: activeSummary
      .filter((t) => (t.payment_method ?? '').toLowerCase() === 'cash')
      .reduce((s, t) => s + Number(t.total_amount || 0), 0),
  };

  // 5. Map rows
  const transactions: CashierReportTx[] = (rawPage ?? []).map((t) => ({
    ...t,
    gross_amount: t.gross_amount !== null ? Number(t.gross_amount) : null,
    discount_amount: t.discount_amount !== null ? Number(t.discount_amount) : null,
    vatable_sales: t.vatable_sales !== null ? Number(t.vatable_sales) : null,
    vat_amount: t.vat_amount !== null ? Number(t.vat_amount) : null,
    vat_exempt_sales: t.vat_exempt_sales !== null ? Number(t.vat_exempt_sales) : null,
    total_amount: Number(t.total_amount),
    status: t.status || 'completed',
  })) as CashierReportTx[];

  const meta: PaginationMeta = buildPaginationMeta(page, limit, totalCount ?? 0);

  return (
    <CashierReportsClient
      initialTransactions={transactions}
      meta={meta}
      financialSummary={financialSummary}
      dateRange={{ dateFrom: effectiveDateFrom, dateTo: effectiveDateTo }}
    />
  );
}