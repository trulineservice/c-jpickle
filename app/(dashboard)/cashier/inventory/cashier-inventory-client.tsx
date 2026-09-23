'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  PackageCheck,
  TrendingUp,
  DollarSign,
  Plus,
  Minus,
  Edit,
  X,
  Loader2,
  ArrowUpDown,
  ShoppingCart,
  Download
} from 'lucide-react';
import { updateInventoryItem } from '@/app/actions';
import type { InventoryItemRecord } from './page';

export default function CashierInventoryClient({
  products: initialProducts,
  userRole,
}: {
  products: InventoryItemRecord[];
  userRole: string;
}) {
  const [products, setProducts] = useState<InventoryItemRecord[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  // Stock Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<InventoryItemRecord | null>(null);
  const [adjStock, setAdjStock] = useState<number>(0);
  const [adjCost, setAdjCost] = useState<number>(0);
  const [adjPrice, setAdjPrice] = useState<number>(0);
  const [adjVolume, setAdjVolume] = useState<number>(0);
  const [adjBaseUnit, setAdjBaseUnit] = useState<string>('pcs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Helper functions for volume-aware stock tracking
  const isVolumeItem = (p: InventoryItemRecord) => Boolean(p.volume && p.volume > 0 && p.base_unit && p.base_unit !== 'pcs');

  const getDisplayStock = (p: InventoryItemRecord) => {
    if (isVolumeItem(p)) {
      const totalVolume = p.stock_level * p.volume;
      return `${totalVolume.toLocaleString('en-US')} ${p.base_unit}`;
    }
    return `${p.stock_level.toLocaleString('en-US')} ${p.base_unit || 'units'}`;
  };

  const isProductLowStock = (p: InventoryItemRecord) => {
    if (p.stock_level <= 0) return false;
    const currentQty = isVolumeItem(p) ? p.stock_level * p.volume : p.stock_level;
    return currentQty <= p.reorder_threshold;
  };

  const isProductHealthy = (p: InventoryItemRecord) => {
    if (p.stock_level <= 0) return false;
    const currentQty = isVolumeItem(p) ? p.stock_level * p.volume : p.stock_level;
    return currentQty > p.reorder_threshold;
  };

  // Filtering
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = categoryFilter === 'All' || prod.category === categoryFilter;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (prod.name && prod.name.toLowerCase().includes(query)) ||
      (prod.sku && prod.sku.toLowerCase().includes(query)) ||
      (prod.category && prod.category.toLowerCase().includes(query));

    let matchesStatus = true;
    if (stockStatusFilter === 'out') {
      matchesStatus = prod.stock_level <= 0;
    } else if (stockStatusFilter === 'low') {
      matchesStatus = isProductLowStock(prod);
    } else if (stockStatusFilter === 'healthy') {
      matchesStatus = isProductHealthy(prod);
    }

    return matchesCategory && matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalSkus = products.length;
  const outOfStockCount = products.filter((p) => p.stock_level <= 0).length;
  const lowStockCount = products.filter((p) => isProductLowStock(p)).length;
  const healthyCount = products.filter((p) => isProductHealthy(p)).length;
  const totalInventoryCost = products.reduce((acc, p) => acc + p.stock_level * p.cost_price, 0);
  const totalInventoryRetail = products.reduce((acc, p) => acc + p.stock_level * p.price, 0);

  const handleOpenAdjust = (prod: InventoryItemRecord) => {
    setSelectedProduct(prod);
    setAdjStock(prod.stock_level);
    setAdjCost(prod.cost_price);
    setAdjPrice(prod.price);
    setAdjVolume(prod.volume || 0);
    setAdjBaseUnit(prod.base_unit || 'pcs');
    setFeedback(null);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    setFeedback(null);

    const res = await updateInventoryItem({
      id: selectedProduct.id,
      stockLevel: adjStock,
      costPrice: adjCost,
      price: adjPrice,
      volume: adjVolume,
      baseUnit: adjBaseUnit,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Failed to update stock.' });
    } else {
      setFeedback({ type: 'success', message: 'Inventory updated successfully!' });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                stock_level: adjStock,
                cost_price: adjCost,
                price: adjPrice,
                volume: adjVolume,
                base_unit: adjBaseUnit,
                updated_at: new Date().toISOString(),
              }
            : p
        )
      );
      setTimeout(() => {
        setSelectedProduct(null);
        setFeedback(null);
      }, 1000);
    }
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'mL / Unit', 'Stock Level', 'Reorder Threshold', 'Cost Price (PHP)', 'Selling Price (PHP)', 'Unit Margin (PHP)', 'Margin (%)', 'Total Value At Cost (PHP)'];
    const rows = filteredProducts.map((p) => {
      const margin = p.price - p.cost_price;
      const marginPct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;
      const totalCost = p.stock_level * p.cost_price;
      return [
        `"${p.sku || ''}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        isVolumeItem(p) ? `"${p.volume.toLocaleString('en-US')} ${p.base_unit}"` : `"${p.base_unit || 'pcs'}"`,
        `"${getDisplayStock(p)}"`,
        isVolumeItem(p) ? `"${p.reorder_threshold.toLocaleString()} ${p.base_unit}"` : p.reorder_threshold,
        p.cost_price.toFixed(2),
        p.price.toFixed(2),
        margin.toFixed(2),
        `${marginPct}%`,
        totalCost.toFixed(2),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `CJ_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1440px] mx-auto space-y-6 text-foreground font-sans">
      {/* Header & Quick Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-none bg-[#0B2A67] dark:bg-[#FFD21C]" />
            <span className="px-2 py-0.5 rounded-none bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 text-[10px] font-black uppercase tracking-wider">
              OPERATIONS • STOCK &amp; INVENTORY REGISTRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
            INVENTORY &amp; MARGIN TABLE
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Track physical stock counts, unit costs, selling prices, and reorder thresholds across cafe, bar, and equipment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/cashier">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071E4B] text-foreground hover:bg-[#EDF4FC]/60 dark:hover:bg-white/10 text-xs h-9 px-4 font-bold cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5 text-[#0B2A67] dark:text-[#FFD21C]" /> POS Register
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="rounded-none bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] text-xs h-9 px-4 font-black uppercase tracking-wider cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#FFD21C] dark:text-[#0B2A67]" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Ribbon (Box-Type) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total SKUs</span>
            <div className="w-7 h-7 rounded-none bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 dark:border-white/15 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-foreground">{totalSkus}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active catalog items</p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#007d48] dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Healthy Stock</span>
            <div className="w-7 h-7 rounded-none bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-[#007d48] dark:text-emerald-400">{healthyCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Above reorder level</p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Low Stock</span>
            <div className="w-7 h-7 rounded-none bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-amber-700 dark:text-amber-400">{lowStockCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">At or below reorder threshold</p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#bf050b] dark:text-red-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Out of Stock</span>
            <div className="w-7 h-7 rounded-none bg-red-100 dark:bg-red-950/80 text-[#bf050b] dark:text-red-400 border border-red-300 dark:border-red-900 flex items-center justify-center">
              <PackageX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-[#bf050b] dark:text-red-400">{outOfStockCount}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Needs immediate PO</p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Stock Valuation</span>
            <div className="w-7 h-7 rounded-none bg-[#0B2A67] text-[#FFD21C] border border-[#0B2A67] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-foreground">₱{totalInventoryCost.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">At unit cost price</p>
        </div>
      </div>

      {/* Filter and Search Bar (Box-Type) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#071E4B] p-4 border border-slate-300 dark:border-white/15 rounded-none shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product name..."
            className="pl-9 h-9 text-xs bg-slate-50 dark:bg-black/40 rounded-none border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-none text-xs font-bold bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/20 text-foreground outline-none cursor-pointer focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Stock Health Filter Buttons */}
          <div className="flex items-center border border-slate-300 dark:border-white/20 rounded-none p-0.5 bg-slate-100 dark:bg-black/40">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-none transition-colors cursor-pointer ${
                stockStatusFilter === 'all'
                  ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              All ({totalSkus})
            </button>
            <button
              onClick={() => setStockStatusFilter('healthy')}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-none transition-colors cursor-pointer ${
                stockStatusFilter === 'healthy'
                  ? 'bg-[#007d48] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              Healthy ({healthyCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-none transition-colors cursor-pointer ${
                stockStatusFilter === 'low'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-none transition-colors cursor-pointer ${
                stockStatusFilter === 'out'
                  ? 'bg-[#bf050b] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10'
              }`}
            >
              Out ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Density Inventory Table (Box-Type) */}
      <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] rounded-none overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#0B2A67] text-white rounded-none border-b-2 border-[#FFD21C]">
              <TableRow className="border-[#0B2A67] hover:bg-transparent">
                <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3 w-24">SKU</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Product Item</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Category</TableHead>
                <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-white py-3">mL / Unit</TableHead>
                <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-white py-3">Stock Level</TableHead>
                <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Cost Price</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Selling Price</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Unit Margin</TableHead>
                <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Stock Value (Cost)</TableHead>
                <TableHead className="text-center text-[11px] font-black uppercase tracking-wider text-white py-3 w-28">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    No products matched your search or stock filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((prod) => {
                  const isOut = prod.stock_level <= 0;
                  const isLow = isProductLowStock(prod);
                  const unitMargin = prod.price - prod.cost_price;
                  const marginPct = prod.price > 0 ? Math.round((unitMargin / prod.price) * 100) : 0;
                  const stockValueAtCost = prod.stock_level * prod.cost_price;

                  return (
                    <TableRow
                      key={prod.id}
                      className="border-b border-slate-200 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors rounded-none"
                    >
                      {/* SKU */}
                      <TableCell className="font-mono text-xs font-black text-foreground">
                        <span className="px-2 py-0.5 rounded-none bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 dark:border-white/15 inline-block">
                          {prod.sku || '—'}
                        </span>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="text-xs">
                        <span className="font-bold text-foreground">{prod.name}</span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-xs">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {prod.category}
                        </span>
                      </TableCell>

                      {/* mL / Unit */}
                      <TableCell className="text-center text-xs font-mono">
                        {isVolumeItem(prod) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(prod)}
                            title="Click to adjust mL per unit"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-blue-50 dark:bg-blue-950/40 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 font-black hover:border-[#0B2A67] dark:hover:border-[#FFD21C] transition-colors cursor-pointer"
                          >
                            <span>{prod.volume.toLocaleString('en-US')} {prod.base_unit}</span>
                            <Edit className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                            {prod.base_unit || 'pcs'}
                          </span>
                        )}
                      </TableCell>

                      {/* Stock Level */}
                      <TableCell className="text-center text-xs font-mono font-black">
                        <span className={isOut ? 'text-[#bf050b] dark:text-red-400' : isLow ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}>
                          {getDisplayStock(prod)}
                        </span>
                        {isVolumeItem(prod) && (
                          <div className="text-[10px] font-sans font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            ({prod.stock_level} {prod.stock_level === 1 ? 'unit' : 'units'})
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-red-100 dark:bg-red-950/80 text-[#bf050b] dark:text-red-400 border border-red-300 dark:border-red-900">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            In Stock
                          </span>
                        )}
                      </TableCell>

                      {/* Cost Price */}
                      <TableCell className="text-right text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                        ₱{prod.cost_price.toFixed(2)}
                      </TableCell>

                      {/* Selling Price */}
                      <TableCell className="text-right text-xs font-mono font-black text-foreground">
                        ₱{prod.price.toFixed(2)}
                      </TableCell>

                      {/* Unit Margin */}
                      <TableCell className="text-right text-xs font-mono">
                        <span className="text-[#007d48] dark:text-emerald-400 font-black">
                          +₱{unitMargin.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-bold">
                          ({marginPct}%)
                        </span>
                      </TableCell>

                      {/* Stock Value At Cost */}
                      <TableCell className="text-right text-xs font-mono font-black text-foreground">
                        ₱{stockValueAtCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenAdjust(prod)}
                          className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-none border border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] cursor-pointer"
                        >
                          <Edit className="w-3 h-3 mr-1" /> Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Stock Adjustment Modal (Box-Type) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-foreground rounded-none p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pb-3">
              <div className="w-10 h-10 rounded-none bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 flex items-center justify-center mb-2">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-[#0B2A67] dark:text-[#FFD21C] truncate">
                {selectedProduct.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                SKU: <span className="font-mono font-black text-foreground">{selectedProduct.sku || 'N/A'}</span> • Category: {selectedProduct.category}
              </p>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-none text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
                  feedback.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-[#bf050b] dark:text-red-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-[#007d48] dark:text-emerald-400'
                }`}
              >
                {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjust} className="space-y-4 pt-1">
              {/* Stock Count & mL per Unit Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Physical Stock Count Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Physical Stock Count (Units)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjStock((prev) => Math.max(0, prev - 1))}
                      className="h-10 w-10 shrink-0 rounded-none border border-slate-300 dark:border-white/20 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={adjStock}
                      onChange={(e) => setAdjStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-10 text-center font-mono text-base font-black bg-white dark:bg-black rounded-none border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjStock((prev) => prev + 1)}
                      className="h-10 w-10 shrink-0 rounded-none border border-slate-300 dark:border-white/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Bottles, cartons, or packs in store</span>
                </div>

                {/* mL / Content per Unit Field (Adjustable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                      mL per Unit
                    </Label>
                    {adjVolume > 0 && adjBaseUnit !== 'pcs' && (
                      <span className="text-[10px] font-mono font-black text-[#0B2A67] dark:text-[#FFD21C]">
                        ={(adjStock * adjVolume).toLocaleString('en-US')} {adjBaseUnit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={adjVolume}
                      onChange={(e) => setAdjVolume(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="e.g. 300, 750, 1000"
                      className="h-10 font-mono text-xs font-black bg-white dark:bg-black rounded-none border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                    <select
                      value={adjBaseUnit}
                      onChange={(e) => setAdjBaseUnit(e.target.value)}
                      className="h-10 w-20 px-2 text-xs font-bold uppercase tracking-wider bg-white dark:bg-black text-foreground rounded-none border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C] cursor-pointer"
                    >
                      <option value="mL">mL</option>
                      <option value="g">g</option>
                      <option value="pcs">pcs</option>
                      <option value="oz">oz</option>
                      <option value="L">L</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Container volume or weight capacity</span>
                </div>
              </div>

              {/* Cost Price & Selling Price Fields */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Unit Cost Price (₱)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={adjCost}
                    onChange={(e) => setAdjCost(parseFloat(e.target.value) || 0)}
                    className="h-10 font-mono text-xs bg-white dark:bg-black rounded-none border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Cost of Goods (COGS)</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Selling Price (₱)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={1}
                    value={adjPrice}
                    onChange={(e) => setAdjPrice(parseFloat(e.target.value) || 0)}
                    className="h-10 font-mono text-xs bg-white dark:bg-black rounded-none font-black border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Menu retail price</span>
                </div>
              </div>

              {/* Real-time calculated Total Volume & Unit Margin Previews */}
              <div className="space-y-2">
                {adjVolume > 0 && adjBaseUnit !== 'pcs' && (
                  <div className="p-3 rounded-none bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between text-xs">
                    <span className="text-amber-900 dark:text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                      Total Available Stock:
                    </span>
                    <div className="font-mono font-black text-xs text-amber-900 dark:text-amber-300">
                      {(adjStock * adjVolume).toLocaleString('en-US')} {adjBaseUnit}
                      <span className="text-[10px] font-sans font-medium text-slate-500 dark:text-slate-400 ml-1.5">
                        ({adjStock} {adjStock === 1 ? 'unit' : 'units'} × {adjVolume.toLocaleString('en-US')} {adjBaseUnit})
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-none bg-[#EDF4FC]/60 dark:bg-white/5 border border-[#0B2A67]/20 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Calculated Unit Margin:</span>
                  <div className="font-mono font-black text-right">
                    <span className="text-[#007d48] dark:text-emerald-400">
                      +₱{(adjPrice - adjCost).toFixed(2)}
                    </span>{' '}
                    <span className="text-[10px] text-slate-500">
                      ({adjPrice > 0 ? Math.round(((adjPrice - adjCost) / adjPrice) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 h-10 text-xs rounded-none border border-slate-300 dark:border-white/20 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-10 text-xs bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] rounded-none font-black uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
