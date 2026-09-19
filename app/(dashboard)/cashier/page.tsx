import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CashierClient from "./cashier-client";

export default async function CashierDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Fetch Inventory Products and recent POS transactions concurrently
  const [
    { data: products },
    { data: recentTransactions }
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
      .limit(25)
  ]);

  return (
    <CashierClient 
      initialProducts={products || []} 
      initialRecentTransactions={recentTransactions || []}
    />
  );
}