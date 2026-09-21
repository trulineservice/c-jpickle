import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CashierClient from "./cashier-client";

export const dynamic = 'force-dynamic';

export default async function CashierDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    if (profile?.role === 'coordinator') {
      redirect('/cashier/schedule');
    }
    redirect('/dashboard');
  }

  // Fetch Inventory Products, recent POS transactions, and active duty session concurrently
  const [
    { data: products },
    { data: recentTransactions },
    { data: activeDutySession }
  ] = await Promise.all([
    supabase
      .from('pos_products')
      .select('*')
      .order('category', { ascending: true })
      .order('sku', { ascending: true }),
    supabase
      .from('pos_transactions')
      .select('id, invoice_number, customer_name, total_amount, gross_amount, payment_method, status, created_at, void_reason, voided_at')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('cashier_duty_sessions')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('status', 'on_duty')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return (
    <CashierClient 
      initialProducts={products || []} 
      initialRecentTransactions={recentTransactions || []}
      currentStaff={profile}
      initialDutySession={activeDutySession || null}
    />
  );
}