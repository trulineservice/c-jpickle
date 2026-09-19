'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Percent,
  Download,
  Search,
  UserPlus,
  Ban,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  Wallet,
  Utensils,
  Receipt,
  Lock,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  PackageCheck,
  PackageX,
  Package,
  X,
  Boxes,
  TrendingDown,
  Plus,
  Minus,
  Edit,
  Trash2,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { 
  createCashierAccount, 
  updatePosMasterPin, 
  voidPosTransactionWithPin,
  addDailyExpense,
  deleteDailyExpense,
  updateInventoryItem
} from '@/app/actions';
import { AdminVoidRefundModal } from '@/components/admin-void-refund-modal';
import { PosMasterPinModal } from '@/components/pos/pos-master-pin-modal';
import { GoogleCalendarSyncModal } from '@/components/google-calendar-sync-modal';

export interface AdminBookingRecord {
  id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: string;
  payment_method: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  court_name: string;
  created_at: string;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_reason?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  refund_processed_at?: string | null;
}

export interface AdminPosProductRecord {
  id: string;
  sku?: string | null;
  name: string;
  category: string;
  price: number;
  cost_price?: number | null;
  stock_level?: number | null;
  reorder_threshold?: number | null;
  is_active?: boolean;
}

export interface AdminExpenseRecord {
  id: string;
  expense_date: string;
  category: string;
  title: string;
  amount: number;
  payment_method: string;
  receipt_reference?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  recorder_name?: string;
  created_at: string;
}

export interface AdminPosTransactionRecord {
  id: string;
  invoice_number?: string | null;
  customer_name?: string | null;
  total_amount: number;
  gross_amount?: number | null;
  vatable_sales?: number | null;
  vat_amount?: number | null;
  vat_exempt_sales?: number | null;
  discount_amount?: number | null;
  discount_type?: string | null;
  payment_method: string;
  status: string;
  created_at: string;
  void_reason?: string | null;
  voided_at?: string | null;
}

export interface AdminMetrics {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  monthOverMonthGrowth: number;
  ytdRevenue: number;
  totalHoursBooked: number;
  monthlyHoursBooked: number;
  courtOccupancyRate: number;
  paymongoRevenue: number;
  cashRevenue: number;
  totalTransactionsCount: number;
  posVatableSales?: number;
  posVatAmount?: number;
  posVatExemptSales?: number;
  posDiscounts?: number;
  thisMonthExpenses?: number;
  ytdExpenses?: number;
  todayExpenses?: number;
  netOperatingProfit?: number;
  profitMarginPct?: number;
  totalInventoryCostValuation?: number;
  totalInventoryRetailValuation?: number;
}

