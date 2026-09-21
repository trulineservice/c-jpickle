"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Package, 
  Plus, 
  Flame, 
  Table as TableIcon, 
  LayoutGrid, 
  Receipt, 
  Ban, 
  CheckCircle2, 
  History,
  TrendingDown,
  X,
  Clock,
  Banknote,
  QrCode,
  CreditCard,
  Coffee,
  CupSoda,
  UtensilsCrossed,
  Boxes,
  Sparkles,
  Filter
} from "lucide-react";
import { 
  processPosTransaction, 
  verifyPosMasterPin, 
  voidPosTransactionWithPin,
  clockInCashierAction,
  clockOutCashierAction,
  type PosCheckoutResult 
} from "@/app/actions";
import { ComplianceDiscountPanel } from "@/components/pos/compliance-discount-panel";
import { PosCartPanel, type PosCartItem } from "@/components/pos/pos-cart-panel";
import { SalesInvoiceModal } from "@/components/pos/sales-invoice-modal";
import { PosMasterPinModal } from "@/components/pos/pos-master-pin-modal";
import { playHapticSound } from "@/lib/motion-feedback";
import { usePosCartStore } from "@/lib/stores";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type Product = {
  id: string;
  sku?: string;
  name: string;
  price: number;
  category: string;
  stock_level?: number;
};

export interface PosRecentTransaction {
  id: string;
  invoice_number?: string | null;
  customer_name?: string | null;
  total_amount: number;
  gross_amount?: number;
  payment_method: string;
  status: string;
  created_at: string;
  void_reason?: string | null;
  voided_at?: string | null;
}

export interface StaffDutySessionInfo {
  id: string;
  cashier_id: string;
  started_at: string;
  ended_at?: string | null;
  status: 'on_duty' | 'off_duty';
  opening_float?: number | null;
  closing_cash?: number | null;
  notes?: string | null;
}

