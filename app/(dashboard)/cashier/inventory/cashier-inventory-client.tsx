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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

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
      matchesStatus = prod.stock_level > 0 && prod.stock_level <= prod.reorder_threshold;
    } else if (stockStatusFilter === 'healthy') {
      matchesStatus = prod.stock_level > prod.reorder_threshold;
    }

    return matchesCategory && matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalSkus = products.length;
  const outOfStockCount = products.filter((p) => p.stock_level <= 0).length;
  const lowStockCount = products.filter((p) => p.stock_level > 0 && p.stock_level <= p.reorder_threshold).length;
  const healthyCount = products.filter((p) => p.stock_level > p.reorder_threshold).length;
  const totalInventoryCost = products.reduce((acc, p) => acc + p.stock_level * p.cost_price, 0);
  const totalInventoryRetail = products.reduce((acc, p) => acc + p.stock_level * p.price, 0);

  const handleOpenAdjust = (prod: InventoryItemRecord) => {
    setSelectedProduct(prod);
    setAdjStock(prod.stock_level);
    setAdjCost(prod.cost_price);
    setAdjPrice(prod.price);
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
    const headers = ['SKU', 'Product Name', 'Category', 'Stock Level', 'Reorder Threshold', 'Cost Price (PHP)', 'Selling Price (PHP)', 'Unit Margin (PHP)', 'Margin (%)', 'Total Value At Cost (PHP)'];
    const rows = filteredProducts.map((p) => {
      const margin = p.price - p.cost_price;
      const marginPct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;
      const totalCost = p.stock_level * p.cost_price;
      return [
        `"${p.sku || ''}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        p.stock_level,
        p.reorder_threshold,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cacacb] dark:border-[#222226] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Operations
            </span>
            <span className="text-xs text-[#cacacb] dark:text-[#27272a]">•</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
              Stock &amp; Inventory Table
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display uppercase tracking-tight text-foreground">
            INVENTORY &amp; MARGIN TABLE
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Track physical stock counts, unit costs, selling prices, and reorder thresholds across cafe, bar, and equipment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/cashier">
            <Button variant="outline" size="sm" className="border-[#cacacb] dark:border-[#27272a] text-xs h-9">
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> POS Register
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-[#cacacb] dark:border-[#27272a] text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#707072] dark:text-[#8a8a93]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total SKUs</span>
              <Boxes className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold">{totalSkus}</div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Active catalog items</p>
          </CardContent>
        </Card>

        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#007d48] dark:text-[#10b981]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Healthy Stock</span>
              <PackageCheck className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#007d48] dark:text-[#10b981]">{healthyCount}</div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Above reorder level</p>
          </CardContent>
        </Card>

        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#eab308]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#eab308]">{lowStockCount}</div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">&le; 10 units remaining</p>
          </CardContent>
        </Card>

        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#d30005] dark:text-red-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
              <PackageX className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-[#d30005] dark:text-red-400">{outOfStockCount}</div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Needs immediate PO</p>
          </CardContent>
        </Card>

        <Card className="border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] shadow-xs col-span-2 md:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-[#707072] dark:text-[#8a8a93]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Stock Valuation</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-foreground">₱{totalInventoryCost.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</div>
            <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">At unit cost price</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#121215] p-4 border border-[#cacacb] dark:border-[#222226]">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product name..."
            className="pl-9 h-9 text-xs bg-[#f5f5f5] dark:bg-black rounded-full border border-[#cacacb] dark:border-[#27272a]"
          />
        </div>

        {/* Category & Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-full text-xs font-semibold bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-foreground outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Stock Health Filter Buttons */}
          <div className="flex items-center border border-[#cacacb] dark:border-[#27272a] rounded-full p-0.5 bg-[#f5f5f5] dark:bg-[#18181c]">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                stockStatusFilter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              All ({totalSkus})
            </button>
            <button
              onClick={() => setStockStatusFilter('healthy')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                stockStatusFilter === 'healthy'
                  ? 'bg-white dark:bg-zinc-800 text-[#007d48] dark:text-[#10b981] shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              Healthy ({healthyCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                stockStatusFilter === 'low'
                  ? 'bg-white dark:bg-zinc-800 text-[#eab308] shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('out')}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                stockStatusFilter === 'out'
                  ? 'bg-white dark:bg-zinc-800 text-[#d30005] dark:text-red-400 shadow-xs'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
              }`}
            >
              Out ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Density Inventory Table */}
      <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226]">
              <TableRow className="border-[#cacacb] dark:border-[#222226]">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground w-24">SKU</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Product Item</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Category</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground">Stock Level</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground">Status</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Cost Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Selling Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Unit Margin</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Stock Value (Cost)</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground w-28">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-[#707072] text-xs font-medium">
                    No products matched your search or stock filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((prod) => {
                  const isOut = prod.stock_level <= 0;
                  const isLow = prod.stock_level > 0 && prod.stock_level <= prod.reorder_threshold;
                  const unitMargin = prod.price - prod.cost_price;
                  const marginPct = prod.price > 0 ? Math.round((unitMargin / prod.price) * 100) : 0;
                  const stockValueAtCost = prod.stock_level * prod.cost_price;

                  return (
                    <TableRow
                      key={prod.id}
                      className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors"
                    >
                      {/* SKU */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a]">
                          {prod.sku || '—'}
                        </span>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="text-xs">
                        <span className="font-bold text-foreground">{prod.name}</span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-xs">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] dark:text-[#a1a1aa] border border-[#cacacb] dark:border-[#27272a]">
                          {prod.category}
                        </span>
                      </TableCell>

                      {/* Stock Level */}
                      <TableCell className="text-center text-xs font-mono font-bold">
                        <span className={isOut ? 'text-[#d30005]' : isLow ? 'text-[#eab308]' : 'text-foreground'}>
                          {prod.stock_level} units
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 dark:bg-red-950/40 text-[#d30005] border border-red-200 dark:border-red-900">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-[#10b981] border border-emerald-200 dark:border-emerald-900">
                            In Stock
                          </span>
                        )}
                      </TableCell>

                      {/* Cost Price */}
                      <TableCell className="text-right text-xs text-[#707072] dark:text-[#8a8a93] font-mono">
                        ₱{prod.cost_price.toFixed(2)}
                      </TableCell>

                      {/* Selling Price */}
                      <TableCell className="text-right text-xs font-bold font-mono text-foreground">
                        ₱{prod.price.toFixed(2)}
                      </TableCell>

                      {/* Unit Margin */}
                      <TableCell className="text-right text-xs font-mono">
                        <span className="text-[#007d48] dark:text-[#10b981] font-bold">
                          +₱{unitMargin.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">
                          ({marginPct}%)
                        </span>
                      </TableCell>

                      {/* Stock Value At Cost */}
                      <TableCell className="text-right text-xs font-bold font-mono text-foreground">
                        ₱{stockValueAtCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenAdjust(prod)}
                          className="h-7 px-2.5 text-[11px] font-semibold border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full cursor-pointer"
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

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
                Inventory Management
              </span>
              <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                {selectedProduct.name}
              </h3>
              <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                SKU: <span className="font-mono font-bold text-foreground">{selectedProduct.sku || 'N/A'}</span> • Category: {selectedProduct.category}
              </p>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold mb-3 ${
                  feedback.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 text-[#d30005]'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-[#007d48] flex items-center gap-1.5'
                }`}
              >
                {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjust} className="space-y-4 pt-1">
              {/* Stock Count Field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Physical Stock Count (Units)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjStock((prev) => Math.max(0, prev - 1))}
                    className="h-10 w-10 shrink-0 border-[#cacacb] dark:border-[#27272a] cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    value={adjStock}
                    onChange={(e) => setAdjStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 text-center font-mono text-base font-bold bg-[#f5f5f5] dark:bg-black rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjStock((prev) => prev + 1)}
                    className="h-10 w-10 shrink-0 border-[#cacacb] dark:border-[#27272a] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Cost Price & Selling Price Fields */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Unit Cost Price (₱)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={adjCost}
                    onChange={(e) => setAdjCost(parseFloat(e.target.value) || 0)}
                    className="h-10 font-mono text-xs bg-[#f5f5f5] dark:bg-black rounded-xl"
                  />
                  <span className="text-[10px] text-[#707072]">Cost of Goods (COGS)</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Selling Price (₱)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={1}
                    value={adjPrice}
                    onChange={(e) => setAdjPrice(parseFloat(e.target.value) || 0)}
                    className="h-10 font-mono text-xs bg-[#f5f5f5] dark:bg-black rounded-xl font-bold"
                  />
                  <span className="text-[10px] text-[#707072]">Menu retail price</span>
                </div>
              </div>

              {/* Real-time calculated Unit Margin Preview */}
              <div className="p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] flex items-center justify-between text-xs">
                <span className="text-[#707072] dark:text-[#8a8a93]">Calculated Unit Margin:</span>
                <div className="font-mono font-bold text-right">
                  <span className="text-[#007d48] dark:text-[#10b981]">
                    ₱{(adjPrice - adjCost).toFixed(2)}
                  </span>{' '}
                  <span className="text-[10px] text-[#707072]">
                    ({adjPrice > 0 ? Math.round(((adjPrice - adjCost) / adjPrice) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-10 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-xl font-bold cursor-pointer"
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