export default function AdminDashboardClient({
  metrics,
  bookings,
  products = [],
  posTransactions = [],
  expenses = [],
  initialMasterPin = '8888',
}: {
  metrics: AdminMetrics;
  bookings: AdminBookingRecord[];
  products?: AdminPosProductRecord[];
  posTransactions?: AdminPosTransactionRecord[];
  expenses?: AdminExpenseRecord[];
  initialMasterPin?: string;
}) {
  // Navigation Tabs: 'bookings' | 'inventory' | 'expenses_margin' | 'pos_invoices'
  const [activeTab, setActiveTab] = useState<'bookings' | 'inventory' | 'expenses_margin' | 'pos_invoices'>('bookings');

  // Bookings Filter State
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingMethodFilter, setBookingMethodFilter] = useState('all');
  const [voidModalBooking, setVoidModalBooking] = useState<AdminBookingRecord | null>(null);

  // Inventory Table & Margin State
  const [productList, setProductList] = useState<AdminPosProductRecord[]>(products);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('All');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'all' | 'healthy' | 'low' | 'out'>('all');
  const [selectedProdForAdj, setSelectedProdForAdj] = useState<AdminPosProductRecord | null>(null);
  const [adjStock, setAdjStock] = useState<number>(0);
  const [adjCost, setAdjCost] = useState<number>(0);
  const [adjPrice, setAdjPrice] = useState<number>(0);
  const [adjReorder, setAdjReorder] = useState<number>(10);
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [adjFeedback, setAdjFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Daily Expenses & Profit Margin State
  const [expenseList, setExpenseList] = useState<AdminExpenseRecord[]>(expenses);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseDateFilter, setExpenseDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('month');

  // Add Expense Modal State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('supplies');
  const [newExpPaymentMethod, setNewExpPaymentMethod] = useState('cash');
  const [newExpReceiptRef, setNewExpReceiptRef] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [expSuccess, setExpSuccess] = useState<string | null>(null);

  // POS Transactions State
  const [txList, setTxList] = useState<AdminPosTransactionRecord[]>(posTransactions);
  const [txSearch, setTxSearch] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [selectedTxForVoid, setSelectedTxForVoid] = useState<AdminPosTransactionRecord | null>(null);
  const [txVoidModalOpen, setTxVoidModalOpen] = useState(false);

  // Master PIN Management State
  const [masterPinState, setMasterPinState] = useState(initialMasterPin);
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);

  // Filter Bookings
  const safeBookings = bookings || [];
  const filteredBookings = safeBookings.filter((b) => {
    if (!b) return false;
    const query = (bookingSearch || '').toLowerCase().trim();
    const bId = (b.id || '').toLowerCase();
    const guestName = (b.guest_name || '').toLowerCase();
    const guestEmail = (b.guest_email || '').toLowerCase();
    const courtName = (b.court_name || '').toLowerCase();
    const refRef = (b.refund_reference || '').toLowerCase();
    const refAccName = (b.refund_account_name || '').toLowerCase();
    const refAccNum = (b.refund_account_number || '').toLowerCase();

    const matchesSearch =
      !query ||
      bId.includes(query) ||
      guestName.includes(query) ||
      guestEmail.includes(query) ||
      courtName.includes(query) ||
      refRef.includes(query) ||
      refAccName.includes(query) ||
      refAccNum.includes(query);

    const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
    const matchesMethod = bookingMethodFilter === 'all' || b.payment_method === bookingMethodFilter;

    return Boolean(matchesSearch && matchesStatus && matchesMethod);
  });

  // Filter Inventory Products
  const inventoryCategories = ['All', ...Array.from(new Set(productList.map((p) => p?.category || 'General').filter(Boolean)))];
  const filteredInventoryProducts = productList.filter((prod) => {
    if (!prod) return false;
    const prodCategory = prod.category || 'General';
    const matchesCategory = inventoryCategoryFilter === 'All' || prodCategory === inventoryCategoryFilter;
    const query = (inventorySearch || '').toLowerCase().trim();
    const prodName = (prod.name || '').toLowerCase();
    const prodCatLower = prodCategory.toLowerCase();
    const prodSku = (prod.sku || '').toLowerCase();

    const matchesSearch =
      !query ||
      prodName.includes(query) ||
      prodCatLower.includes(query) ||
      prodSku.includes(query);

    const stock = prod.stock_level ?? 0;
    const threshold = prod.reorder_threshold ?? 10;
    let matchesStatus = true;
    if (inventoryStockFilter === 'out') {
      matchesStatus = stock <= 0;
    } else if (inventoryStockFilter === 'low') {
      matchesStatus = stock > 0 && stock <= threshold;
    } else if (inventoryStockFilter === 'healthy') {
      matchesStatus = stock > threshold;
    }

    return Boolean(matchesCategory && matchesSearch && matchesStatus);
  });

  // Filter Daily Expenses
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startOfThisMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const filteredExpenses = expenseList.filter((e) => {
    if (!e) return false;
    if (expenseDateFilter === 'today' && e.expense_date !== todayStr) return false;
    if (expenseDateFilter === '7days' && e.expense_date < sevenDaysAgo) return false;
    if (expenseDateFilter === 'month' && e.expense_date < startOfThisMonthStr) return false;

    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;

    const query = (expenseSearch || '').toLowerCase().trim();
    if (query) {
      const match =
        (e.title && e.title.toLowerCase().includes(query)) ||
        (e.receipt_reference && e.receipt_reference.toLowerCase().includes(query)) ||
        (e.notes && e.notes.toLowerCase().includes(query)) ||
        (e.recorder_name && e.recorder_name.toLowerCase().includes(query));
      if (!match) return false;
    }

    return true;
  });

  // Filter Transactions
  const safeTxList = txList || [];
  const filteredTransactions = safeTxList.filter((tx) => {
    if (!tx) return false;
    const query = (txSearch || '').toLowerCase().trim();
    const invNum = (tx.invoice_number || '').toLowerCase();
    const custName = (tx.customer_name || '').toLowerCase();
    const payMethod = (tx.payment_method || '').toLowerCase();

    const matchesSearch =
      !query ||
      invNum.includes(query) ||
      custName.includes(query) ||
      payMethod.includes(query);
    const matchesStatus = txStatusFilter === 'all' || tx.status === txStatusFilter;
    return Boolean(matchesSearch && matchesStatus);
  });

  const pendingRefunds = bookings.filter(
    (b) => b.status === 'cancelled_refund_pending' || (b.refund_status === 'pending' && b.status !== 'voided')
  );

  // Menu Inventory Stats
  const totalMenuItems = products.length;
  const lowStockItems = products.filter((p) => (p.stock_level ?? 0) > 0 && (p.stock_level ?? 0) <= 10).length;
  const outOfStockItems = products.filter((p) => (p.stock_level ?? 0) <= 0).length;

  const handleExportCSV = () => {
    const headers = [
      'Booking ID',
      'Court',
      'Start Time',
      'End Time',
      'Hours',
      'Total Price (PHP)',
      'Status',
      'Payment Channel',
      'Client Name',
      'Client Email',
      'Refund Wallet',
      'Refund Account',
      'Refund Reference',
      'Created At',
    ];

    const rows = filteredBookings.map((b) => [
      `"${b.id}"`,
      `"${b.court_name}"`,
      `"${b.start_time}"`,
      `"${b.end_time}"`,
      b.duration_hours,
      b.total_price,
      `"${b.status}"`,
      `"${b.payment_method}"`,
      `"${b.guest_name || 'Walk-in'}"`,
      `"${b.guest_email || 'N/A'}"`,
      `"${b.refund_wallet_type || ''}"`,
      `"${b.refund_account_number || ''}"`,
      `"${b.refund_reference || ''}"`,
      `"${b.created_at}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CJ_Court_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inventory Handlers
  const totalInventorySkus = productList.length;
  const healthyInventoryCount = productList.filter((p) => (p.stock_level ?? 0) > (p.reorder_threshold ?? 10)).length;
  const lowStockInventoryCount = productList.filter((p) => (p.stock_level ?? 0) > 0 && (p.stock_level ?? 0) <= (p.reorder_threshold ?? 10)).length;
  const outOfStockInventoryCount = productList.filter((p) => (p.stock_level ?? 0) <= 0).length;
  const totalInventoryCostVal = productList.reduce((acc, p) => acc + (p.stock_level ?? 0) * (p.cost_price ?? 0), 0);
  const totalInventoryRetailVal = productList.reduce((acc, p) => acc + (p.stock_level ?? 0) * (p.price ?? 0), 0);

  const handleOpenInventoryAdj = (prod: AdminPosProductRecord) => {
    setSelectedProdForAdj(prod);
    setAdjStock(prod.stock_level ?? 0);
    setAdjCost(prod.cost_price ?? 0);
    setAdjPrice(prod.price);
    setAdjReorder(prod.reorder_threshold ?? 10);
    setAdjFeedback(null);
  };

  const handleSaveInventoryAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdForAdj) return;

    setIsSubmittingAdj(true);
    setAdjFeedback(null);

    const res = await updateInventoryItem({
      id: selectedProdForAdj.id,
      stockLevel: adjStock,
      costPrice: adjCost,
      price: adjPrice,
      reorderThreshold: adjReorder,
    });

    setIsSubmittingAdj(false);

    if (!res.success) {
      setAdjFeedback({ type: 'error', message: res.error || 'Failed to update inventory item.' });
    } else {
      setAdjFeedback({ type: 'success', message: 'Item updated successfully!' });
      setProductList((prev) =>
        prev.map((p) =>
          p.id === selectedProdForAdj.id
            ? {
                ...p,
                stock_level: adjStock,
                cost_price: adjCost,
                price: adjPrice,
                reorder_threshold: adjReorder,
              }
            : p
        )
      );
      setTimeout(() => {
        setSelectedProdForAdj(null);
        setAdjFeedback(null);
      }, 1000);
    }
  };

  const handleExportInventoryCSV = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Stock Level',
      'Reorder Threshold',
      'Cost Price (PHP)',
      'Selling Price (PHP)',
      'Unit Margin (PHP)',
      'Margin (%)',
      'Total Value At Cost (PHP)',
      'Total Value At Retail (PHP)',
    ];

    const rows = filteredInventoryProducts.map((p) => {
      const cost = p.cost_price ?? 0;
      const margin = p.price - cost;
      const marginPct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;
      const stock = p.stock_level ?? 0;
      return [
        `"${p.sku || ''}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        stock,
        p.reorder_threshold ?? 10,
        cost.toFixed(2),
        p.price.toFixed(2),
        margin.toFixed(2),
        `${marginPct}%`,
        (stock * cost).toFixed(2),
        (stock * p.price).toFixed(2),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `CJ_Inventory_Ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Daily Expenses Handlers
  const filteredExpensesTotal = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    setExpSuccess(null);

    const numAmount = parseFloat(newExpAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setExpError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!newExpTitle.trim()) {
      setExpError('Please enter an expense description.');
      return;
    }

    setIsSubmittingExp(true);
    const res = await addDailyExpense({
      expenseDate: newExpDate,
      category: newExpCategory,
      title: newExpTitle.trim(),
      amount: numAmount,
      paymentMethod: newExpPaymentMethod,
      receiptReference: newExpReceiptRef.trim() || undefined,
      notes: newExpNotes.trim() || undefined,
    });

    setIsSubmittingExp(false);

    if (!res.success) {
      setExpError(res.error || 'Failed to record expense.');
    } else {
      setExpSuccess('Expense recorded successfully!');
      const newExp: AdminExpenseRecord = {
        id: 'temp-' + Date.now(),
        expense_date: newExpDate,
        category: newExpCategory,
        title: newExpTitle.trim(),
        amount: numAmount,
        payment_method: newExpPaymentMethod,
        receipt_reference: newExpReceiptRef.trim() || null,
        notes: newExpNotes.trim() || null,
        recorded_by: null,
        recorder_name: 'Admin Console',
        created_at: new Date().toISOString(),
      };
      setExpenseList((prev) => [newExp, ...prev]);

      setTimeout(() => {
        setIsAddExpenseOpen(false);
        setNewExpTitle('');
        setNewExpAmount('');
        setNewExpReceiptRef('');
        setNewExpNotes('');
        setExpSuccess(null);
      }, 800);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;

    const res = await deleteDailyExpense(expenseId);
    if (!res.success) {
      alert(res.error || 'Failed to delete expense.');
    } else {
      setExpenseList((prev) => prev.filter((e) => e.id !== expenseId));
    }
  };

  const handleExportExpensesCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount (PHP)', 'Payment Channel', 'Receipt / OR #', 'Notes', 'Logged By'];
    const rows = filteredExpenses.map((e) => [
      `"${e.expense_date}"`,
      `"${e.category}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      `"${e.payment_method}"`,
      `"${e.receipt_reference || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${e.recorder_name || 'Staff'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `CJ_Operating_Expenses_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMasterPinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(null);

    if (newPinInput !== confirmPinInput) {
      setPinChangeError('New PINs do not match.');
      return;
    }

    if (newPinInput.length < 4 || newPinInput.length > 8 || !/^\d+$/.test(newPinInput)) {
      setPinChangeError('New PIN must be between 4 and 8 digits.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await updatePosMasterPin({
        currentPin: currentPinInput,
        newPin: newPinInput,
      });

      if (!res.success) {
        setPinChangeError(res.error || 'Failed to update Master PIN.');
      } else {
        setMasterPinState(newPinInput);
        setPinChangeSuccess('Master PIN successfully changed!');
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        setTimeout(() => {
          setPinChangeModalOpen(false);
          setPinChangeSuccess(null);
        }, 1500);
      }
    } catch (err: unknown) {
      setPinChangeError(err instanceof Error ? err.message : 'Failed to update PIN.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleTxVoidClick = (tx: AdminPosTransactionRecord) => {
    setSelectedTxForVoid(tx);
    setTxVoidModalOpen(true);
  };

  const handleTxVoidSuccess = async (pin: string, reason?: string) => {
    if (!selectedTxForVoid) return;

    const res = await voidPosTransactionWithPin({
      transactionId: selectedTxForVoid.id,
      pin,
      reason: reason || 'Admin Audit Void',
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to void transaction.' };
    }

    setTxList((prev) =>
      prev.map((t) =>
        t.id === selectedTxForVoid.id
          ? {
              ...t,
              status: 'voided',
              void_reason: reason || 'Admin Audit Void',
              voided_at: new Date().toISOString(),
            }
          : t
      )
    );

    setSelectedTxForVoid(null);
    return { success: true };
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '—';
    }
  };

  const totalRev = (metrics?.paymongoRevenue || 0) + (metrics?.cashRevenue || 0) || 1;
  const paymongoPercent = Math.round(((metrics?.paymongoRevenue || 0) / totalRev) * 100);
  const cashPercent = 100 - paymongoPercent;

  return (
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto space-y-8 text-foreground font-sans bg-background">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-4 border-b border-[#cacacb] dark:border-[#222226] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Administration
            </span>
            <span className="text-xs text-[#cacacb] dark:text-[#27272a]">•</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
              Executive Center
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-foreground">
            FINANCIAL &amp; OPERATIONS AUDIT
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93] mt-1">
            Real-time revenue metrics, occupancy utilization, POS product inventory, and master booking registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Google Calendar Live Sync Trigger */}
          <Button
            type="button"
            onClick={() => setIsGCalModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-emerald-300 dark:border-emerald-800/80 text-[#007d48] dark:text-[#10b981] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-10 px-4 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Calendar className="w-4 h-4 mr-1.5 text-[#007d48] dark:text-[#10b981]" />
            <span>Google Calendar Live</span>
            <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-[#10b981] animate-pulse ml-1.5" />
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="border-[#cacacb] dark:border-[#27272a] text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] h-10 px-4 text-xs font-medium cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          {/* Add Staff Account Modal */}
          <Dialog>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 h-10 px-5 text-xs font-medium cursor-pointer">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Staff Account
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-none p-6 sm:p-8 shadow-2xl">
              <form action={createCashierAccount}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                    Provision Staff Account
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#707072] dark:text-[#8a8a93]">
                    Create a new user account with Cashier or Manager permissions at C&amp;J Arena.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Staff Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Jane Doe"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground border border-[#cacacb] dark:border-[#3f3f46] placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="staff@cjcourt.com"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground border border-[#cacacb] dark:border-[#3f3f46] placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      System Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-foreground text-xs font-medium outline-none focus:border-[#111111] dark:focus:border-white cursor-pointer"
                    >
                      <option value="cashier" className="dark:bg-black">Cashier Staff</option>
                      <option value="owner" className="dark:bg-black">Owner / Co-Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Temporary Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground border border-[#cacacb] dark:border-[#3f3f46] placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <SubmitButton
                    size="lg"
                    loadingText="Creating Staff Account..."
                    className="w-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 font-medium text-sm h-11 cursor-pointer"
                  >
                    Create Account
                  </SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Refund Banner */}
      {pendingRefunds.length > 0 && (
        <div className="border border-[#111111] dark:border-zinc-700 bg-[#f5f5f5] dark:bg-[#18181c] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Pending Refund Requests ({pendingRefunds.length})
              </h4>
              <p className="text-xs text-[#707072] dark:text-[#8a8a93] mt-0.5">
                Players have submitted cancellation requests. Review details to release court slots and disburse e-wallet payouts.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setActiveTab('bookings');
              setBookingStatusFilter('cancelled_refund_pending');
              const el = document.getElementById('audit-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-xs px-5 h-9 shrink-0 cursor-pointer"
          >
            Review Pending Requests
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Monthly Gross Revenue
            </span>
            <DollarSign className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            ₱{metrics.thisMonthRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#007d48] dark:text-[#10b981] flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            {metrics.monthOverMonthGrowth >= 0 ? '+' : ''}
            {metrics.monthOverMonthGrowth.toFixed(1)}% vs. Last Month
          </p>
        </div>

        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Year-To-Date Gross
            </span>
            <Calendar className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            ₱{metrics.ytdRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">Total bookings &amp; pro shop sales</p>
        </div>

        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Total Hours Booked
            </span>
            <Clock className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {metrics.totalHoursBooked} hrs
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            {metrics.monthlyHoursBooked} hrs booked this month
          </p>
        </div>

        <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-white dark:bg-[#121215] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              Court Utilization Rate
            </span>
            <Percent className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#007d48] dark:text-[#10b981]">
            {metrics.courtOccupancyRate.toFixed(1)}%
          </div>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">16 hrs/day × 2 indoor courts</p>
        </div>
      </div>

      {/* BIR EOPT Strip */}
      <div className="border border-[#cacacb] dark:border-[#222226] p-6 bg-[#fafafa] dark:bg-[#18181c] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cacacb] dark:border-[#222226] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Philippine Tax Compliance (BIR EOPT Act RA 11976 / RA 9994 / RA 10754)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#707072] dark:text-[#8a8a93]">
            TIN: 432-891-002-00000 • MIN: MIN-260908-CJ01
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              VATable Net Sales
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatableSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Subject to 12% standard output VAT</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              12% Output VAT
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatAmount || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Tax liabilities for BIR filing</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
              VAT-Exempt Sales
            </span>
            <div className="text-xl font-bold text-foreground">
              ₱{(metrics.posVatExemptSales || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">Senior Citizen &amp; PWD base</p>
          </div>

          <div className="p-4 bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] dark:text-[#10b981]">
              SC / PWD Discounts
            </span>
            <div className="text-xl font-bold text-[#007d48] dark:text-[#10b981]">
              ₱{(metrics.posDiscounts || 0).toFixed(2)}
            </div>
            <p className="text-[10px] text-[#707072] dark:text-[#8a8a93]">20% statutory deductions granted</p>
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Card */}
      <div className="border border-[#cacacb] dark:border-[#222226] p-6 sm:p-8 bg-white dark:bg-[#121215] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] dark:border-[#222226] pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Revenue Stream Breakdown
            </h3>
            <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
              PayMongo Online Channels vs. Walk-In Cash POS Register
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#707072] dark:text-[#8a8a93]">Total Volume: </span>
            <span className="font-bold text-foreground">₱{(metrics.paymongoRevenue + metrics.cashRevenue).toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="h-3 w-full rounded-full bg-[#f5f5f5] dark:bg-[#18181c] overflow-hidden flex border border-[#cacacb] dark:border-[#27272a]">
            <div
              style={{ width: `${paymongoPercent}%` }}
              className="bg-[#111111] dark:bg-white h-full transition-all duration-500"
              title={`PayMongo: ${paymongoPercent}%`}
            />
            <div
              style={{ width: `${cashPercent}%` }}
              className="bg-[#007d48] dark:bg-[#10b981] h-full transition-all duration-500"
              title={`Cash: ${cashPercent}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#111111] dark:bg-white" />
              <span className="text-[#707072] dark:text-[#8a8a93]">PayMongo Online:</span>
              <span className="font-bold text-foreground">
                ₱{metrics.paymongoRevenue.toFixed(2)} ({paymongoPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-3 h-3 rounded-full bg-[#007d48] dark:bg-[#10b981]" />
              <span className="text-[#707072] dark:text-[#8a8a93]">Cash / Counter POS:</span>
              <span className="font-bold text-foreground">
                ₱{metrics.cashRevenue.toFixed(2)} ({cashPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION TABS FOR AUDIT LOGS & MENU INVENTORY */}
      <div className="space-y-6">
        {/* Tab Controls Bar */}
        <div className="flex items-center gap-2 border-b border-[#cacacb] dark:border-[#222226] pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'bookings'
                ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Court Bookings ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Table &amp; Margins ({productList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses_margin')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'expenses_margin'
                ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Daily Expenses &amp; Margins ({expenseList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos_invoices')}
            className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'pos_invoices'
                ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>POS Sales Invoices &amp; Audit ({txList.length})</span>
          </button>
        </div>

        {/* TAB 1: COURT BOOKINGS AUDIT LOG */}
        {activeTab === 'bookings' && (
          <div id="audit-table" className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden">
            <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Master Court Booking Audit Log
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  Verified public reservations, walk-in register locks, and transaction statuses.
                </p>
              </div>

              {/* Live Filter & Search Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
                  <Input
                    placeholder="Search player, email, ref..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10 h-9 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] border border-[#cacacb] dark:border-[#3f3f46] focus:border-[#111111] dark:focus:border-white"
                  />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="checked_in">Checked In</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="cancelled_refund_pending">Refund Queued</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={bookingMethodFilter}
                  onChange={(e) => setBookingMethodFilter(e.target.value)}
                  className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All Channels</option>
                  <option value="paymongo">PayMongo</option>
                  <option value="cash">Cash POS</option>
                  <option value="counter_qr">Counter QR</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226]">
                  <TableRow className="border-[#cacacb] dark:border-[#222226]">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Ref ID</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Player</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Court</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Time Interval</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Channel</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Total</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-[#707072] dark:text-[#8a8a93] text-xs font-medium">
                        No bookings matched your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((b) => {
                      const isCheckedIn = b.status === 'checked_in';
                      const isPaid = b.status === 'paid';
                      const isRefundPending = b.status === 'cancelled_refund_pending' || b.refund_status === 'pending';
                      const isCancelled = b.status === 'cancelled';

                      return (
                        <TableRow key={b.id} className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-foreground">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-xs">{b.guest_name || 'Player'}</div>
                            <div className="text-[11px] text-[#707072] dark:text-[#8a8a93]">{b.guest_email || 'Walk-in client'}</div>
                          </TableCell>
                          <TableCell className="font-medium text-foreground text-xs">{b.court_name}</TableCell>
                          <TableCell className="text-[#707072] dark:text-[#8a8a93] text-xs">
                            {formatDateTime(b.start_time)} ({b.duration_hours} hr{b.duration_hours > 1 ? 's' : ''})
                          </TableCell>
                          <TableCell>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                              {b.payment_method}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isCheckedIn ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] border border-[#cacacb] dark:border-[#27272a]">
                                Checked In
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] border border-[#cacacb] dark:border-[#27272a]">
                                Paid
                              </span>
                            ) : isRefundPending ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white dark:bg-[#121215] text-[#d30005] dark:text-red-400 border border-[#d30005] dark:border-red-500/50">
                                Refund Queued
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] dark:text-[#8a8a93] border border-[#cacacb] dark:border-[#27272a]">
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                                {b.status}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-foreground">
                            ₱{Number(b.total_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isRefundPending ? (
                              <Button
                                size="xs"
                                onClick={() => setVoidModalBooking(b)}
                                className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-[11px] px-3 rounded-full cursor-pointer"
                              >
                                <Wallet className="w-3.5 h-3.5 mr-1" />
                                Review
                              </Button>
                            ) : isCancelled ? (
                              <div className="text-right">
                                {b.refund_reference ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#007d48] dark:text-[#10b981] bg-[#f5f5f5] dark:bg-[#18181c] px-2 py-0.5 rounded-full border border-[#cacacb] dark:border-[#27272a]"
                                    title={`Refund Ref: ${b.refund_reference}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Refunded
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Voided</span>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setVoidModalBooking(b)}
                                className="border-[#cacacb] dark:border-[#27272a] text-[#d30005] dark:text-red-400 hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] text-[11px] px-3 rounded-full cursor-pointer"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Void
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT & MARGINS TABLE */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Inventory KPI Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
                  Total SKUs
                </span>
                <div className="text-2xl font-bold text-foreground">{totalInventorySkus}</div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Catalog products</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] dark:text-[#10b981]">
                  Healthy Stock
                </span>
                <div className="text-2xl font-bold text-[#007d48] dark:text-[#10b981]">{healthyInventoryCount}</div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Above reorder level</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#eab308]">
                  Low Stock Warning
                </span>
                <div className="text-2xl font-bold text-[#eab308]">{lowStockInventoryCount}</div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Items &le; threshold</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d30005] dark:text-red-400">
                  Out of Stock
                </span>
                <div className="text-2xl font-bold text-[#d30005] dark:text-red-400">{outOfStockInventoryCount}</div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Needs immediate PO</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1 col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  Stock Value (Cost)
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₱{totalInventoryCostVal.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                  Retail: ₱{totalInventoryRetailVal.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Inventory Table Container */}
            <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden">
              <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    Physical Stock &amp; Margins Registry
                  </h3>
                  <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                    Manage stock levels, unit cost prices (COGS), menu prices, and gross margins per item.
                  </p>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
                    <Input
                      placeholder="Search SKU, product..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-10 h-9 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground border border-[#cacacb] dark:border-[#3f3f46]"
                    />
                  </div>

                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                    className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                  >
                    {inventoryCategories.map((c) => (
                      <option key={c} value={c} className="dark:bg-black">
                        {c === 'All' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center border border-[#cacacb] dark:border-[#27272a] rounded-full p-0.5 bg-[#f5f5f5] dark:bg-[#18181c]">
                    <button
                      type="button"
                      onClick={() => setInventoryStockFilter('all')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        inventoryStockFilter === 'all'
                          ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      All ({totalInventorySkus})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryStockFilter('low')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        inventoryStockFilter === 'low'
                          ? 'bg-white dark:bg-zinc-800 text-[#eab308] shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      Low ({lowStockInventoryCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryStockFilter('out')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        inventoryStockFilter === 'out'
                          ? 'bg-white dark:bg-zinc-800 text-[#d30005] dark:text-red-400 shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      Out ({outOfStockInventoryCount})
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportInventoryCSV}
                    className="h-9 px-3.5 text-xs border-[#cacacb] dark:border-[#27272a] rounded-full cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226] sticky top-0 z-10">
                    <TableRow className="border-[#cacacb] dark:border-[#222226]">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5 w-24">SKU</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Product Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Category</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Stock Level</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Status</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Cost Price</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Selling Price</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Unit Margin</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Stock Value (Cost)</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground py-3.5 w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventoryProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-[#707072] text-xs font-medium">
                          No inventory items matched your search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventoryProducts.map((prod) => {
                        const stock = prod.stock_level ?? 0;
                        const threshold = prod.reorder_threshold ?? 10;
                        const cost = prod.cost_price ?? 0;
                        const isOut = stock <= 0;
                        const isLow = stock > 0 && stock <= threshold;
                        const unitMargin = prod.price - cost;
                        const marginPct = prod.price > 0 ? Math.round((unitMargin / prod.price) * 100) : 0;
                        const stockValue = stock * cost;

                        return (
                          <TableRow key={prod.id} className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-foreground py-3">
                              {prod.sku ? (
                                <span className="bg-[#ececee] dark:bg-[#27272a] px-2 py-0.5 rounded text-[11px]">
                                  {prod.sku}
                                </span>
                              ) : (
                                <span className="text-[#707072]">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 font-semibold text-xs text-foreground">
                              {prod.name}
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                                {prod.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-3 font-mono font-bold text-xs">
                              <span className={isOut ? 'text-[#d30005]' : isLow ? 'text-[#eab308]' : 'text-foreground'}>
                                {stock} units
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isOut ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 dark:bg-red-950/40 text-[#d30005] border border-red-200 dark:border-red-900">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900">
                                  Low ({stock})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-[#10b981] border border-emerald-200 dark:border-emerald-900">
                                  In Stock
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-[#707072] dark:text-[#8a8a93] py-3">
                              ₱{cost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-foreground py-3">
                              ₱{Number(prod.price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-3">
                              <span className="text-[#007d48] dark:text-[#10b981] font-bold">
                                +₱{unitMargin.toFixed(2)}
                              </span>
                              <span className="block text-[10px] text-[#707072] dark:text-[#8a8a93]">
                                ({marginPct}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-foreground py-3">
                              ₱{stockValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenInventoryAdj(prod)}
                                className="h-7 px-2.5 text-[11px] font-semibold border-[#cacacb] dark:border-[#27272a] rounded-full hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] cursor-pointer"
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

            {/* Master PIN Tile at bottom of Inventory */}
            <div className="border border-[#cacacb] dark:border-[#222226] p-5 bg-[#fbfbfb] dark:bg-[#18181c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#007d48]" />
                  POS Master PIN Protection: <span className="text-[#007d48] font-bold">ACTIVE</span>
                </span>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  Supervisor Master PIN is enforced whenever cashiers void active order items, clear carts, or void past sales invoices.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setPinChangeError(null);
                  setPinChangeSuccess(null);
                  setPinChangeModalOpen(true);
                }}
                className="h-9 px-4 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-full cursor-pointer font-bold shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Change Master PIN
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: DAILY EXPENSES & PROFIT MARGIN AUDIT */}
        {activeTab === 'expenses_margin' && (
          <div className="space-y-6">
            {/* Financial Margins Overview Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] dark:text-[#10b981]">
                  This Month Gross Revenue
                </span>
                <div className="text-2xl font-bold font-mono text-[#007d48] dark:text-[#10b981]">
                  ₱{metrics.thisMonthRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Courts + POS Sales</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d30005] dark:text-red-400">
                  This Month Expenses
                </span>
                <div className="text-2xl font-bold font-mono text-[#d30005] dark:text-red-400">
                  -₱{(metrics.thisMonthExpenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Operational disbursals</p>
              </div>

              <div className={`border p-4 space-y-1 ${
                (metrics.netOperatingProfit ?? 0) >= 0
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  Net Operating Profit
                </span>
                <div className={`text-2xl font-bold font-mono ${
                  (metrics.netOperatingProfit ?? 0) >= 0 ? 'text-[#007d48] dark:text-[#10b981]' : 'text-[#d30005]'
                }`}>
                  ₱{(metrics.netOperatingProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-semibold text-[#707072] dark:text-[#8a8a93]">
                  Revenue - Operating Expenses
                </p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  Net Profit Margin
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {(metrics.profitMarginPct || 0).toFixed(1)}%
                </div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Margin on gross income</p>
              </div>

              <div className="border border-[#cacacb] dark:border-[#222226] p-4 bg-white dark:bg-[#121215] space-y-1 col-span-2 md:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
                  YTD Total Expenses
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  ₱{(metrics.ytdExpenses || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-[#707072] dark:text-[#8a8a93]">Cumulative operational costs</p>
              </div>
            </div>

            {/* Expenses Table Container */}
            <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden">
              <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">
                    Facility Operating Expenses Ledger
                  </h3>
                  <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                    Detailed log of all arena disbursals: utilities, maintenance, supplies, and petty cash.
                  </p>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
                    <Input
                      placeholder="Search expense, ref #..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="pl-10 h-9 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground border border-[#cacacb] dark:border-[#3f3f46]"
                    />
                  </div>

                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                    className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="utilities">Utilities</option>
                    <option value="supplies">Kitchen &amp; Bar Supplies</option>
                    <option value="maintenance">Court &amp; Facility Maintenance</option>
                    <option value="petty_cash">Petty Cash Disbursal</option>
                    <option value="staff_food">Staff &amp; Operations</option>
                    <option value="other">Miscellaneous</option>
                  </select>

                  <div className="flex items-center border border-[#cacacb] dark:border-[#27272a] rounded-full p-0.5 bg-[#f5f5f5] dark:bg-[#18181c]">
                    <button
                      type="button"
                      onClick={() => setExpenseDateFilter('today')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        expenseDateFilter === 'today'
                          ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseDateFilter('7days')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        expenseDateFilter === '7days'
                          ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseDateFilter('month')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        expenseDateFilter === 'month'
                          ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseDateFilter('all')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
                        expenseDateFilter === 'all'
                          ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs'
                          : 'text-[#707072] dark:text-[#8a8a93] hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="h-9 px-4 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-full cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Log Expense
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportExpensesCSV}
                    className="h-9 px-3 text-xs border-[#cacacb] dark:border-[#27272a] rounded-full cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226] sticky top-0 z-10">
                    <TableRow className="border-[#cacacb] dark:border-[#222226]">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5 w-28">Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Category</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Description / Purpose</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Payment Channel</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Receipt #</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Logged By</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground py-3.5">Amount (PHP)</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-foreground py-3.5 w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-[#707072] text-xs font-medium">
                          No expense records matched your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <TableRow key={exp.id} className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors">
                          <TableCell className="font-mono text-xs font-medium py-3 text-foreground">
                            {exp.expense_date}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                              {exp.category}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-xs">
                            <span className="font-semibold text-foreground">{exp.title}</span>
                            {exp.notes && (
                              <span className="block text-[11px] text-[#707072] dark:text-[#8a8a93] italic">
                                {exp.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                              {exp.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 font-mono text-xs text-[#707072] dark:text-[#8a8a93]">
                            {exp.receipt_reference || '—'}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-[#707072] dark:text-[#8a8a93]">
                            {exp.recorder_name || 'Staff'}
                          </TableCell>
                          <TableCell className="py-3 text-right font-mono font-bold text-xs text-[#d30005] dark:text-red-400">
                            -₱{exp.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="h-7 w-7 p-0 text-[#d30005] hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full cursor-pointer"
                              title="Delete expense entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POS SALES INVOICES & AUDIT */}
        {activeTab === 'pos_invoices' && (
          <div className="border border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#121215] overflow-hidden">
            <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  POS Sales Invoice Registry &amp; Void Audit
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  All completed and voided retail sales with BIR statutory tax classifications and supervisor overrides.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072] dark:text-[#8a8a93]" />
                  <Input
                    placeholder="Search invoice, customer..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="pl-10 h-9 rounded-full bg-[#f5f5f5] dark:bg-black text-xs text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] border border-[#cacacb] dark:border-[#3f3f46] focus:border-[#111111] dark:focus:border-white"
                  />
                </div>

                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className="h-9 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                >
                  <option value="all">All Invoices</option>
                  <option value="completed">Completed Only</option>
                  <option value="voided">Voided Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c] border-b border-[#cacacb] dark:border-[#222226]">
                  <TableRow className="border-[#cacacb] dark:border-[#222226]">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Invoice No</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Customer</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Timestamp</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Channel</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Gross</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Discount</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Net Amount</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-[#707072] text-xs font-medium">
                        No POS transactions matched your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isVoided = tx.status === 'voided';
                      const isDiscounted = tx.discount_type === 'senior_citizen' || tx.discount_type === 'pwd';

                      return (
                        <TableRow key={tx.id} className="border-b border-[#e5e5e5] dark:border-[#222226] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-foreground">
                            <span className={isVoided ? "line-through text-[#a0a0a2]" : ""}>
                              {tx.invoice_number || `#${tx.id.slice(0, 8).toUpperCase()}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground">{tx.customer_name || 'Walk-in'}</span>
                            {isDiscounted && (
                              <span className="block text-[10px] text-[#007d48] font-bold">
                                {tx.discount_type === 'senior_citizen' ? 'Senior (20%)' : 'PWD (20%)'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-[#707072]">
                            {formatDateTime(tx.created_at)}
                          </TableCell>
                          <TableCell>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                              {tx.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-[#707072]">
                            ₱{Number(tx.gross_amount || tx.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-[#007d48] font-semibold">
                            {Number(tx.discount_amount) > 0 ? `-₱${Number(tx.discount_amount).toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-bold text-sm ${isVoided ? "line-through text-[#a0a0a2]" : "text-foreground"}`}>
                            ₱{Number(tx.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isVoided ? (
                              <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/60 text-[#d30005] border border-red-200 dark:border-red-900">
                                  Voided
                                </span>
                                {tx.void_reason && (
                                  <span className="block text-[10px] text-[#707072] italic truncate max-w-[120px]" title={tx.void_reason}>
                                    {tx.void_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#e8f5e9] dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400">
                                Completed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isVoided ? (
                              <span className="text-[11px] text-[#a0a0a2] italic">Voided</span>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleTxVoidClick(tx)}
                                className="border-[#cacacb] dark:border-[#27272a] text-[#d30005] hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] px-3 rounded-full cursor-pointer font-bold"
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Void
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Admin Void and Refund Modal for Bookings */}
      {voidModalBooking && (
        <AdminVoidRefundModal
          isOpen={!!voidModalBooking}
          onClose={() => setVoidModalBooking(null)}
          booking={voidModalBooking}
          onSuccess={() => setVoidModalBooking(null)}
        />
      )}

      {/* Admin Master PIN Modal for Voiding POS Transactions */}
      {selectedTxForVoid && (
        <PosMasterPinModal
          isOpen={txVoidModalOpen}
          onClose={() => {
            setTxVoidModalOpen(false);
            setSelectedTxForVoid(null);
          }}
          title="Void POS Transaction"
          description={`Master PIN required to void invoice ${
            selectedTxForVoid.invoice_number || `#${selectedTxForVoid.id.slice(0, 8)}`
          } (₱${Number(selectedTxForVoid.total_amount).toFixed(2)}). Stock will be restored.`}
          actionType="void_transaction"
          requireReason={true}
          onSuccess={handleTxVoidSuccess}
        />
      )}

      {/* Change Master PIN Modal Overlay */}
      {pinChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setPinChangeModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleMasterPinUpdate}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] dark:bg-[#1c1c20] text-foreground flex items-center justify-center mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Update POS Master PIN
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  Change the supervisor Master PIN used by cashiers and managers for item voiding and order cancellation.
                </p>
              </div>

              {pinChangeError && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-[#d30005] font-semibold">
                  {pinChangeError}
                </div>
              )}

              {pinChangeSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-[#007d48] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{pinChangeSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5 py-4">
                <div className="space-y-1">
                  <Label htmlFor="currentPin" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Current Master PIN
                  </Label>
                  <Input
                    id="currentPin"
                    type="password"
                    maxLength={8}
                    placeholder="Enter current PIN"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    required
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newPin" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    New Master PIN (4–8 digits)
                  </Label>
                  <Input
                    id="newPin"
                    type="password"
                    maxLength={8}
                    placeholder="Enter new 4–8 digit PIN"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    required
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPin" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Confirm New Master PIN
                  </Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    maxLength={8}
                    placeholder="Confirm new PIN"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    required
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPinChangeModalOpen(false)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingPin}
                  className="flex-1 h-10 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-xl font-bold cursor-pointer"
                >
                  {isUpdatingPin ? 'Saving...' : 'Update PIN'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Inventory Item Adjustment Modal */}
      {selectedProdForAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedProdForAdj(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleSaveInventoryAdj}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] dark:bg-[#1c1c20] text-foreground flex items-center justify-center mb-2">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Adjust Inventory &amp; Cost
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  {selectedProdForAdj.name} {selectedProdForAdj.sku ? `(${selectedProdForAdj.sku})` : ''}
                </p>
              </div>

              {adjFeedback && (
                <div
                  className={`mt-3 p-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                    adjFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-[#007d48]'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-[#d30005]'
                  }`}
                >
                  {adjFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{adjFeedback.message}</span>
                </div>
              )}

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminAdjStock" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Physical Stock Count
                    </Label>
                    <Input
                      id="adminAdjStock"
                      type="number"
                      min={0}
                      value={adjStock}
                      onChange={(e) => setAdjStock(parseInt(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminAdjReorder" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Reorder Threshold
                    </Label>
                    <Input
                      id="adminAdjReorder"
                      type="number"
                      min={0}
                      value={adjReorder}
                      onChange={(e) => setAdjReorder(parseInt(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminAdjCost" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Unit Cost Price (₱)
                    </Label>
                    <Input
                      id="adminAdjCost"
                      type="number"
                      step="0.01"
                      min={0}
                      value={adjCost}
                      onChange={(e) => setAdjCost(parseFloat(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminAdjPrice" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Selling Price (₱)
                    </Label>
                    <Input
                      id="adminAdjPrice"
                      type="number"
                      step="0.01"
                      min={0}
                      value={adjPrice}
                      onChange={(e) => setAdjPrice(parseFloat(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Live Margin Calculation Preview */}
                <div className="p-3 bg-[#f5f5f5] dark:bg-[#18181c] rounded-xl border border-[#e5e5e5] dark:border-[#27272a] space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#707072] dark:text-[#8a8a93]">Unit Profit Margin:</span>
                    <span className="font-mono font-bold text-[#007d48] dark:text-[#10b981]">
                      +₱{(adjPrice - adjCost).toFixed(2)} ({adjPrice > 0 ? Math.round(((adjPrice - adjCost) / adjPrice) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#707072] dark:text-[#8a8a93]">Inventory Value At Cost:</span>
                    <span className="font-mono font-bold text-foreground">
                      ₱{(adjStock * adjCost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProdForAdj(null)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="flex-1 h-10 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-xl font-bold cursor-pointer"
                >
                  {isSubmittingAdj ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add Operating Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setIsAddExpenseOpen(false);
                setExpError(null);
                setExpSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-[#d30005] flex items-center justify-center mb-2">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Record Operating Expense
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  Log facility expenditures, maintenance, utilities, kitchen stock replenishment, or petty cash.
                </p>
              </div>

              {expError && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-[#d30005] font-semibold">
                  {expError}
                </div>
              )}

              {expSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-[#007d48] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{expSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminExpDate" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Expense Date
                    </Label>
                    <Input
                      id="adminExpDate"
                      type="date"
                      value={newExpDate}
                      onChange={(e) => setNewExpDate(e.target.value)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminExpCategory" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Expense Category
                    </Label>
                    <select
                      id="adminExpCategory"
                      value={newExpCategory}
                      onChange={(e) => setNewExpCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs border border-[#cacacb] dark:border-[#3f3f46] text-foreground outline-none"
                    >
                      <option value="supplies">Kitchen &amp; Bar Supplies</option>
                      <option value="maintenance">Court &amp; Facility Maintenance</option>
                      <option value="utilities">Utilities (Power, Water, Net)</option>
                      <option value="petty_cash">Petty Cash Disbursal</option>
                      <option value="staff_food">Staff &amp; Operations</option>
                      <option value="other">Miscellaneous</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminExpTitle" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Expense Description / Item
                  </Label>
                  <Input
                    id="adminExpTitle"
                    placeholder="e.g., Ice delivery 50kg, Replacement net straps, Power bill"
                    value={newExpTitle}
                    onChange={(e) => setNewExpTitle(e.target.value)}
                    required
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminExpAmount" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Amount (₱)
                    </Label>
                    <Input
                      id="adminExpAmount"
                      type="number"
                      step="0.01"
                      min={1}
                      placeholder="0.00"
                      value={newExpAmount}
                      onChange={(e) => setNewExpAmount(e.target.value)}
                      required
                      className="h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminExpPayment" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Payment Disbursed Via
                    </Label>
                    <select
                      id="adminExpPayment"
                      value={newExpPaymentMethod}
                      onChange={(e) => setNewExpPaymentMethod(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs border border-[#cacacb] dark:border-[#3f3f46] text-foreground outline-none"
                    >
                      <option value="cash">Cash (Drawer / Petty Cash)</option>
                      <option value="gcash">GCash (Arena Business)</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer / Check</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminExpReceipt" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Official Receipt / Invoice # (Optional)
                  </Label>
                  <Input
                    id="adminExpReceipt"
                    placeholder="e.g. OR-884920 or Supplier Inv #"
                    value={newExpReceiptRef}
                    onChange={(e) => setNewExpReceiptRef(e.target.value)}
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminExpNotes" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Remarks / Vendor Notes (Optional)
                  </Label>
                  <Input
                    id="adminExpNotes"
                    placeholder="Additional context or supplier details"
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingExp}
                  className="flex-1 h-10 text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] rounded-xl font-bold cursor-pointer"
                >
                  {isSubmittingExp ? 'Recording...' : 'Record Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Calendar Live Sync Modal */}
      <GoogleCalendarSyncModal
        isOpen={isGCalModalOpen}
        onClose={() => setIsGCalModalOpen(false)}
      />
    </div>
  );
}