export default function CashierClient({
  initialProducts,
  initialRecentTransactions = [],
  currentStaff = null,
  initialDutySession = null,
}: {
  initialProducts: Product[];
  initialRecentTransactions?: PosRecentTransaction[];
  currentStaff?: { id: string; full_name?: string | null; email?: string | null; role?: string | null } | null;
  initialDutySession?: StaffDutySessionInfo | null;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [recentTransactions, setRecentTransactions] = useState<PosRecentTransaction[]>(initialRecentTransactions);
  const [isProcessing, setIsProcessing] = useState(false);

  // POS Cart, Payment & Compliance Zustand Store (Persistent & Centralized)
  const {
    cart,
    setCart,
    paymentMethod,
    setPaymentMethod,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    discountType,
    setDiscountType,
    customerName,
    setCustomerName,
    customerTin,
    setCustomerTin,
    discountIdNumber,
    setDiscountIdNumber,
    clearCart,
    addToCart: storeAddToCart,
    updateQuantity: storeUpdateQuantity,
  } = usePosCartStore();

  // Cashier Duty Shift State
  const [dutySession, setDutySession] = useState<StaffDutySessionInfo | null>(initialDutySession);
  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [dutyModalMode, setDutyModalMode] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [floatAmountInput, setFloatAmountInput] = useState('500');
  const [closingCashInput, setClosingCashInput] = useState('');
  const [dutyNotesInput, setDutyNotesInput] = useState('');
  const [isSubmittingDuty, setIsSubmittingDuty] = useState(false);
  const [dutyFeedback, setDutyFeedback] = useState<string | null>(null);

  const [complianceError, setComplianceError] = useState<string | null>(null);

  // Sales Invoice Receipt Modal
  const [completedInvoice, setCompletedInvoice] = useState<PosCheckoutResult | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Recent Sales & Void Drawer Modal
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);

  // Master PIN Authorization Modal State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingPinAction, setPendingPinAction] = useState<
    | { type: "void_cart_item"; itemId: string; itemName: string }
    | { type: "clear_cart" }
    | { type: "void_transaction"; transaction: PosRecentTransaction }
    | null
  >(null);
  const [voidFeedbackMsg, setVoidFeedbackMsg] = useState<string | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<"all" | "coffee" | "drinks" | "food" | "supplies">("all");

  const DEPARTMENT_CATEGORIES: Record<string, string[]> = {
    coffee: ["Coffee", "Decaf Coffee"],
    drinks: ["Non-Coffee & Tea", "Fruit Shakes", "Beverages & Hydration"],
    food: ["Silog Meals", "Snacks & Dimsum", "Noodles & Pasta", "Rice & Add-ons"],
    supplies: ["Bar Supplies", "Kitchen Supplies"],
  };

  const categories = ["All", ...Array.from(new Set(
    products
      .filter((p) => {
        if (selectedDepartment === "all") return true;
        const allowed = DEPARTMENT_CATEGORIES[selectedDepartment] || [];
        return allowed.includes(p.category);
      })
      .map((p) => p.category)
  ))];

  const filteredProducts = products.filter((product) => {
    // 1. Department match
    if (selectedDepartment !== "all") {
      const allowedCats = DEPARTMENT_CATEGORIES[selectedDepartment] || [];
      if (!allowedCats.includes(product.category)) return false;
    }
    // 2. Category match
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    if (!matchesCategory) return false;

    // 3. Search query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Group filtered products by category for clean section headers
  const groupedProducts = Array.from(
    filteredProducts.reduce((map, product) => {
      const cat = product.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(product);
      return map;
    }, new Map<string, Product[]>()).entries()
  );

  const getQuantityInCart = (productId: string) => {
    const item = cart.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  };

  const addToCart = (product: Product) => {
    const success = storeAddToCart(product);
    if (!success) {
      playHapticSound("error");
      return;
    }
    playHapticSound("scan");
  };

  // Quantity updates (if decremented to zero, prompt for Master PIN)
  const updateQuantity = (id: string, delta: number) => {
    const res = storeUpdateQuantity(id, delta);
    if (res.requiresPin && res.item) {
      // Prompt for Master PIN to void this item
      requestVoidItem(res.item.id, res.item.name);
      return;
    }
    playHapticSound("tap");
  };

  // Request Master PIN to void item from active cart
  const requestVoidItem = (id: string, name: string) => {
    setPendingPinAction({ type: "void_cart_item", itemId: id, itemName: name });
    setPinModalOpen(true);
  };

  // Request Master PIN to clear entire active order
  const requestClearCart = () => {
    if (cart.length === 0) return;
    setPendingPinAction({ type: "clear_cart" });
    setPinModalOpen(true);
  };

  // Request Master PIN to void a completed sales invoice
  const requestVoidTransaction = (tx: PosRecentTransaction) => {
    setPendingPinAction({ type: "void_transaction", transaction: tx });
    setPinModalOpen(true);
  };

  // Execute authenticated void action
  const handlePinSuccess = async (pin: string, reason?: string) => {
    if (!pendingPinAction) return;

    if (pendingPinAction.type === "void_cart_item") {
      const res = await verifyPosMasterPin(pin);
      if (!res.success) {
        return { success: false, error: res.error || "Invalid Master PIN." };
      }
      // Void item from cart
      setCart((prev) => prev.filter((i) => i.id !== pendingPinAction.itemId));
      setPendingPinAction(null);
      return { success: true };
    }

    if (pendingPinAction.type === "clear_cart") {
      const res = await verifyPosMasterPin(pin);
      if (!res.success) {
        return { success: false, error: res.error || "Invalid Master PIN." };
      }
      // Clear entire order via store
      clearCart();
      setComplianceError(null);
      setPendingPinAction(null);
      return { success: true };
    }

    if (pendingPinAction.type === "void_transaction") {
      const res = await voidPosTransactionWithPin({
        transactionId: pendingPinAction.transaction.id,
        pin,
        reason: reason || "Supervisor Void",
      });

      if (!res.success) {
        return { success: false, error: res.error || "Failed to void transaction." };
      }

      // Update local transaction state
      setRecentTransactions((prev) =>
        prev.map((tx) =>
          tx.id === pendingPinAction.transaction.id
            ? { ...tx, status: "voided", void_reason: reason || "Supervisor Void", voided_at: new Date().toISOString() }
            : tx
        )
      );

      setVoidFeedbackMsg(res.message || "Transaction voided successfully.");
      setTimeout(() => setVoidFeedbackMsg(null), 5000);
      setPendingPinAction(null);
      return { success: true };
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const isStatutory = discountType === "senior_citizen" || discountType === "pwd";

    if (isStatutory) {
      if (!discountIdNumber.trim()) {
        setComplianceError(
          `Please enter the ${
            discountType === "senior_citizen" ? "Senior Citizen" : "PWD"
          } ID number for BIR audit compliance.`
        );
        return;
      }
      if (!customerName.trim()) {
        setComplianceError("Cardholder's name is required for BIR discount audit trail.");
        return;
      }
    }

    setComplianceError(null);
    setIsProcessing(true);

    try {
      const rawGross = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const result = await processPosTransaction(cart, rawGross, paymentMethod, {
        customerName: customerName.trim() || undefined,
        customerTin: customerTin.trim() || undefined,
        discountType,
        discountIdNumber: discountIdNumber.trim() || undefined,
      });

      playHapticSound("success");
      setCompletedInvoice(result);
      setShowInvoiceModal(true);

      // Decrement local inventory levels to reflect new stock immediately
      setProducts((prev) =>
        prev.map((prod) => {
          const inCart = cart.find((c) => c.id === prod.id);
          if (inCart && prod.stock_level !== undefined) {
            return { ...prod, stock_level: Math.max(0, prod.stock_level - inCart.quantity) };
          }
          return prod;
        })
      );

      // Add to recent transactions
      setRecentTransactions((prev) => [
        {
          id: result.transactionId,
          invoice_number: result.invoiceNumber,
          customer_name: result.customerName || null,
          total_amount: result.total,
          gross_amount: result.grossAmount,
          payment_method: result.paymentMethod,
          status: "completed",
          created_at: result.createdAt,
        },
        ...prev,
      ]);

      // Reset cart and customer data via store
      clearCart();
      setComplianceError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize POS checkout.";
      setComplianceError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDutyModal = (mode: 'clock_in' | 'clock_out') => {
    setDutyModalMode(mode);
    setDutyFeedback(null);
    setDutyNotesInput('');
    if (mode === 'clock_in') {
      setFloatAmountInput('500');
    } else {
      setClosingCashInput('');
    }
    setDutyModalOpen(true);
  };

  const handleDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDuty(true);
    setDutyFeedback(null);

    try {
      if (dutyModalMode === 'clock_in') {
        const floatVal = parseFloat(floatAmountInput) || 0;
        const res = await clockInCashierAction({
          openingFloat: floatVal,
          notes: dutyNotesInput.trim() || undefined,
        });

        if (!res.success) {
          setDutyFeedback(res.error || 'Failed to clock in.');
        } else {
          setDutySession(res.session as StaffDutySessionInfo);
          setDutyModalOpen(false);
          playHapticSound('success');
        }
      } else {
        const closingVal = closingCashInput.trim() !== '' ? parseFloat(closingCashInput) : undefined;
        const res = await clockOutCashierAction({
          sessionId: dutySession?.id,
          closingCash: closingVal,
          notes: dutyNotesInput.trim() || undefined,
        });

        if (!res.success) {
          setDutyFeedback(res.error || 'Failed to clock out.');
        } else {
          setDutySession(null);
          setDutyModalOpen(false);
          playHapticSound('success');
        }
      }
    } catch (err: unknown) {
      setDutyFeedback(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmittingDuty(false);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Category Badge Colors & Icon Helpers
  const getCategoryBadgeClass = (categoryName: string) => {
    switch (categoryName) {
      case "Coffee":
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-black";
      case "Decaf Coffee":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 font-black";
      case "Non-Coffee & Tea":
      case "Fruit Shakes":
      case "Beverages & Hydration":
        return "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-800";
      case "Silog Meals":
      case "Snacks & Dimsum":
      case "Noodles & Pasta":
      case "Rice & Add-ons":
        return "bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800";
      default:
        return "bg-[#f5f5f5] dark:bg-[#1c1c20] text-[#707072] dark:text-[#8a8a93] border-[#e5e5e5] dark:border-[#27272a]";
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    if (categoryName.toLowerCase().includes("coffee")) {
      return <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (
      categoryName.toLowerCase().includes("drink") ||
      categoryName.toLowerCase().includes("shake") ||
      categoryName.toLowerCase().includes("beverage") ||
      categoryName.toLowerCase().includes("tea")
    ) {
      return <CupSoda className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />;
    }
    if (
      categoryName.toLowerCase().includes("silog") ||
      categoryName.toLowerCase().includes("snack") ||
      categoryName.toLowerCase().includes("noodle") ||
      categoryName.toLowerCase().includes("rice")
    ) {
      return <UtensilsCrossed className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />;
    }
    return <Boxes className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  // Counts per department
  const coffeeItemsCount = products.filter((p) => DEPARTMENT_CATEGORIES.coffee.includes(p.category)).length;
  const drinksItemsCount = products.filter((p) => DEPARTMENT_CATEGORIES.drinks.includes(p.category)).length;
  const foodItemsCount = products.filter((p) => DEPARTMENT_CATEGORIES.food.includes(p.category)).length;
  const suppliesItemsCount = products.filter((p) => DEPARTMENT_CATEGORIES.supplies.includes(p.category)).length;

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#fafafa] dark:bg-background text-[#111111] dark:text-foreground min-h-screen">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#121215] border-b border-[#e5e5e5] dark:border-[#222226] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#007d48] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#007d48]">
                Arena Cockpit Terminal &bull; POS Register
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111] dark:text-foreground">
              Point of Sale &amp; Pro Shop
            </h1>
          </div>

          {/* Cashier Duty Status Pill */}
          <div className="flex items-center gap-2 sm:ml-4">
            {dutySession ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    ON DUTY: {currentStaff?.full_name || 'Cashier'}
                  </span>
                  <span className="text-[9px] text-[#707072] dark:text-[#8a8a93]">
                    Float ₱{Number(dutySession.opening_float || 0).toFixed(0)} &bull; {new Date(dutySession.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDutyModal('clock_out')}
                  className="ml-1 px-2.5 py-1 text-[10px] font-bold uppercase bg-white dark:bg-black text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                >
                  Clock Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 px-3 py-1.5 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  {currentStaff?.full_name ? `${currentStaff.full_name} (Off Duty)` : 'Shift Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenDutyModal('clock_in')}
                  className="ml-1 px-2.5 py-1 text-[10px] font-bold uppercase bg-[#111111] dark:bg-white text-white dark:text-[#111111] rounded-full hover:bg-[#222222] dark:hover:bg-zinc-200 cursor-pointer transition-colors"
                >
                  Clock In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Controls: Search, View Switcher, Recent Sales */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Recent Sales & Void Drawer Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRecentSalesModal(true)}
            className="h-10 px-3.5 rounded-full border-[#cacacb] dark:border-[#3f3f46] text-xs font-bold flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] cursor-pointer"
          >
            <History className="w-4 h-4 text-[#707072]" />
            <span className="hidden sm:inline">Recent Invoices &amp; Void</span>
            <span className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {recentTransactions.length}
            </span>
          </Button>

          {/* Daily Expenses & Shift Margin Link */}
          <Link
            href="/cashier/expenses"
            className="h-10 px-3.5 rounded-full border border-slate-300 dark:border-[#3f3f46] text-xs font-bold flex items-center gap-1.5 text-[#0B2A67] dark:text-[#FFD21C] bg-[#EDF4FC] dark:bg-[#0c1a3b] hover:bg-[#dbeafe] dark:hover:bg-[#13285c] transition-colors cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-[#bf050b]" />
            <span className="hidden md:inline">Expenses &amp; Margins</span>
          </Link>

          {/* Table / Grid Switcher */}
          <div className="flex items-center bg-[#f5f5f5] dark:bg-[#18181c] p-1 rounded-full border border-[#cacacb] dark:border-[#3f3f46]">
            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setViewMode("table");
              }}
              title="Table View (Full Menu)"
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-black text-[#111111] dark:text-foreground shadow-xs"
                  : "text-[#707072] dark:text-[#8a8a93] hover:text-[#111111]"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-[11px]">Table</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setViewMode("grid");
              }}
              title="Grid Cards View"
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-black text-[#111111] dark:text-foreground shadow-xs"
                  : "text-[#707072] dark:text-[#8a8a93] hover:text-[#111111]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Cards</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#707072] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, SKU..."
              className="pl-9 h-10 rounded-full text-xs bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus:border-[#111111] dark:focus:border-white"
            />
          </div>
        </div>
      </div>

      {/* Void Success Banner */}
      {voidFeedbackMsg && (
        <div className="bg-[#e8f5e9] dark:bg-emerald-950/60 border-b border-[#a5d6a7] dark:border-emerald-800 px-6 py-2.5 text-xs text-[#007d48] dark:text-emerald-300 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{voidFeedbackMsg}</span>
        </div>
      )}

      {/* Main Workbench Layout: Catalog (8 cols) & Cart Panel (4 cols) */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Category Tabs & Product Catalog */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Super Department Selector Bar (Prominent Coffee Separation) */}
          <div className="p-2 rounded-2xl bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#27272a] shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setSelectedDepartment("coffee");
                setSelectedCategory("All");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                selectedDepartment === "coffee"
                  ? "bg-amber-700 text-white border-amber-800 shadow-sm"
                  : "bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100"
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-300" />
              <span>☕ Coffee Menu</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                selectedDepartment === "coffee" ? "bg-white/20 text-white" : "bg-amber-200/60 dark:bg-amber-900 text-amber-900 dark:text-amber-100"
              }`}>
                {coffeeItemsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setSelectedDepartment("drinks");
                setSelectedCategory("All");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                selectedDepartment === "drinks"
                  ? "bg-cyan-700 text-white border-cyan-800 shadow-sm"
                  : "bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100"
              }`}
            >
              <CupSoda className="w-3.5 h-3.5" />
              <span>🥤 Cold Drinks &amp; Shakes</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedDepartment === "drinks" ? "bg-white/20 text-white" : "bg-cyan-100 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100"
              }`}>
                {drinksItemsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setSelectedDepartment("food");
                setSelectedCategory("All");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                selectedDepartment === "food"
                  ? "bg-orange-700 text-white border-orange-800 shadow-sm"
                  : "bg-orange-50/60 dark:bg-orange-950/30 text-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800/60 hover:bg-orange-100"
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>🍛 Food &amp; Meals</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedDepartment === "food" ? "bg-white/20 text-white" : "bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100"
              }`}>
                {foodItemsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setSelectedDepartment("supplies");
                setSelectedCategory("All");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                selectedDepartment === "supplies"
                  ? "bg-slate-800 text-white border-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>📦 Supplies</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedDepartment === "supplies" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              }`}>
                {suppliesItemsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setSelectedDepartment("all");
                setSelectedCategory("All");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                selectedDepartment === "all"
                  ? "bg-[#0B2A67] text-white border-[#0B2A67] shadow-sm"
                  : "bg-[#f5f5f5] dark:bg-[#1c1c20] text-[#707072] dark:text-[#8a8a93] border-[#e5e5e5] dark:border-[#27272a] hover:bg-[#e8e8e8]"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>📋 All Menu</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedDepartment === "all" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
              }`}>
                {products.length}
              </span>
            </button>
          </div>

          {/* Sub-Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = cat === "All" 
                ? (selectedDepartment === "all" ? products.length : products.filter(p => (DEPARTMENT_CATEGORIES[selectedDepartment] || []).includes(p.category)).length)
                : products.filter((p) => p.category === cat).length;

              const isActive = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playHapticSound("tap");
                    setSelectedCategory(cat);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                    isActive
                      ? "bg-[#0B2A67] text-white shadow-sm ring-2 ring-[#FFD21C]"
                      : "bg-white dark:bg-[#121215] text-[#707072] dark:text-[#8a8a93] border border-[#e5e5e5] dark:border-[#27272a] hover:border-[#0B2A67] dark:hover:border-[#FFD21C] hover:text-[#0B2A67] dark:hover:text-white"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                    isActive ? "bg-[#FFD21C] text-[#0B2A67]" : "bg-[#EDF4FC] dark:bg-[#1f1f23] text-[#0B2A67] dark:text-[#8a8a93]"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TABLE VIEW */}
          {viewMode === "table" ? (
            <div className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215] rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                <Table className="w-full">
                  <TableHeader className="bg-[#0B2A67] dark:bg-[#071E4B] sticky top-0 z-10 border-b-2 border-[#FFD21C]">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white w-20 py-3.5">SKU</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3.5">Item Name</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3.5">Category</TableHead>
                      <TableHead className="text-xs font-black uppercase tracking-wider text-white py-3.5">Stock Level</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3.5">Price</TableHead>
                      <TableHead className="text-right text-xs font-black uppercase tracking-wider text-white py-3.5 w-36">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-[#707072] text-xs font-medium">
                          No menu items found matching &ldquo;{searchQuery}&rdquo;
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedProducts.map(([categoryName, categoryProds]) => (
                        <React.Fragment key={`group-${categoryName}`}>
                          {/* Category Group Header Row */}
                          <TableRow className="bg-[#EDF4FC] dark:bg-[#15233e] border-y border-[#0B2A67]/15 dark:border-white/10 select-none">
                            <TableCell colSpan={6} className="py-2.5 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(categoryName)}
                                  <span className="font-black text-xs uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
                                    {categoryName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white dark:bg-[#071E4B] text-[#0B2A67] dark:text-white border border-[#0B2A67]/20 dark:border-white/20">
                                  {categoryProds.length} items
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Category Product Rows */}
                          {categoryProds.map((prod) => {
                            const inCartQty = getQuantityInCart(prod.id);
                            const isOutOfStock = prod.stock_level !== undefined && prod.stock_level <= 0;
                            const isLowStock = prod.stock_level !== undefined && prod.stock_level > 0 && prod.stock_level <= 5;

                            return (
                              <TableRow
                                key={prod.id}
                                onClick={() => !isOutOfStock && addToCart(prod)}
                                className={`border-b border-[#e5e5e5]/60 dark:border-[#222226] hover:bg-[#EDF4FC]/70 dark:hover:bg-[#15233e]/50 transition-colors cursor-pointer select-none ${
                                  inCartQty > 0 ? "bg-[#EDF4FC] dark:bg-[#15233e]/80 border-l-4 border-l-[#0B2A67] dark:border-l-[#FFD21C]" : ""
                                }`}
                              >
                                {/* SKU Code */}
                                <TableCell className="py-2.5 font-mono text-xs font-bold text-[#111111] dark:text-foreground">
                                  {prod.sku ? (
                                    <span className="bg-[#EDF4FC] dark:bg-[#1e293b] text-[#0B2A67] dark:text-blue-300 font-mono font-bold px-2 py-0.5 rounded border border-[#0B2A67]/20 text-[11px]">
                                      {prod.sku}
                                    </span>
                                  ) : (
                                    <span className="text-[#a0a0a2]">—</span>
                                  )}
                                </TableCell>

                                {/* Product Name */}
                                <TableCell className="py-2.5">
                                  <span className="font-bold text-xs text-[#111111] dark:text-foreground hover:text-[#0B2A67] dark:hover:text-[#FFD21C] transition-colors">
                                    {prod.name}
                                  </span>
                                </TableCell>

                                {/* Category Badge */}
                                <TableCell className="py-2.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(prod.category)}`}>
                                    {prod.category}
                                  </span>
                                </TableCell>

                                {/* Stock Indicator */}
                                <TableCell className="py-2.5">
                                  {prod.stock_level !== undefined ? (
                                    isOutOfStock ? (
                                      <span className="inline-flex items-center text-[11px] font-black text-[#bf050b] bg-[#bf050b]/10 border border-[#bf050b]/20 px-2 py-0.5 rounded-full">
                                        0 in stock
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="inline-flex items-center text-[11px] font-black text-[#bf050b] bg-amber-50 dark:bg-amber-950/60 border border-amber-300 px-2 py-0.5 rounded-full">
                                        Low ({prod.stock_level})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[11px] font-bold text-[#007d48] dark:text-[#10b981]">
                                        {prod.stock_level} in stock
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[11px] font-bold text-[#007d48]">Available</span>
                                  )}
                                </TableCell>

                                {/* Unit Price */}
                                <TableCell className="py-2.5 text-right font-black text-xs sm:text-sm text-[#0B2A67] dark:text-[#FFD21C] font-mono">
                                  ₱{Number(prod.price).toFixed(2)}
                                </TableCell>

                                {/* Quick Add / Cart Status */}
                                <TableCell className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {inCartQty > 0 && (
                                      <span className="text-[11px] font-black text-[#0B2A67] dark:text-[#FFD21C] bg-[#FFD21C]/20 border border-[#FFD21C] px-2 py-0.5 rounded-full">
                                        {inCartQty} in cart
                                      </span>
                                    )}
                                    <Button
                                      type="button"
                                      size="xs"
                                      disabled={isOutOfStock}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(prod);
                                      }}
                                      className={`h-7 px-3 text-xs font-black rounded-full cursor-pointer transition-all active:scale-[0.98] ${
                                        inCartQty > 0
                                          ? "bg-[#0B2A67] hover:bg-[#123A82] text-white border border-[#FFD21C]/40"
                                          : "bg-[#0B2A67] hover:bg-[#123A82] text-white"
                                      }`}
                                    >
                                      <Plus className="w-3 h-3 mr-1 text-[#FFD21C]" />
                                      Add
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            /* GRID VIEW (Alternative) */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((prod) => {
                const inCartQty = getQuantityInCart(prod.id);
                const isOutOfStock = prod.stock_level !== undefined && prod.stock_level <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`group border rounded-2xl p-4 text-left transition-all flex flex-col justify-between h-44 cursor-pointer active:scale-[0.98] ${
                      inCartQty > 0
                        ? "border-2 border-[#0B2A67] dark:border-[#FFD21C] bg-[#EDF4FC] dark:bg-[#15233e] shadow-sm"
                        : "border-[#e5e5e5] dark:border-[#222226] bg-white dark:bg-[#121215] hover:border-[#0B2A67] dark:hover:border-[#FFD21C] hover:shadow-md"
                    } ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {prod.sku && (
                            <span className="text-[9px] font-mono font-bold text-[#0B2A67] dark:text-[#FFD21C] bg-[#EDF4FC] dark:bg-[#27272a] px-1.5 py-0.5 rounded shrink-0 border border-[#0B2A67]/20">
                              {prod.sku}
                            </span>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border truncate ${getCategoryBadgeClass(prod.category)}`}>
                            {prod.category}
                          </span>
                        </div>
                        {prod.stock_level !== undefined && (
                          <span
                            className={`text-[10px] font-black shrink-0 ${
                              prod.stock_level > 5
                                ? "text-[#007d48]"
                                : prod.stock_level > 0
                                ? "text-[#bf050b]"
                                : "text-[#bf050b]"
                            }`}
                          >
                            {prod.stock_level} in stock
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-[#111111] dark:text-foreground mt-2.5 line-clamp-2 group-hover:text-[#0B2A67] dark:group-hover:text-[#FFD21C] transition-colors">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-[#f5f5f5] dark:border-[#222226] flex items-center justify-between">
                      <span className="text-sm font-black text-[#0B2A67] dark:text-[#FFD21C] font-mono">
                        ₱{Number(prod.price).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        {inCartQty > 0 && (
                          <span className="text-[10px] font-black bg-[#0B2A67] text-[#FFD21C] px-2 py-0.5 rounded-full border border-[#FFD21C]/40">
                            {inCartQty}
                          </span>
                        )}
                        <div className="w-7 h-7 rounded-full bg-[#f5f5f5] dark:bg-[#1a1a1e] group-hover:bg-[#0B2A67] group-hover:text-white dark:group-hover:bg-[#FFD21C] dark:group-hover:text-[#0B2A67] flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 border border-dashed border-[#e5e5e5] rounded-2xl flex flex-col items-center justify-center text-xs text-[#707072] gap-2">
                  <Package className="w-8 h-8 text-[#cacacb]" />
                  <p>No products found matching &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* Compliance Discount Panel */}
          <ComplianceDiscountPanel
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerTin={customerTin}
            onCustomerTinChange={setCustomerTin}
            discountIdNumber={discountIdNumber}
            onDiscountIdNumberChange={setDiscountIdNumber}
            complianceError={complianceError}
          />
        </div>

        {/* Right Column: POS Cart & Checkout Panel */}
        <div className="lg:col-span-4 sticky top-6">
          <PosCartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={(id) => {
              const item = cart.find((i) => i.id === id);
              if (item) requestVoidItem(item.id, item.name);
            }}
            onClearCart={requestClearCart}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            discountType={discountType}
            isProcessing={isProcessing}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Official Sales Invoice Thermal Print Modal */}
      <SalesInvoiceModal
        invoice={completedInvoice}
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
      />

      {/* Recent Sales & Void Drawer Modal */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowRecentSalesModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] rounded-2xl p-6 shadow-2xl z-10 text-[#111111] dark:text-foreground">
            <button
              type="button"
              onClick={() => setShowRecentSalesModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 border-b border-[#e5e5e5] dark:border-[#222226]">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#707072]">
                Shift Audit Log
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-foreground">
                Recent Invoices &amp; Master Void
              </h3>
              <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                Completed sales during your active shift. Voiding requires Master PIN authentication and will restore inventory.
              </p>
            </div>

            <div className="mt-4 max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-[#f5f5f5] dark:bg-[#18181c]">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase">Invoice No</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Time</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Channel</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase">Total</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-[#707072]">
                        No completed sales recorded for this shift yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTransactions.map((tx) => {
                      const isVoided = tx.status === "voided";
                      return (
                        <TableRow key={tx.id} className="border-b border-[#f0f0f0] dark:border-[#222226]">
                          <TableCell className="font-mono text-xs font-bold">
                            {tx.invoice_number || `#${tx.id.slice(0, 8).toUpperCase()}`}
                            {tx.customer_name && (
                              <span className="block text-[10px] font-normal text-[#707072] truncate max-w-[120px]">
                                {tx.customer_name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-[#707072]">
                            {formatDateTime(tx.created_at)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f5f5f5] dark:bg-[#1c1c20] border border-[#e5e5e5] dark:border-[#27272a]">
                              {tx.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            ₱{Number(tx.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isVoided ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-[#d30005] border border-red-200 dark:border-red-900">
                                Voided
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5e9] dark:bg-emerald-950/60 text-[#007d48] border border-[#a5d6a7] dark:border-emerald-800">
                                Completed
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isVoided ? (
                              <span className="text-[11px] text-[#707072] italic" title={tx.void_reason || "Voided"}>
                                {tx.void_reason ? tx.void_reason.slice(0, 15) + "..." : "Voided"}
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => requestVoidTransaction(tx)}
                                className="h-7 px-2.5 text-xs text-[#d30005] border-[#cacacb] dark:border-[#27272a] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer font-bold"
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
        </div>
      )}

      {/* Reusable Master PIN Authorization Modal */}
      <PosMasterPinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingPinAction(null);
        }}
        title={
          pendingPinAction?.type === "void_transaction"
            ? "Authorize Invoice Void"
            : pendingPinAction?.type === "void_cart_item"
            ? `Void Item: ${pendingPinAction.itemName}`
            : "Authorize Order Cancellation"
        }
        description={
          pendingPinAction?.type === "void_transaction"
            ? `Master PIN required to void invoice ${
                pendingPinAction.transaction.invoice_number ||
                `#${pendingPinAction.transaction.id.slice(0, 8)}`
              } (₱${Number(pendingPinAction.transaction.total_amount).toFixed(2)}).`
            : pendingPinAction?.type === "void_cart_item"
            ? `Supervisor PIN required to remove item "${pendingPinAction.itemName}" from active customer order.`
            : "Supervisor PIN required to cancel active customer order."
        }
        actionType={
          pendingPinAction?.type === "void_transaction"
            ? "void_transaction"
            : pendingPinAction?.type === "void_cart_item"
            ? "void_item"
            : "clear_cart"
        }
        requireReason={pendingPinAction?.type === "void_transaction"}
        onSuccess={handlePinSuccess}
      />
      {/* Cashier Duty Clock In / Clock Out Modal */}
      {dutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-foreground rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setDutyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleDutySubmit}>
              <div className="space-y-1 pb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border ${
                  dutyModalMode === 'clock_in'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {dutyModalMode === 'clock_in' ? 'Start Shift & Clock In' : 'End Shift & Clock Out'}
                </h3>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  {dutyModalMode === 'clock_in'
                    ? `Clocking in as ${currentStaff?.full_name || 'Staff'}. Verify drawer starting cash.`
                    : `Ending shift for ${currentStaff?.full_name || 'Staff'}. Reconcile cash drawer.`}
                </p>
              </div>

              {dutyFeedback && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-[#d30005] font-semibold">
                  {dutyFeedback}
                </div>
              )}

              <div className="space-y-4 py-2">
                {dutyModalMode === 'clock_in' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="openingFloat" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Opening Cash Float (₱)
                    </Label>
                    <Input
                      id="openingFloat"
                      type="number"
                      step="1"
                      min="0"
                      value={floatAmountInput}
                      onChange={(e) => setFloatAmountInput(e.target.value)}
                      required
                      placeholder="500"
                      className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                    <p className="text-[11px] text-[#707072]">
                      Initial cash change provided in the POS cash drawer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="closingCash" className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Closing Cash Count in Drawer (₱)
                    </Label>
                    <Input
                      id="closingCash"
                      type="number"
                      step="0.01"
                      min="0"
                      value={closingCashInput}
                      onChange={(e) => setClosingCashInput(e.target.value)}
                      placeholder="Actual counted cash"
                      className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-sm font-mono"
                    />
                    <p className="text-[11px] text-[#707072]">
                      Count physical bills and coins in drawer before turning over.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="dutyNotes" className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Shift Notes / Handover Remarks
                  </Label>
                  <Input
                    id="dutyNotes"
                    type="text"
                    value={dutyNotesInput}
                    onChange={(e) => setDutyNotesInput(e.target.value)}
                    placeholder={dutyModalMode === 'clock_in' ? "e.g. Counter 1, Morning shift" : "e.g. Handed over to afternoon cashier"}
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDutyModalOpen(false)}
                  className="flex-1 h-10 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingDuty}
                  className={`flex-1 h-10 text-xs rounded-xl font-bold cursor-pointer text-white ${
                    dutyModalMode === 'clock_in'
                      ? 'bg-[#007d48] hover:bg-[#00663a]'
                      : 'bg-[#d30005] hover:bg-[#b00004]'
                  }`}
                >
                  {isSubmittingDuty
                    ? 'Recording...'
                    : dutyModalMode === 'clock_in'
                    ? 'Confirm Clock In'
                    : 'Confirm Clock Out'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}