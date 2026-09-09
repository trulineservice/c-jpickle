"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Banknote, 
  CreditCard, 
  QrCode, 
  Search, 
  Package, 
  Printer,
  X,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { processPosTransaction, type PosCheckoutResult } from "@/app/actions";

type Product = { 
  id: string; 
  name: string; 
  price: number; 
  category: string; 
  stock_level?: number;
};

type CartItem = Product & { quantity: number };

export default function CashierClient({ 
  initialProducts 
}: { 
  initialProducts: Product[]; 
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("GCash / QR Ph");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Philippine Compliance & Statutory Discount State
  const [discountType, setDiscountType] = useState<'none' | 'senior_citizen' | 'pwd'>('none');
  const [customerName, setCustomerName] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [discountIdNumber, setDiscountIdNumber] = useState("");
  const [complianceError, setComplianceError] = useState<string | null>(null);

  // Sales Invoice Receipt Modal
  const [completedInvoice, setCompletedInvoice] = useState<PosCheckoutResult | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const categories = ["All", ...Array.from(new Set(initialProducts.map((p) => p.category)))];

  const filteredProducts = initialProducts.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('none');
    setCustomerName("");
    setCustomerTin("");
    setDiscountIdNumber("");
    setComplianceError(null);
  };

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const rawGrossSubtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  // BIR Statutory Computations (RA 9994 / RA 10754)
  const isStatutoryDiscount = discountType === 'senior_citizen' || discountType === 'pwd';
  const vatExemptBase = isStatutoryDiscount ? Math.round((rawGrossSubtotal / 1.12) * 100) / 100 : 0;
  const vatDeduction = isStatutoryDiscount ? Math.round((rawGrossSubtotal - vatExemptBase) * 100) / 100 : 0;
  const statutoryDiscountAmount = isStatutoryDiscount ? Math.round((vatExemptBase * 0.20) * 100) / 100 : 0;
  const netPayableDue = isStatutoryDiscount 
    ? Math.round((vatExemptBase - statutoryDiscountAmount) * 100) / 100 
    : rawGrossSubtotal;
  const standardVatableSales = !isStatutoryDiscount ? Math.round((rawGrossSubtotal / 1.12) * 100) / 100 : 0;
  const standardVatAmount = !isStatutoryDiscount ? Math.round((rawGrossSubtotal - standardVatableSales) * 100) / 100 : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (isStatutoryDiscount) {
      if (!discountIdNumber.trim()) {
        setComplianceError(`Please enter the ${discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD'} ID number for BIR audit compliance.`);
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
      const result = await processPosTransaction(cart, netPayableDue, paymentMethod, {
        customerName: customerName.trim() || undefined,
        customerTin: customerTin.trim() || undefined,
        discountType,
        discountIdNumber: discountIdNumber.trim() || undefined,
      });

      setCompletedInvoice(result);
      setShowInvoiceModal(true);
      setCart([]);
      setDiscountType('none');
      setCustomerName("");
      setCustomerTin("");
      setDiscountIdNumber("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed. Please try again.";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 sm:p-8 min-h-screen lg:h-screen flex flex-col bg-white text-[#111111] font-sans">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 border-b border-[#cacacb] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
              Point of Sale
            </span>
            <span className="text-[#cacacb]">•</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007d48] bg-[#f5f5f5] px-2 py-0.5 border border-[#cacacb] rounded-full">
              BIR EOPT Compliant (RA 11976)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
            Cashier Register
          </h1>
        </div>

        {/* Search Pill */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#707072]" />
          <Input 
            placeholder="Search items, balls, or gear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-full bg-[#f5f5f5] text-xs text-[#111111] placeholder:text-[#707072] border border-transparent focus-visible:bg-white focus-visible:border-[#111111]"
          />
        </div>
      </div>

      {/* Main Terminal Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        
        {/* Left Column: Product Catalog */}
        <div className="flex-1 flex flex-col border border-[#cacacb] p-6 overflow-hidden bg-white">
          
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-[#cacacb]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-4 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "bg-white text-[#111111] border-[#cacacb] hover:border-[#111111]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`cursor-pointer transition-all border p-4 flex flex-col justify-between min-h-[140px] ${
                      inCart
                        ? "border-[#111111] bg-[#f5f5f5]"
                        : "border-[#cacacb] bg-white hover:border-[#111111]"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#707072]">
                        {product.category}
                      </span>
                      <h3 className="font-semibold text-sm text-[#111111] line-clamp-2 pt-0.5 leading-snug">
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex items-baseline justify-between pt-3 border-t border-[#e5e5e5]">
                      <span className="text-sm font-bold text-[#111111]">
                        ₱{Number(product.price).toFixed(2)}
                      </span>
                      {inCart && (
                        <span className="w-5 h-5 rounded-full bg-[#111111] text-white text-[11px] font-bold flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Register Cart Panel */}
        <div className="w-full lg:w-96 flex flex-col border border-[#cacacb] bg-white">
          
          <div className="p-4 border-b border-[#cacacb] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#111111]" />
              <h2 className="font-bold text-[#111111] text-sm uppercase tracking-tight">Current Order</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#111111] border border-[#cacacb]">
                {totalItemsCount}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-[#707072] hover:text-[#d30005] underline font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[260px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#707072] space-y-2 py-8">
                <Package className="w-8 h-8 text-[#cacacb]" />
                <p className="text-xs font-semibold text-[#111111]">Order is empty</p>
                <p className="text-[11px] text-[#707072]">Select items on the catalog to begin</p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-[#e5e5e5] bg-[#f5f5f5]"
                >
                  <div className="space-y-0.5 max-w-[160px]">
                    <p className="font-semibold text-xs text-[#111111] truncate">{item.name}</p>
                    <p className="text-[11px] text-[#707072]">
                      ₱{Number(item.price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-full border border-[#cacacb] bg-white">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-[#707072] hover:text-[#111111]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-[#111111]">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#707072] hover:text-[#111111]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-[#707072] hover:text-[#d30005]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* BIR Statutory Tax & Discount Controls */}
          {cart.length > 0 && (
            <div className="p-4 bg-[#fbfbfb] border-t border-[#cacacb] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007d48]" />
                  BIR Statutory Discount
                </span>
                <span className="text-[10px] text-[#707072]">RA 9994 / 10754</span>
              </div>

              {/* Discount Selector Chips */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: 'Regular' },
                  { id: 'senior_citizen', label: 'Senior (20%)' },
                  { id: 'pwd', label: 'PWD (20%)' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setDiscountType(tier.id as 'none' | 'senior_citizen' | 'pwd');
                      setComplianceError(null);
                    }}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-full border transition-colors cursor-pointer text-center ${
                      discountType === tier.id
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#707072] border-[#cacacb] hover:text-[#111111]'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              {/* Mandatory ID & Name Capture for Audit Compliance */}
              {isStatutoryDiscount && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block mb-1">
                      {discountType === 'senior_citizen' ? 'Senior ID / OSCA Booklet No.' : 'PWD ID Number'} *
                    </label>
                    <Input
                      placeholder="e.g. OSCA-2024-8891"
                      value={discountIdNumber}
                      onChange={(e) => setDiscountIdNumber(e.target.value)}
                      className="h-8 text-xs bg-white border-[#cacacb] rounded-none focus-visible:border-[#111111]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#707072] block mb-1">
                      Cardholder Full Name *
                    </label>
                    <Input
                      placeholder="Full Name as shown on ID"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs bg-white border-[#cacacb] rounded-none focus-visible:border-[#111111]"
                    />
                  </div>
                  {complianceError && (
                    <p className="text-[11px] font-semibold text-[#d30005]">
                      ⚠️ {complianceError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector & Charge */}
          <div className="p-4 bg-white border-t border-[#cacacb] space-y-4">
            
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#707072] block">
                Payment Tender
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "GCash / QR Ph", icon: QrCode },
                  { name: "Cash", icon: Banknote },
                  { name: "Card", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.name;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => setPaymentMethod(m.name)}
                      className={`h-10 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border cursor-pointer ${
                        isSelected
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-[#111111] border-[#cacacb] hover:border-[#111111]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{m.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Tax & Breakdown Preview */}
            <div className="space-y-1.5 pt-2 border-t border-[#cacacb] text-xs">
              <div className="flex justify-between text-[#707072]">
                <span>Gross Subtotal</span>
                <span>₱{rawGrossSubtotal.toFixed(2)}</span>
              </div>

              {isStatutoryDiscount ? (
                <>
                  <div className="flex justify-between text-[#007d48] font-medium">
                    <span>Less: 12% VAT Exemption</span>
                    <span>-₱{vatDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#707072]">
                    <span>VAT-Exempt Base</span>
                    <span>₱{vatExemptBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#007d48] font-medium">
                    <span>Less: 20% {discountType === 'senior_citizen' ? 'Senior' : 'PWD'} Discount</span>
                    <span>-₱{statutoryDiscountAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[#707072]">
                    <span>VATable Sales (Net of 12%)</span>
                    <span>₱{standardVatableSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#707072]">
                    <span>Output VAT (12%)</span>
                    <span>₱{standardVatAmount.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex items-baseline justify-between border-t border-[#cacacb] pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
                  Net Amount Due
                </span>
                <span className="text-2xl font-bold text-[#111111]">
                  ₱{netPayableDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              size="lg"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
              className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] font-medium text-sm rounded-full cursor-pointer"
            >
              {isProcessing ? "Processing..." : `Issue Invoice & Charge ₱${netPayableDue.toFixed(2)}`}
            </Button>

          </div>

        </div>

      </div>

      {/* BIR Official Sales Invoice Modal (Printable) */}
      {showInvoiceModal && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#cacacb] w-full max-w-lg p-6 sm:p-8 space-y-6 text-[#111111] max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            
            {/* Header / Actions */}
            <div className="flex items-center justify-between border-b border-[#cacacb] pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#007d48]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#007d48]">
                  Payment Confirmed • Invoice Issued
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="h-8 px-3 text-xs border-[#cacacb] gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </Button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1.5 rounded-full hover:bg-[#f5f5f5] text-[#707072] hover:text-[#111111] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Slip Content */}
            <div id="printable-sales-invoice" className="border border-[#e5e5e5] p-6 bg-[#fafafa] font-mono text-xs space-y-4">
              
              {/* Business Header */}
              <div className="text-center space-y-1 border-b border-dashed border-[#cacacb] pb-4">
                <h2 className="font-bold text-base tracking-tight uppercase font-sans text-[#111111]">
                  C&amp;J PICKLEBALL ARENA
                </h2>
                <p className="text-[11px] text-[#707072]">
                  C&amp;J Sports Complex, Metro Manila, Philippines
                </p>
                <p className="text-[11px] text-[#707072]">
                  VAT Reg. TIN: 432-891-002-00000
                </p>
                <p className="text-[11px] text-[#707072]">
                  MIN: MIN-260908-CJ01 • Serial: CJ-POS-01
                </p>
                <div className="pt-2 font-bold text-xs uppercase tracking-widest text-[#111111]">
                  OFFICIAL SALES INVOICE
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-[#cacacb] pb-3">
                <div className="flex justify-between">
                  <span className="text-[#707072]">Invoice No:</span>
                  <span className="font-bold text-[#111111]">{completedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707072]">Date &amp; Time:</span>
                  <span>{new Date(completedInvoice.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707072]">Payment Tender:</span>
                  <span>{completedInvoice.paymentMethod}</span>
                </div>
                {completedInvoice.customerName && (
                  <div className="flex justify-between">
                    <span className="text-[#707072]">Customer:</span>
                    <span className="font-bold">{completedInvoice.customerName}</span>
                  </div>
                )}
                {completedInvoice.discountIdNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#707072]">ID / OSCA No:</span>
                    <span className="font-bold">{completedInvoice.discountIdNumber} ({completedInvoice.discountType.toUpperCase()})</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-dashed border-[#cacacb] pb-3">
                <div className="flex justify-between text-[11px] font-bold text-[#707072] border-b border-[#e5e5e5] pb-1">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                {completedInvoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[240px]">
                      {it.name} (x{it.quantity})
                    </span>
                    <span>₱{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* BIR Tax Breakdown Summary */}
              <div className="space-y-1.5 text-[11px] border-b border-dashed border-[#cacacb] pb-3">
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span>₱{completedInvoice.grossAmount.toFixed(2)}</span>
                </div>

                {completedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-[#007d48]">
                    <span>Less: 20% SC/PWD Discount:</span>
                    <span>-₱{completedInvoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>VATable Sales (12%):</span>
                  <span>₱{completedInvoice.vatableSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>12% Output VAT:</span>
                  <span>₱{completedInvoice.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT-Exempt Sales:</span>
                  <span>₱{completedInvoice.vatExemptSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Zero-Rated Sales:</span>
                  <span>₱{completedInvoice.zeroRatedSales.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold text-sm border-t border-[#111111] pt-2 text-[#111111]">
                  <span>TOTAL AMOUNT DUE:</span>
                  <span>₱{completedInvoice.total.toFixed(2)}</span>
                </div>
              </div>

              {/* BIR Footer Notice */}
              <div className="text-center text-[10px] text-[#707072] space-y-1 pt-1 font-sans">
                <p className="font-semibold text-[#111111]">
                  THIS DOCUMENT SERVES AS AN OFFICIAL SALES INVOICE
                </p>
                <p>Issued pursuant to RA 11976 (Ease of Paying Taxes Act)</p>
                <p className="italic">Thank you for playing at C&amp;J Arena!</p>
              </div>

            </div>

            {/* Modal Bottom Action */}
            <Button
              className="w-full h-11 bg-[#111111] text-white hover:bg-[#222222] font-medium text-xs rounded-full cursor-pointer"
              onClick={() => setShowInvoiceModal(false)}
            >
              Start New Transaction
            </Button>

          </div>
        </div>
      )}

    </div>
  );
}