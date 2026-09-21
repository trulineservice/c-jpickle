import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CashierReportsClient, type CashierReportTx } from "./cashier-reports-client";

export const dynamic = "force-dynamic";

export default async function CashierReportsPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    if (profile?.role === 'coordinator') {
      redirect('/cashier/schedule');
    }
    redirect('/dashboard');
  }

  // 2. Fetch all POS transactions processed by this cashier with BIR tax breakdown and void audit columns
  const { data: rawTransactions } = await supabase
    .from("pos_transactions")
    .select(`
      id,
      invoice_number,
      customer_name,
      discount_type,
      discount_id_number,
      gross_amount,
      discount_amount,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      total_amount,
      payment_method,
      status,
      created_at,
      void_reason,
      voided_at
    `)
    .eq("cashier_id", user.id)
    .order("created_at", { ascending: false });

  const transactions = (rawTransactions || []).map((t) => ({
    ...t,
    gross_amount: t.gross_amount !== null ? Number(t.gross_amount) : null,
    discount_amount: t.discount_amount !== null ? Number(t.discount_amount) : null,
    vatable_sales: t.vatable_sales !== null ? Number(t.vatable_sales) : null,
    vat_amount: t.vat_amount !== null ? Number(t.vat_amount) : null,
    vat_exempt_sales: t.vat_exempt_sales !== null ? Number(t.vat_exempt_sales) : null,
    total_amount: Number(t.total_amount),
    status: t.status || "completed",
  })) as CashierReportTx[];

  return <CashierReportsClient initialTransactions={transactions} />;
}