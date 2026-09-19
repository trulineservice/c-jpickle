import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import CashierInventoryClient from './cashier-inventory-client';

export const dynamic = 'force-dynamic';

export interface InventoryItemRecord {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  price: number;
  cost_price: number;
  stock_level: number;
  reorder_threshold: number;
  is_active: boolean;
  updated_at: string;
}

export default async function CashierInventoryPage() {
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

  const { data: rawProducts } = await supabase
    .from('pos_products')
    .select(`
      id,
      sku,
      name,
      category,
      price,
      cost_price,
      stock_level,
      reorder_threshold,
      is_active,
      updated_at
    `)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  const products: InventoryItemRecord[] = (rawProducts || []).map((p) => ({
    id: p.id,
    sku: p.sku || 'N/A',
    name: p.name || 'Unnamed Product',
    category: p.category || 'General',
    price: Number(p.price) || 0,
    cost_price: Number(p.cost_price) || 0,
    stock_level: Number(p.stock_level) || 0,
    reorder_threshold: Number(p.reorder_threshold) || 10,
    is_active: p.is_active !== false,
    updated_at: p.updated_at || new Date().toISOString(),
  }));

  const userRole = profile.role;

  return <CashierInventoryClient products={products} userRole={userRole} />;
}
