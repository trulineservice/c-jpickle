'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { buildPaginationMeta } from '@/lib/pagination';
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
  FileSpreadsheet,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  Timer,
  Activity
} from 'lucide-react';
import { 
  createCashierAccount, 
  updatePosMasterPin, 
  voidPosTransactionWithPin,
  addDailyExpense,
  deleteDailyExpense,
  updateInventoryItem,
  getCashiersOnDutyAtAction
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
  cashier_id?: string | null;
  cashier_name?: string | null;
  cashier_role?: string | null;
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

export interface AdminDutySessionRecord {
  id: string;
  cashier_id: string;
  cashier_name: string;
  cashier_email?: string;
  cashier_phone?: string;
  cashier_role?: string;
  started_at: string;
  ended_at: string | null;
  status: 'on_duty' | 'off_duty';
  opening_float: number;
  closing_cash: number | null;
  notes: string | null;
  created_at: string;
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
  posGrossSales?: number;
  posNetSales?: number;
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
  dutySessions = [],
  initialMasterPin = '8888',
}: {
  metrics: AdminMetrics;
  bookings: AdminBookingRecord[];
  products?: AdminPosProductRecord[];
  posTransactions?: AdminPosTransactionRecord[];
  expenses?: AdminExpenseRecord[];
  dutySessions?: AdminDutySessionRecord[];
  initialMasterPin?: string;
}) {
  // Navigation Tabs: 'bookings' | 'inventory' | 'expenses_margin' | 'pos_invoices' | 'duty_roster'
  const [activeTab, setActiveTab] = useState<'bookings' | 'inventory' | 'expenses_margin' | 'pos_invoices' | 'duty_roster'>('bookings');

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

  // Cashier Duty Roster & Time Inspector State
  const [dutySessionList, setDutySessionList] = useState<AdminDutySessionRecord[]>(dutySessions);
  const [inspectorDate, setInspectorDate] = useState<string>(() => {
    const d = new Date();
    const pht = new Date(d.getTime() + 8 * 3600 * 1000);
    return pht.toISOString().split('T')[0];
  });
  const [inspectorTime, setInspectorTime] = useState<string>(() => {
    const d = new Date();
    const pht = new Date(d.getTime() + 8 * 3600 * 1000);
    const hh = String(pht.getUTCHours()).padStart(2, '0');
    const mm = String(pht.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [inspectorResults, setInspectorResults] = useState<AdminDutySessionRecord[] | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [dutySearch, setDutySearch] = useState('');
  const [dutyStatusFilter, setDutyStatusFilter] = useState<'all' | 'on_duty' | 'off_duty'>('all');

  // Master PIN Management State
  const [masterPinState, setMasterPinState] = useState(initialMasterPin);
  const [pinChangeModalOpen, setPinChangeModalOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinInputs, setShowPinInputs] = useState(false);
  const [showActivePinRevealed, setShowActivePinRevealed] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);

  // Tab Pagination States
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingLimit, setBookingLimit] = useState(25);

  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryLimit, setInventoryLimit] = useState(25);

  const [expensePage, setExpensePage] = useState(1);
  const [expenseLimit, setExpenseLimit] = useState(25);

  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(25);

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
    const cashierName = (tx.cashier_name || '').toLowerCase();
    const payMethod = (tx.payment_method || '').toLowerCase();

    const matchesSearch =
      !query ||
      invNum.includes(query) ||
      custName.includes(query) ||
      cashierName.includes(query) ||
      payMethod.includes(query);
    const matchesStatus = txStatusFilter === 'all' || tx.status === txStatusFilter;
    return Boolean(matchesSearch && matchesStatus);
  });

  // Paginated Slices for Performance & Large Data Sets
  const paginatedBookings = useMemo(() => {
    const from = (bookingPage - 1) * bookingLimit;
    return filteredBookings.slice(from, from + bookingLimit);
  }, [filteredBookings, bookingPage, bookingLimit]);

  const paginatedInventoryProducts = useMemo(() => {
    const from = (inventoryPage - 1) * inventoryLimit;
    return filteredInventoryProducts.slice(from, from + inventoryLimit);
  }, [filteredInventoryProducts, inventoryPage, inventoryLimit]);

  const paginatedExpenses = useMemo(() => {
    const from = (expensePage - 1) * expenseLimit;
    return filteredExpenses.slice(from, from + expenseLimit);
  }, [filteredExpenses, expensePage, expenseLimit]);

  const paginatedTransactions = useMemo(() => {
    const from = (txPage - 1) * txLimit;
    return filteredTransactions.slice(from, from + txLimit);
  }, [filteredTransactions, txPage, txLimit]);

  // Duty Roster Calculations & Handlers
  const activeOnDutySessions = dutySessionList.filter((s) => s.status === 'on_duty');
  const activeOnDutyCount = activeOnDutySessions.length;

  const filteredDutySessions = dutySessionList.filter((s) => {
    if (dutyStatusFilter !== 'all' && s.status !== dutyStatusFilter) return false;
    const q = (dutySearch || '').toLowerCase().trim();
    if (!q) return true;
    return (
      s.cashier_name.toLowerCase().includes(q) ||
      (s.cashier_email && s.cashier_email.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  });

  const handleInspectDutyTime = async (overrideDate?: string, overrideTime?: string) => {
    const targetDate = overrideDate ?? inspectorDate;
    const targetTime = overrideTime ?? inspectorTime;
    if (!targetDate || !targetTime) return;

    setIsInspecting(true);
    try {
      const targetIso = new Date(`${targetDate}T${targetTime}:00+08:00`).toISOString();
      const res = await getCashiersOnDutyAtAction(targetIso);
      if (res.success && res.cashiers) {
        setInspectorResults(
          res.cashiers.map((c) => ({
            id: c.sessionId,
            cashier_id: c.cashierId,
            cashier_name: c.cashierName,
            cashier_email: c.cashierEmail,
            cashier_phone: c.cashierPhone,
            cashier_role: c.cashierRole,
            started_at: c.startedAt,
            ended_at: c.endedAt,
            status: c.status as 'on_duty' | 'off_duty',
            opening_float: c.openingFloat,
            closing_cash: c.closingCash,
            notes: c.notes,
            created_at: c.startedAt,
          }))
        );
      } else {
        const targetDateObj = new Date(`${targetDate}T${targetTime}:00+08:00`);
        const matched = dutySessionList.filter((s) => {
          const start = new Date(s.started_at);
          const end = s.ended_at ? new Date(s.ended_at) : null;
          return start <= targetDateObj && (!end || end >= targetDateObj);
        });
        setInspectorResults(matched);
      }
    } catch {
      const targetDateObj = new Date(`${targetDate}T${targetTime}:00+08:00`);
      const matched = dutySessionList.filter((s) => {
        const start = new Date(s.started_at);
        const end = s.ended_at ? new Date(s.ended_at) : null;
        return start <= targetDateObj && (!end || end >= targetDateObj);
      });
      setInspectorResults(matched);
    } finally {
      setIsInspecting(false);
    }
  };

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
      setPinChangeError('New PIN must be between 4 and 8 numeric digits.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await updatePosMasterPin({
        currentPin: currentPinInput.trim() || undefined,
        newPin: newPinInput.trim(),
      });

      if (!res.success) {
        setPinChangeError(res.error || 'Failed to update Master PIN.');
      } else {
        setMasterPinState(newPinInput.trim());
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
    <div className="p-4 sm:p-8 max-w-[1440px] mx-auto space-y-6 text-foreground font-sans">
      {/* Header & Actions */}
      <div className="border-b border-slate-300 dark:border-white/15 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C] bg-[#EDF4FC] dark:bg-[#0c1a3b] px-2.5 py-0.5 border border-[#0B2A67]/20 dark:border-[#FFD21C]/30">
              ADMIN • EXECUTIVE OPERATIONS
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              C&amp;J Arena Executive Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            FINANCIAL &amp; OPERATIONS AUDIT
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time revenue metrics, occupancy utilization, POS product inventory, and master booking registry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Change Master Void PIN Button */}
          <Button
            type="button"
            onClick={() => {
              setPinChangeError(null);
              setPinChangeSuccess(null);
              setPinChangeModalOpen(true);
            }}
            variant="outline"
            size="sm"
            className="rounded-none border border-amber-400 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 h-9 px-3.5 text-xs font-black cursor-pointer shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
            <span>Master Void PIN</span>
          </Button>

          {/* Google Calendar Live Sync Trigger */}
          <Button
            type="button"
            onClick={() => setIsGCalModalOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-none border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-[#007d48] dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 h-9 px-3.5 text-xs font-black cursor-pointer shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#007d48] dark:text-emerald-400" />
            <span>Google Calendar Live</span>
            <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-emerald-400 animate-pulse ml-1.5" />
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="rounded-none border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 h-9 px-3.5 text-xs font-black cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#0B2A67] dark:text-[#FFD21C]" />
            <span>Export CSV</span>
          </Button>

          {/* Add Staff Account Modal */}
          <Dialog>
            <DialogTrigger
              render={
                <Button size="sm" className="rounded-none bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black h-9 px-4 text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5 stroke-[2.5]" />
                  <span>Add Staff Account</span>
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-foreground rounded-none p-6 sm:p-8 shadow-2xl">
              <form action={createCashierAccount}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
                    Provision Staff Account
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Create a new user account with Cashier or Manager permissions at C&amp;J Arena.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                      Staff Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Jane Doe"
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-medium text-foreground border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="staff@cjcourt.com"
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-medium text-foreground border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                      System Role
                    </Label>
                    <select
                      id="role"
                      name="role"
                      className="w-full h-10 px-3 rounded-none bg-white dark:bg-[#0c1a3b] border border-slate-300 dark:border-white/20 text-foreground text-xs font-bold outline-none focus:border-[#0B2A67] dark:focus:border-[#FFD21C] cursor-pointer"
                    >
                      <option value="cashier" className="dark:bg-[#071E4B]">Cashier Staff</option>
                      <option value="coordinator" className="dark:bg-[#071E4B]">Scheduling Coordinator (Daily Schedule Only)</option>
                      <option value="owner" className="dark:bg-[#071E4B]">Owner / Co-Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                      Temporary Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-mono text-foreground border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <SubmitButton
                    size="lg"
                    loadingText="Creating Staff Account..."
                    className="w-full bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] rounded-none font-black text-xs h-10 shadow-xs cursor-pointer"
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
        <div className="rounded-none border border-[#bf050b]/40 bg-red-50 dark:bg-red-950/40 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-none bg-[#bf050b] text-white flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#bf050b] dark:text-red-300 uppercase tracking-wider flex items-center gap-2">
                <span>Pending Refund Requests ({pendingRefunds.length})</span>
                <span className="w-2 h-2 rounded-full bg-[#bf050b] animate-ping" />
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
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
            className="rounded-none bg-[#bf050b] hover:bg-[#990409] text-white font-black text-xs px-4 h-9 shrink-0 shadow-xs cursor-pointer"
          >
            Review Pending Requests &rarr;
          </Button>
        </div>
      )}

      {/* Metrics Grid (4 Real-time KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Gross Revenue
            </span>
            <div className="w-7 h-7 rounded-none bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#007d48] dark:text-emerald-400">
            ₱{metrics.thisMonthRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-[#007d48] dark:text-emerald-400 flex items-center gap-1 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{metrics.monthOverMonthGrowth >= 0 ? '+' : ''}{metrics.monthOverMonthGrowth.toFixed(1)}% vs. Last Month</span>
          </p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Year-To-Date Gross
            </span>
            <div className="w-7 h-7 rounded-none bg-blue-50 dark:bg-blue-950/60 text-[#0B2A67] dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#0B2A67] dark:text-white">
            ₱{metrics.ytdRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total bookings &amp; pro shop sales
          </p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Hours Booked
            </span>
            <div className="w-7 h-7 rounded-none bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
            {metrics.totalHoursBooked} hrs
          </div>
          <p className="pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {metrics.monthlyHoursBooked} hrs booked this month
          </p>
        </div>

        <div className="rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Court Utilization Rate
            </span>
            <div className="w-7 h-7 rounded-none bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center border border-[#0B2A67]/20 dark:border-white/20">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#007d48] dark:text-emerald-400">
            {metrics.courtOccupancyRate.toFixed(1)}%
          </div>
          <p className="pt-2 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-medium">
            16 hrs/day × 2 indoor courts
          </p>
        </div>
      </div>

      {/* Retail Sales & Discounts Strip (Non-VAT) */}
      <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] shadow-xs">
        <div className="p-3.5 bg-[#0B2A67] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FFD21C]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              POS Retail Sales &amp; Discounts Summary
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-white/90">
            TIN: 432-891-002-00000 &bull; Non-VAT Registered
          </span>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-black/20">
          <div className="p-3 bg-white dark:bg-[#0c1a3b] border border-slate-200 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gross Retail Sales
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-foreground">
              ₱{(metrics.posGrossSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Pre-discount order subtotal</p>
          </div>

          <div className="p-3 bg-white dark:bg-[#0c1a3b] border border-slate-200 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#007d48] dark:text-emerald-400">
              Total Discounts Granted
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-[#007d48] dark:text-emerald-400">
              ₱{(metrics.posDiscounts || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Senior, PWD, Student, Staff</p>
          </div>

          <div className="p-3 bg-white dark:bg-[#0c1a3b] border border-slate-200 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Retail Revenue
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-foreground">
              ₱{(metrics.posNetSales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Net payments collected</p>
          </div>

          <div className="p-3 bg-white dark:bg-[#0c1a3b] border border-slate-200 dark:border-white/10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tax Regime
            </span>
            <div className="text-lg sm:text-xl font-black font-mono text-foreground">
              Non-VAT
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Zero VAT on retail orders</p>
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Card */}
      <div className="rounded-none border border-slate-300 dark:border-white/15 p-4 sm:p-5 bg-white dark:bg-[#071E4B] space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
              Revenue Stream Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PayMongo Online Channels vs. Walk-In Cash POS Register
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Volume: </span>
            <span className="font-black font-mono text-sm text-[#0B2A67] dark:text-[#FFD21C]">
              ₱{(metrics.paymongoRevenue + metrics.cashRevenue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="h-3.5 w-full rounded-none bg-slate-100 dark:bg-black/40 overflow-hidden flex border border-slate-300 dark:border-white/20">
            <div
              style={{ width: `${paymongoPercent}%` }}
              className="bg-[#0B2A67] dark:bg-blue-500 h-full transition-all duration-500"
              title={`PayMongo: ${paymongoPercent}%`}
            />
            <div
              style={{ width: `${cashPercent}%` }}
              className="bg-[#007d48] dark:bg-emerald-500 h-full transition-all duration-500"
              title={`Cash: ${cashPercent}%`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-none bg-[#0B2A67] dark:bg-blue-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold">PayMongo Online Channels:</span>
              <span className="font-black font-mono text-foreground">
                ₱{metrics.paymongoRevenue.toFixed(2)} ({paymongoPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <div className="w-3.5 h-3.5 rounded-none bg-[#007d48] dark:bg-emerald-500 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Cash / Counter POS Register:</span>
              <span className="font-black font-mono text-foreground">
                ₱{metrics.cashRevenue.toFixed(2)} ({cashPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION TABS FOR AUDIT LOGS & MENU INVENTORY */}
      <div className="space-y-4">
        {/* Tab Controls Bar */}
        <div className="flex items-center gap-1 border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] p-1.5 overflow-x-auto shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-none ${
              activeTab === 'bookings'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Court Bookings ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-none ${
              activeTab === 'inventory'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory &amp; Margins ({productList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses_margin')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-none ${
              activeTab === 'expenses_margin'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Daily Expenses &amp; Margins ({expenseList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos_invoices')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-none ${
              activeTab === 'pos_invoices'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>POS Sales Invoices ({txList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duty_roster')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shrink-0 rounded-none ${
              activeTab === 'duty_roster'
                ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Staff on Duty ({activeOnDutyCount} Active)</span>
          </button>
        </div>

        {/* TAB 1: COURT BOOKINGS AUDIT LOG */}
        {activeTab === 'bookings' && (
          <div id="audit-table" className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-x-auto shadow-xs rounded-none">
            <div className="p-3.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C]" />
                  <span>Master Court Booking Audit Log</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified public reservations, walk-in register locks, and transaction statuses.
                </p>
              </div>

              {/* Live Filter & Search Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search player, email, ref..."
                    value={bookingSearch}
                    onChange={(e) => {
                      setBookingSearch(e.target.value);
                      setBookingPage(1);
                    }}
                    className="pl-9 h-9 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-bold text-foreground placeholder:text-slate-400 border border-slate-300 dark:border-white/20 focus:border-[#0B2A67]"
                  />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => {
                    setBookingStatusFilter(e.target.value);
                    setBookingPage(1);
                  }}
                  className="h-9 px-3 rounded-none bg-white dark:bg-[#0c1a3b] border border-slate-300 dark:border-white/20 text-xs font-bold text-[#0B2A67] dark:text-white outline-none cursor-pointer"
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
                  onChange={(e) => {
                    setBookingMethodFilter(e.target.value);
                    setBookingPage(1);
                  }}
                  className="h-9 px-3 rounded-none bg-white dark:bg-[#0c1a3b] border border-slate-300 dark:border-white/20 text-xs font-bold text-[#0B2A67] dark:text-white outline-none cursor-pointer"
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
                <TableHeader className="bg-[#0B2A67] text-white rounded-none">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Ref ID</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Player</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Court</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Time Interval</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Channel</TableHead>
                    <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Total</TableHead>
                    <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs font-medium">
                        No bookings matched your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBookings.map((b) => {
                      const isCheckedIn = b.status === 'checked_in';
                      const isPaid = b.status === 'paid';
                      const isRefundPending = b.status === 'cancelled_refund_pending' || b.refund_status === 'pending';
                      const isCancelled = b.status === 'cancelled';

                      return (
                        <TableRow key={b.id} className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors">
                          <TableCell className="font-mono text-xs font-black text-[#0B2A67] dark:text-[#FFD21C] py-3">
                            #{b.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="font-bold text-foreground text-xs">{b.guest_name || 'Player'}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{b.guest_email || 'Walk-in client'}</div>
                          </TableCell>
                          <TableCell className="font-bold text-[#0B2A67] dark:text-slate-200 text-xs py-3">{b.court_name}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 text-xs font-medium py-3">
                            {formatDateTime(b.start_time)} ({b.duration_hours} hr{b.duration_hours > 1 ? 's' : ''})
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-blue-300 border border-[#0B2A67]/20 dark:border-white/15">
                              {b.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            {isCheckedIn ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Checked In
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-950/60 text-[#0B2A67] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Paid
                              </span>
                            ) : isRefundPending ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-red-50 dark:bg-red-950/60 text-[#bf050b] border border-red-300 dark:border-red-800">
                                Refund Queued
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-[#EDF4FC] dark:bg-[#0c1a3b] text-foreground border border-slate-300 dark:border-white/15">
                                {b.status}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-black font-mono text-xs sm:text-sm text-[#0B2A67] dark:text-[#FFD21C] py-3">
                            ₱{Number(b.total_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {isRefundPending ? (
                              <Button
                                size="xs"
                                onClick={() => setVoidModalBooking(b)}
                                className="bg-[#bf050b] hover:bg-[#990409] text-white text-[11px] font-black px-3 h-7 rounded-none shadow-xs cursor-pointer"
                              >
                                <Wallet className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                            ) : isCancelled ? (
                              <div className="text-right">
                                {b.refund_reference ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#007d48] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-none border border-emerald-200 dark:border-emerald-800"
                                    title={`Refund Ref: ${b.refund_reference}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Refunded
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-bold uppercase">Voided</span>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setVoidModalBooking(b)}
                                className="border-slate-300 dark:border-white/20 text-[#bf050b] hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] px-3 h-7 rounded-none font-bold cursor-pointer"
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

            <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
              <PaginationBar
                meta={buildPaginationMeta(bookingPage, bookingLimit, filteredBookings.length)}
                onPageChange={setBookingPage}
                onLimitChange={(lim) => {
                  setBookingLimit(lim);
                  setBookingPage(1);
                }}
                label="court bookings"
              />
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT & MARGINS TABLE */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Inventory KPI Ribbon (5 Box-type Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total SKUs
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0B2A67] dark:text-white">{totalInventorySkus}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Active catalog items</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#007d48] dark:text-emerald-400">
                  Healthy Stock
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#007d48] dark:text-emerald-400">{healthyInventoryCount}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Above reorder level</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Low Stock Warning
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{lowStockInventoryCount}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Items &le; threshold</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#bf050b] dark:text-red-400">
                  Out of Stock
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#bf050b] dark:text-red-400">{outOfStockInventoryCount}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Needs immediate PO</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 col-span-2 md:col-span-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Stock Value (Cost)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0B2A67] dark:text-[#FFD21C]">
                  ₱{totalInventoryCostVal.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Retail: ₱{totalInventoryRetailVal.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Inventory Table Container */}
            <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-hidden rounded-none shadow-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C]" />
                    <span>Physical Stock &amp; Margins Registry</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage stock levels, unit cost prices (COGS), menu prices, and gross margins per item.
                  </p>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search SKU, product..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                      className="pl-9 h-9 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-bold text-foreground border border-slate-300 dark:border-white/20 focus:border-[#0B2A67]"
                    />
                  </div>

                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => {
                      setInventoryCategoryFilter(e.target.value);
                      setInventoryPage(1);
                    }}
                    className="h-9 px-3 rounded-none bg-white dark:bg-[#0c1a3b] border border-slate-300 dark:border-white/20 text-xs font-bold text-[#0B2A67] dark:text-white outline-none cursor-pointer"
                  >
                    {inventoryCategories.map((c) => (
                      <option key={c} value={c} className="dark:bg-[#071E4B]">
                        {c === 'All' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center border border-slate-300 dark:border-white/20 rounded-none p-0.5 bg-slate-100 dark:bg-[#0c1a3b]">
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryStockFilter('all');
                        setInventoryPage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        inventoryStockFilter === 'all'
                          ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
                      }`}
                    >
                      All ({totalInventorySkus})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryStockFilter('low');
                        setInventoryPage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        inventoryStockFilter === 'low'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
                      }`}
                    >
                      Low ({lowStockInventoryCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInventoryStockFilter('out');
                        setInventoryPage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        inventoryStockFilter === 'out'
                          ? 'bg-[#bf050b] text-white shadow-xs'
                          : 'text-[#bf050b] dark:text-red-400 hover:text-red-800'
                      }`}
                    >
                      Out ({outOfStockInventoryCount})
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportInventoryCSV}
                    className="h-9 px-3 text-xs border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-[#0B2A67] dark:text-[#FFD21C]" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-[#0B2A67] text-white rounded-none sticky top-0 z-10">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3 w-24">SKU</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Product Name</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Category</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase tracking-wider text-white py-3">Stock Level</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Cost Price</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Selling Price</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Unit Margin</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Stock Value (Cost)</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase tracking-wider text-white py-3 w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventoryProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs font-medium">
                          No inventory items matched your search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedInventoryProducts.map((prod) => {
                        const stock = prod.stock_level ?? 0;
                        const threshold = prod.reorder_threshold ?? 10;
                        const cost = prod.cost_price ?? 0;
                        const isOut = stock <= 0;
                        const isLow = stock > 0 && stock <= threshold;
                        const unitMargin = prod.price - cost;
                        const marginPct = prod.price > 0 ? Math.round((unitMargin / prod.price) * 100) : 0;
                        const stockValue = stock * cost;

                        return (
                          <TableRow key={prod.id} className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors">
                            <TableCell className="font-mono text-xs font-black text-[#0B2A67] dark:text-[#FFD21C] py-3">
                              {prod.sku ? (
                                <span className="bg-[#EDF4FC] dark:bg-[#0c1a3b] px-2 py-0.5 rounded-none text-[11px] border border-[#0B2A67]/20 dark:border-white/15">
                                  {prod.sku}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 font-bold text-xs text-foreground">
                              {prod.name}
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-blue-300 border border-[#0B2A67]/20 dark:border-white/15">
                                {prod.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-3 font-mono font-black text-xs">
                              <span className={isOut ? 'text-[#bf050b]' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}>
                                {stock} units
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              {isOut ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-red-50 dark:bg-red-950/60 text-[#bf050b] border border-red-200 dark:border-red-900">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                  Low ({stock})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  In Stock
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-slate-500 dark:text-slate-400 py-3">
                              ₱{cost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-xs text-[#0B2A67] dark:text-white py-3">
                              ₱{Number(prod.price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs py-3">
                              <span className="text-[#007d48] dark:text-emerald-400 font-black">
                                +₱{unitMargin.toFixed(2)}
                              </span>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                ({marginPct}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-xs text-foreground py-3">
                              ₱{stockValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenInventoryAdj(prod)}
                                className="h-7 px-2.5 text-[11px] font-bold border-slate-300 dark:border-white/20 text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer"
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

              <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
                <PaginationBar
                  meta={buildPaginationMeta(inventoryPage, inventoryLimit, filteredInventoryProducts.length)}
                  onPageChange={setInventoryPage}
                  onLimitChange={(lim) => {
                    setInventoryLimit(lim);
                    setInventoryPage(1);
                  }}
                  label="inventory items"
                />
              </div>
            </div>

            {/* Master PIN Tile at bottom of Inventory */}
            <div className="border border-amber-300 dark:border-amber-800/80 p-4 bg-amber-50/40 dark:bg-amber-950/20 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  POS Master PIN Protection: <span className="text-[#007d48] dark:text-emerald-400 font-bold">ACTIVE</span>
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
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
                className="h-9 px-4 text-xs bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black rounded-none cursor-pointer shrink-0 shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Change Master PIN
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: DAILY EXPENSES & PROFIT MARGIN AUDIT */}
        {activeTab === 'expenses_margin' && (
          <div className="space-y-4">
            {/* Financial Margins Overview Ribbon (5 Box-type Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#007d48] dark:text-emerald-400">
                  This Month Gross Revenue
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#007d48] dark:text-emerald-400">
                  ₱{metrics.thisMonthRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Courts + POS Sales</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#bf050b] dark:text-red-400">
                  This Month Expenses
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#bf050b] dark:text-red-400">
                  -₱{(metrics.thisMonthExpenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Operational disbursals</p>
              </div>

              <div className={`rounded-none border p-3.5 space-y-1 shadow-xs ${
                (metrics.netOperatingProfit ?? 0) >= 0
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Net Operating Profit
                </span>
                <div className={`text-xl sm:text-2xl font-black font-mono ${
                  (metrics.netOperatingProfit ?? 0) >= 0 ? 'text-[#007d48] dark:text-emerald-400' : 'text-[#bf050b]'
                }`}>
                  ₱{(metrics.netOperatingProfit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Revenue - Operating Expenses
                </p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Net Profit Margin
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0B2A67] dark:text-[#FFD21C]">
                  {(metrics.profitMarginPct || 0).toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Margin on gross income</p>
              </div>

              <div className="rounded-none border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-[#071E4B] space-y-1 col-span-2 md:col-span-1 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  YTD Total Expenses
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
                  ₱{(metrics.ytdExpenses || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative operating costs</p>
              </div>
            </div>

            {/* Expenses Table Container */}
            <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] overflow-hidden rounded-none shadow-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-[#bf050b]" />
                    <span>Facility Operating Expenses Ledger</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Detailed log of all arena disbursals: utilities, maintenance, supplies, and petty cash.
                  </p>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search expense, ref #..."
                      value={expenseSearch}
                      onChange={(e) => {
                        setExpenseSearch(e.target.value);
                        setExpensePage(1);
                      }}
                      className="pl-9 h-9 rounded-none bg-white dark:bg-[#0c1a3b] text-xs font-bold text-foreground border border-slate-300 dark:border-white/20 focus:border-[#0B2A67]"
                    />
                  </div>

                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => {
                      setExpenseCategoryFilter(e.target.value);
                      setExpensePage(1);
                    }}
                    className="h-9 px-3 rounded-none bg-white dark:bg-[#0c1a3b] border border-slate-300 dark:border-white/20 text-xs font-bold text-[#0B2A67] dark:text-white outline-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="utilities">Utilities</option>
                    <option value="supplies">Kitchen &amp; Bar Supplies</option>
                    <option value="maintenance">Court &amp; Facility Maintenance</option>
                    <option value="petty_cash">Petty Cash Disbursal</option>
                    <option value="staff_food">Staff &amp; Operations</option>
                    <option value="other">Miscellaneous</option>
                  </select>

                  <div className="flex items-center border border-slate-300 dark:border-white/20 rounded-none p-0.5 bg-slate-100 dark:bg-[#0c1a3b]">
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseDateFilter('today');
                        setExpensePage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        expenseDateFilter === 'today'
                          ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseDateFilter('7days');
                        setExpensePage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        expenseDateFilter === '7days'
                          ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseDateFilter('month');
                        setExpensePage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        expenseDateFilter === 'month'
                          ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseDateFilter('all');
                        setExpensePage(1);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-none transition-colors cursor-pointer uppercase ${
                        expenseDateFilter === 'all'
                          ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67]'
                      }`}
                    >
                      All
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="h-9 px-4 text-xs bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black rounded-none cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" /> Log Expense
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportExpensesCSV}
                    className="h-9 px-3 text-xs border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-[#0B2A67] dark:text-[#FFD21C]" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-[#0B2A67] text-white rounded-none sticky top-0 z-10">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3 w-28">Date</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Category</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Description / Purpose</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Payment Channel</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Receipt #</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3">Logged By</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3">Amount (PHP)</TableHead>
                      <TableHead className="text-center text-xs font-black uppercase tracking-wider text-white py-3 w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs font-medium">
                          No expense records matched your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedExpenses.map((exp) => (
                        <TableRow key={exp.id} className="border-b border-slate-100 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors">
                          <TableCell className="font-mono text-xs font-bold py-3 text-slate-600 dark:text-slate-300">
                            {exp.expense_date}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-blue-300 border border-[#0B2A67]/20 dark:border-white/15">
                              {exp.category}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-xs">
                            <span className="font-bold text-foreground">{exp.title}</span>
                            {exp.notes && (
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 italic">
                                {exp.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-foreground border border-slate-300 dark:border-white/15">
                              {exp.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 font-mono text-xs font-bold text-[#0B2A67] dark:text-[#FFD21C]">
                            {exp.receipt_reference || '—'}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {exp.recorder_name || 'Staff'}
                          </TableCell>
                          <TableCell className="py-3 text-right font-mono font-black text-xs text-[#bf050b] dark:text-red-400">
                            -₱{exp.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="h-7 w-7 p-0 text-[#bf050b] hover:bg-red-50 dark:hover:bg-red-950/40 rounded-none cursor-pointer"
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

              <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
                <PaginationBar
                  meta={buildPaginationMeta(expensePage, expenseLimit, filteredExpenses.length)}
                  onPageChange={setExpensePage}
                  onLimitChange={(lim) => {
                    setExpenseLimit(lim);
                    setExpensePage(1);
                  }}
                  label="expenses"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: POS SALES INVOICES & AUDIT */}
        {activeTab === 'pos_invoices' && (
          <div className="space-y-6">
            {/* POS Security & Supervisor Void PIN Control Card */}
            <div className="border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/25 p-5 rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-none bg-amber-200/80 dark:bg-amber-900/50 border border-amber-400/60 text-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                      POS Supervisor Void Authorization
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-none bg-emerald-600 text-white">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/80 max-w-2xl font-medium">
                    Cashiers must enter the Master PIN to void individual items, clear active carts, or reverse completed sales invoices.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setPinChangeError(null);
                  setPinChangeSuccess(null);
                  setPinChangeModalOpen(true);
                }}
                className="h-9 px-4 text-xs bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] rounded-none cursor-pointer font-black uppercase tracking-wider shrink-0 shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5 text-[#FFD21C] dark:text-[#0B2A67]" />
                Change Master PIN
              </Button>
            </div>

            <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] rounded-none overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-none bg-[#0B2A67] dark:bg-[#FFD21C]" />
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                      POS Sales Invoice Registry &amp; Void Audit
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    All completed and voided retail sales with BIR statutory tax classifications and supervisor overrides.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search invoice, customer..."
                      value={txSearch}
                      onChange={(e) => {
                        setTxSearch(e.target.value);
                        setTxPage(1);
                      }}
                      className="pl-10 h-9 rounded-none bg-white dark:bg-[#071E4B] text-xs text-foreground placeholder:text-slate-400 border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <select
                    value={txStatusFilter}
                    onChange={(e) => {
                      setTxStatusFilter(e.target.value);
                      setTxPage(1);
                    }}
                    className="h-9 px-3 rounded-none bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-xs font-bold text-foreground outline-none cursor-pointer"
                  >
                    <option value="all">All Invoices</option>
                    <option value="completed">Completed Only</option>
                    <option value="voided">Voided Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#0B2A67] text-white rounded-none border-b-2 border-[#FFD21C]">
                    <TableRow className="border-[#0B2A67] hover:bg-transparent">
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Invoice No</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Customer</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Cashier on Duty</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Timestamp</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Channel</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Gross</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Discount</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Net Amount</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          No POS transactions matched your search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((tx) => {
                        const isVoided = tx.status === 'voided';
                        const isDiscounted = tx.discount_type === 'senior_citizen' || tx.discount_type === 'pwd';

                        return (
                          <TableRow
                            key={tx.id}
                            className="border-b border-slate-200 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors rounded-none"
                          >
                            <TableCell className="font-mono text-xs font-black text-foreground">
                              <span className={isVoided ? "line-through text-red-500/70" : "text-[#0B2A67] dark:text-[#FFD21C]"}>
                                {tx.invoice_number || `#${tx.id.slice(0, 8).toUpperCase()}`}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-bold text-foreground">{tx.customer_name || 'Walk-in'}</span>
                              {tx.discount_type === 'senior_citizen' ? (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  Senior (20%)
                                </span>
                              ) : tx.discount_type === 'pwd' ? (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  PWD (20%)
                                </span>
                              ) : tx.discount_type === 'student' ? (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
                                  Student (-₱10)
                                </span>
                              ) : tx.discount_type === 'employee' ? (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded-none text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                  Employee (10%)
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-none bg-[#0B2A67] text-[#FFD21C] border border-[#0B2A67] font-black flex items-center justify-center text-[10px] shrink-0">
                                  {(tx.cashier_name || 'C')[0].toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-foreground block">{tx.cashier_name || 'System / Staff'}</span>
                                  {tx.cashier_role && (
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider block">
                                      {tx.cashier_role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium font-mono">
                              {formatDateTime(tx.created_at)}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-foreground border border-slate-300 dark:border-white/20">
                                {tx.payment_method?.startsWith('Split:')
                                  ? 'Split (E-Wallet + Cash)'
                                  : tx.payment_method}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
                              ₱{Number(tx.gross_amount || tx.total_amount).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold text-[#007d48] dark:text-emerald-400">
                              {Number(tx.discount_amount) > 0 ? `-₱${Number(tx.discount_amount).toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className={`text-right font-mono font-black text-sm ${isVoided ? "line-through text-red-500/70" : "text-foreground"}`}>
                              ₱{Number(tx.total_amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {isVoided ? (
                                <div>
                                  <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-red-100 dark:bg-red-950/80 text-[#bf050b] dark:text-red-400 border border-red-300 dark:border-red-900">
                                    Voided
                                  </span>
                                  {tx.void_reason && (
                                    <span className="block text-[10px] text-slate-500 italic truncate max-w-[120px] mt-0.5" title={tx.void_reason}>
                                      {tx.void_reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  Completed
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isVoided ? (
                                <span className="text-[10px] font-black uppercase text-slate-400 italic">Voided</span>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleTxVoidClick(tx)}
                                  className="rounded-none border border-red-300 dark:border-red-900 text-[#bf050b] hover:bg-red-50 dark:hover:bg-red-950/40 text-[10px] font-black uppercase tracking-wider px-2.5 h-7 cursor-pointer"
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

              <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
                <PaginationBar
                  meta={buildPaginationMeta(txPage, txLimit, filteredTransactions.length)}
                  onPageChange={setTxPage}
                  onLimitChange={(lim) => {
                    setTxLimit(lim);
                    setTxPage(1);
                  }}
                  label="sales invoices"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF ON DUTY & SHIFT INSPECTOR */}
        {activeTab === 'duty_roster' && (
          <div className="space-y-6">
            {/* Real-time Summary Header */}
            <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] rounded-none p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-none bg-[#0B2A67] dark:bg-[#FFD21C]" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    Cashier Shift &amp; Duty Roster Manager
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse" />
                    {activeOnDutyCount} Active On Duty
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Inspect which cashiers and coordinators are currently clocked in, or look up exact duty coverage at any past date and hour.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    const pht = new Date(d.getTime() + 8 * 3600 * 1000);
                    const curDate = pht.toISOString().split('T')[0];
                    const curTime = `${String(pht.getUTCHours()).padStart(2, '0')}:${String(pht.getUTCMinutes()).padStart(2, '0')}`;
                    setInspectorDate(curDate);
                    setInspectorTime(curTime);
                    handleInspectDutyTime(curDate, curTime);
                  }}
                  className="rounded-none border border-slate-300 dark:border-white/20 bg-white dark:bg-[#071E4B] text-foreground hover:bg-[#EDF4FC]/60 dark:hover:bg-white/10 text-xs h-9 px-4 font-bold cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  Live Duty Check
                </Button>
              </div>
            </div>

            {/* Currently Active On-Duty Cashiers Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Active Cashiers On Duty Right Now ({activeOnDutyCount})
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Auto-synced with POS clock-ins</span>
              </div>

              {activeOnDutySessions.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 p-8 text-center rounded-none">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide">No cashiers currently on duty</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Cashiers appear here automatically when they clock in at the cashier terminal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOnDutySessions.map((session) => {
                    const startD = new Date(session.started_at);
                    const nowD = new Date();
                    const diffMins = Math.max(0, Math.floor((nowD.getTime() - startD.getTime()) / (1000 * 60)));
                    const diffHrs = Math.floor(diffMins / 60);
                    const remMins = diffMins % 60;
                    const durationText = diffHrs > 0 ? `${diffHrs}h ${remMins}m` : `${remMins}m`;

                    return (
                      <div
                        key={session.id}
                        className="rounded-none border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-white dark:bg-[#071E4B] p-5 shadow-xs relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-none bg-[#0B2A67] text-[#FFD21C] border-2 border-[#0B2A67] font-black flex items-center justify-center text-sm shrink-0">
                              {(session.cashier_name || 'C')[0].toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                {session.cashier_name}
                              </h5>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                                {session.cashier_email}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-600 text-white">
                            ON DUTY
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Shift Started</span>
                            <p className="font-semibold text-foreground font-mono">{formatDateTime(session.started_at)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Duration</span>
                            <p className="font-black text-emerald-600 dark:text-emerald-400">{durationText}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Opening Float</span>
                            <p className="font-semibold font-mono text-foreground">₱{Number(session.opening_float || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Role</span>
                            <p className="font-bold text-foreground uppercase text-[11px]">{session.cashier_role || 'Staff'}</p>
                          </div>
                        </div>

                        {session.notes && (
                          <div className="mt-3 p-2 bg-slate-50 dark:bg-white/5 rounded-none border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 italic">
                            &quot;{session.notes}&quot;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* INTERACTIVE DUTY TIME INSPECTOR CARD */}
            <div className="border border-[#0B2A67]/30 dark:border-white/20 bg-[#EDF4FC]/40 dark:bg-[#071E4B] p-6 rounded-none shadow-xs">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-none bg-[#0B2A67] text-[#FFD21C] border border-[#0B2A67] flex items-center justify-center shrink-0">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black uppercase tracking-tight text-[#0B2A67] dark:text-[#FFD21C]">
                    Duty Time Inspector &mdash; &quot;Who was on duty at that time?&quot;
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Pick any target date and time to verify the exact cashier roster active at that exact minute, cross-referenced with POS receipts and court lock logs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="inspDate" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Target Date
                  </Label>
                  <Input
                    id="inspDate"
                    type="date"
                    value={inspectorDate}
                    onChange={(e) => setInspectorDate(e.target.value)}
                    className="h-10 px-3.5 rounded-none bg-white dark:bg-black text-xs font-medium border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inspTime" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Target Time (24-Hour)
                  </Label>
                  <Input
                    id="inspTime"
                    type="time"
                    value={inspectorTime}
                    onChange={(e) => setInspectorTime(e.target.value)}
                    className="h-10 px-3.5 rounded-none bg-white dark:bg-black text-xs font-medium border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => handleInspectDutyTime()}
                  disabled={isInspecting}
                  className="h-10 rounded-none bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  {isInspecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inspecting Roster...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" /> Inspect Duty Roster
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Shift Presets */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">Quick Shifts:</span>
                {[
                  { label: 'Now', time: 'now' },
                  { label: 'Morning (08:00)', time: '08:00' },
                  { label: 'Noon (12:00)', time: '12:00' },
                  { label: 'Afternoon (15:00)', time: '15:00' },
                  { label: 'Prime Evening (19:00)', time: '19:00' },
                  { label: 'Closing (22:00)', time: '22:00' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (preset.time === 'now') {
                        const d = new Date();
                        const pht = new Date(d.getTime() + 8 * 3600 * 1000);
                        const curDate = pht.toISOString().split('T')[0];
                        const curTime = `${String(pht.getUTCHours()).padStart(2, '0')}:${String(pht.getUTCMinutes()).padStart(2, '0')}`;
                        setInspectorDate(curDate);
                        setInspectorTime(curTime);
                        handleInspectDutyTime(curDate, curTime);
                      } else {
                        setInspectorTime(preset.time);
                        handleInspectDutyTime(inspectorDate, preset.time);
                      }
                    }}
                    className="px-3 py-1 rounded-none text-xs font-bold bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 hover:border-[#0B2A67] dark:hover:border-[#FFD21C] text-foreground transition-colors cursor-pointer shadow-2xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Inspector Result Display */}
              {inspectorResults !== null && (
                <div className="mt-6 pt-5 border-t border-[#0B2A67]/20 dark:border-white/15 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        Inspection Results for:
                      </span>
                      <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-none bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67]">
                        {inspectorDate} @ {inspectorTime} PHT
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {inspectorResults.length} staff member{inspectorResults.length === 1 ? '' : 's'} on duty
                    </span>
                  </div>

                  {inspectorResults.length === 0 ? (
                    <div className="p-4 rounded-none bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-center">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                        No cashiers were on active duty at {inspectorDate} {inspectorTime}.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        No shift session covered this timestamp in the database.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inspectorResults.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 rounded-none bg-white dark:bg-black/40 border border-emerald-400 dark:border-emerald-700/80 shadow-2xs"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground">{r.cashier_name}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-950 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              {r.status === 'on_duty' ? 'ACTIVE SHIFT' : 'SHIFT COMPLETED'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            <div>Email: <span className="text-foreground font-mono">{r.cashier_email}</span></div>
                            <div>Shift Window: <span className="text-foreground font-medium">{formatDateTime(r.started_at)} &rarr; {r.ended_at ? formatDateTime(r.ended_at) : 'Active / Ongoing'}</span></div>
                            <div>Opening Float: <span className="text-foreground font-bold font-mono">₱{Number(r.opening_float || 0).toFixed(2)}</span></div>
                            {r.closing_cash !== null && r.closing_cash !== undefined && (
                              <div>Closing Cash: <span className="text-foreground font-bold font-mono">₱{Number(r.closing_cash).toFixed(2)}</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MASTER SHIFT AUDIT LOG TABLE */}
            <div className="border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] rounded-none overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-none bg-[#0B2A67] dark:bg-[#FFD21C]" />
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                      Historical Cashier Shift Log &amp; Cash Balance
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Comprehensive record of cashier terminals, opening floats, closing cash declarations, and notes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search cashier name, email..."
                      value={dutySearch}
                      onChange={(e) => setDutySearch(e.target.value)}
                      className="pl-10 h-9 rounded-none bg-white dark:bg-[#071E4B] text-xs text-foreground placeholder:text-slate-400 border border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <select
                    value={dutyStatusFilter}
                    onChange={(e) => setDutyStatusFilter(e.target.value as 'all' | 'on_duty' | 'off_duty')}
                    className="h-9 px-3 rounded-none bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-xs font-bold text-foreground outline-none cursor-pointer"
                  >
                    <option value="all">All Shifts</option>
                    <option value="on_duty">On Duty Only</option>
                    <option value="off_duty">Clocked Out / Completed</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#0B2A67] text-white rounded-none border-b-2 border-[#FFD21C]">
                    <TableRow className="border-[#0B2A67] hover:bg-transparent">
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Cashier</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Status</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Shift Start</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Shift End</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Opening Float</TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-wider text-white py-3">Closing Cash</TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-wider text-white py-3">Notes / Handover</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDutySessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          No shift logs found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDutySessions.map((session) => {
                        const isOnDuty = session.status === 'on_duty';
                        return (
                          <TableRow
                            key={session.id}
                            className="border-b border-slate-200 dark:border-white/10 hover:bg-[#EDF4FC]/40 dark:hover:bg-white/5 transition-colors rounded-none"
                          >
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-none bg-[#0B2A67] text-[#FFD21C] border border-[#0B2A67] font-black flex items-center justify-center text-[10px] shrink-0">
                                  {(session.cashier_name || 'C')[0].toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-foreground block">{session.cashier_name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono block">{session.cashier_email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isOnDuty ? (
                                <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-[#007d48] dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  ON DUTY
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                  OFF DUTY
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium font-mono">
                              {formatDateTime(session.started_at)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium font-mono">
                              {session.ended_at ? formatDateTime(session.ended_at) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold italic">Ongoing Shift</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium text-foreground">
                              ₱{Number(session.opening_float || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold text-foreground">
                              {session.closing_cash !== null && session.closing_cash !== undefined
                                ? `₱${Number(session.closing_cash).toFixed(2)}`
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={session.notes || ''}>
                              {session.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Total Recorded Shifts: {filteredDutySessions.length}</span>
                <span>{activeOnDutyCount} Cashier{activeOnDutyCount === 1 ? '' : 's'} Active</span>
              </div>
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
          <div className="relative w-full max-w-md bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-foreground rounded-none p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setPinChangeModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleMasterPinUpdate}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-none bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 flex items-center justify-center mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-[#0B2A67] dark:text-[#FFD21C]">
                  Update POS Master PIN
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Change the supervisor Master PIN used by cashiers and managers for POS item voiding, order cancellation, and invoice voiding.
                </p>
              </div>

              {/* Current PIN Inspection Card for Admin */}
              <div className="mt-3 p-3 rounded-none bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Current Master PIN
                  </span>
                  <div className="text-sm font-mono font-black text-foreground">
                    {showActivePinRevealed ? masterPinState : '••••••••'.slice(0, masterPinState.length || 4)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowActivePinRevealed(!showActivePinRevealed)}
                  className="rounded-none h-8 px-2.5 text-xs text-slate-500 hover:text-foreground cursor-pointer font-bold uppercase tracking-wider"
                >
                  {showActivePinRevealed ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Reveal
                    </>
                  )}
                </Button>
              </div>

              {pinChangeError && (
                <div className="mt-3 p-3 rounded-none bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-[#bf050b] dark:text-red-400 font-bold uppercase tracking-wide">
                  {pinChangeError}
                </div>
              )}

              {pinChangeSuccess && (
                <div className="mt-3 p-3 rounded-none bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-xs text-[#007d48] dark:text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pinChangeSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5 py-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="currentPin" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Current Master PIN <span className="text-slate-400 font-normal lowercase">(optional for admin)</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="currentPin"
                      type={showPinInputs ? 'text' : 'password'}
                      maxLength={8}
                      placeholder="Enter current PIN"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      className="h-10 px-4 pr-10 rounded-none bg-white dark:bg-black text-xs font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="newPin" className="text-xs font-black uppercase tracking-wider text-foreground">
                      New Master PIN (4–8 digits)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPinInputs(!showPinInputs)}
                      className="text-[11px] text-slate-500 hover:text-foreground flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                    >
                      {showPinInputs ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPinInputs ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <Input
                    id="newPin"
                    type={showPinInputs ? 'text' : 'password'}
                    maxLength={8}
                    placeholder="Enter new 4–8 digit PIN"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    required
                    className="h-10 px-4 rounded-none bg-white dark:bg-black text-xs font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPin" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Confirm New Master PIN
                  </Label>
                  <Input
                    id="confirmPin"
                    type={showPinInputs ? 'text' : 'password'}
                    maxLength={8}
                    placeholder="Confirm new PIN"
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    required
                    className="h-10 px-4 rounded-none bg-white dark:bg-black text-xs font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPinChangeModalOpen(false)}
                  className="flex-1 h-10 text-xs rounded-none border border-slate-300 dark:border-white/20 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingPin}
                  className="flex-1 h-10 text-xs bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] rounded-none font-black uppercase tracking-wider cursor-pointer shadow-xs"
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
          <div className="relative w-full max-w-md bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-foreground rounded-none p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedProdForAdj(null)}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleSaveInventoryAdj}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-none bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 flex items-center justify-center mb-2">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-[#0B2A67] dark:text-[#FFD21C]">
                  Adjust Inventory &amp; Cost
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {selectedProdForAdj.name} {selectedProdForAdj.sku ? `(${selectedProdForAdj.sku})` : ''}
                </p>
              </div>

              {adjFeedback && (
                <div
                  className={`mt-3 p-3 rounded-none border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    adjFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-[#007d48] dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-[#bf050b] dark:text-red-400'
                  }`}
                >
                  {adjFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{adjFeedback.message}</span>
                </div>
              )}

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminAdjStock" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Physical Stock Count
                    </Label>
                    <Input
                      id="adminAdjStock"
                      type="number"
                      min={0}
                      value={adjStock}
                      onChange={(e) => setAdjStock(parseInt(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-sm font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminAdjReorder" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Reorder Threshold
                    </Label>
                    <Input
                      id="adminAdjReorder"
                      type="number"
                      min={0}
                      value={adjReorder}
                      onChange={(e) => setAdjReorder(parseInt(e.target.value) || 0)}
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-sm font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminAdjCost" className="text-xs font-black uppercase tracking-wider text-foreground">
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
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-sm font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminAdjPrice" className="text-xs font-black uppercase tracking-wider text-foreground">
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
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-sm font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>
                </div>

                {/* Live Margin Calculation Preview */}
                <div className="p-3.5 bg-[#EDF4FC]/60 dark:bg-white/5 rounded-none border border-[#0B2A67]/20 dark:border-white/10 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Unit Profit Margin:</span>
                    <span className="font-mono font-black text-[#007d48] dark:text-emerald-400">
                      +₱{(adjPrice - adjCost).toFixed(2)} ({adjPrice > 0 ? Math.round(((adjPrice - adjCost) / adjPrice) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Inventory Value At Cost:</span>
                    <span className="font-mono font-black text-foreground">
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
                  className="flex-1 h-10 text-xs rounded-none border border-slate-300 dark:border-white/20 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="flex-1 h-10 text-xs bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] rounded-none font-black uppercase tracking-wider cursor-pointer shadow-xs"
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
          <div className="relative w-full max-w-lg bg-white dark:bg-[#071E4B] border border-slate-300 dark:border-white/20 text-foreground rounded-none p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setIsAddExpenseOpen(false);
                setExpError(null);
                setExpSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleAddExpenseSubmit}>
              <div className="space-y-1 pb-2">
                <div className="w-10 h-10 rounded-none bg-red-100 dark:bg-red-950/60 text-[#bf050b] border border-red-300 dark:border-red-800 flex items-center justify-center mb-2">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-[#0B2A67] dark:text-[#FFD21C]">
                  Record Operating Expense
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Log facility expenditures, maintenance, utilities, kitchen stock replenishment, or petty cash.
                </p>
              </div>

              {expError && (
                <div className="mt-3 p-3 rounded-none bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-[#bf050b] dark:text-red-400 font-bold uppercase tracking-wider">
                  {expError}
                </div>
              )}

              {expSuccess && (
                <div className="mt-3 p-3 rounded-none bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-xs text-[#007d48] dark:text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{expSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminExpDate" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Expense Date
                    </Label>
                    <Input
                      id="adminExpDate"
                      type="date"
                      value={newExpDate}
                      onChange={(e) => setNewExpDate(e.target.value)}
                      required
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-xs border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminExpCategory" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Expense Category
                    </Label>
                    <select
                      id="adminExpCategory"
                      value={newExpCategory}
                      onChange={(e) => setNewExpCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-none bg-white dark:bg-black text-xs border border-slate-300 dark:border-white/20 text-foreground outline-none font-bold"
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
                  <Label htmlFor="adminExpTitle" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Expense Description / Item
                  </Label>
                  <Input
                    id="adminExpTitle"
                    placeholder="e.g., Ice delivery 50kg, Replacement net straps, Power bill"
                    value={newExpTitle}
                    onChange={(e) => setNewExpTitle(e.target.value)}
                    required
                    className="h-10 px-4 rounded-none bg-white dark:bg-black text-xs border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="adminExpAmount" className="text-xs font-black uppercase tracking-wider text-foreground">
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
                      className="h-10 px-3 rounded-none bg-white dark:bg-black text-sm font-mono font-black border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adminExpPayment" className="text-xs font-black uppercase tracking-wider text-foreground">
                      Payment Disbursed Via
                    </Label>
                    <select
                      id="adminExpPayment"
                      value={newExpPaymentMethod}
                      onChange={(e) => setNewExpPaymentMethod(e.target.value)}
                      className="w-full h-10 px-3 rounded-none bg-white dark:bg-black text-xs border border-slate-300 dark:border-white/20 text-foreground outline-none font-bold"
                    >
                      <option value="cash">Cash (Drawer / Petty Cash)</option>
                      <option value="gcash">GCash (Arena Business)</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer / Check</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminExpReceipt" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Official Receipt / Invoice # (Optional)
                  </Label>
                  <Input
                    id="adminExpReceipt"
                    placeholder="e.g. OR-884920 or Supplier Inv #"
                    value={newExpReceiptRef}
                    onChange={(e) => setNewExpReceiptRef(e.target.value)}
                    className="h-10 px-4 rounded-none bg-white dark:bg-black text-xs font-mono border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminExpNotes" className="text-xs font-black uppercase tracking-wider text-foreground">
                    Remarks / Vendor Notes (Optional)
                  </Label>
                  <Input
                    id="adminExpNotes"
                    placeholder="Additional context or supplier details"
                    value={newExpNotes}
                    onChange={(e) => setNewExpNotes(e.target.value)}
                    className="h-10 px-4 rounded-none bg-white dark:bg-black text-xs border-slate-300 dark:border-white/20 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 h-10 text-xs rounded-none border border-slate-300 dark:border-white/20 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingExp}
                  className="flex-1 h-10 text-xs bg-[#0B2A67] hover:bg-[#081F4D] dark:bg-[#FFD21C] dark:hover:bg-[#E5BC19] text-white dark:text-[#0B2A67] rounded-none font-black uppercase tracking-wider cursor-pointer shadow-xs"
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
