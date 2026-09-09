"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Package, Plus } from "lucide-react";
import { processPosTransaction, type PosCheckoutResult } from "@/app/actions";
import { ComplianceDiscountPanel } from "@/components/pos/compliance-discount-panel";
import { PosCartPanel, type PosCartItem } from "@/components/pos/pos-cart-panel";
import { SalesInvoiceModal } from "@/components/pos/sales-invoice-modal";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_level?: number;
};

export default function CashierClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("GCash / QR Ph");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Philippine Compliance & Statutory Discount State
  const [discountType, setDiscountType] = useState<"none" | "senior_citizen" | "pwd">("none");
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
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType("none");
    setCustomerName("");
    setCustomerTin("");
    setDiscountIdNumber("");
    setComplianceError(null);
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

      setCompletedInvoice(result);
      setShowInvoiceModal(true);
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize POS checkout.";
      setComplianceError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#fafafa] text-[#111111] min-h-screen">
      {/* Top Header */}
      <div className="bg-white border-b border-[#e5e5e5] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#707072]">
            Front Desk POS Terminal
          </span>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#111111]">
            Point of Sale &amp; Pro Shop
          </h1>
        </div>

        {/* Global Catalog Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#707072] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gear, balls, drinks..."
            className="pl-9 h-10 rounded-full text-xs bg-[#f5f5f5] border-transparent focus:border-[#111111]"
          />
        </div>
      </div>

      {/* Main Workbench Layout: Catalog (8 cols) & Cart Panel (4 cols) */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Category Tabs & Product Catalog */}
        <div className="lg:col-span-8 space-y-6">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-[#111111] text-white shadow-sm"
                    : "bg-white text-[#707072] border border-[#e5e5e5] hover:border-[#111111] hover:text-[#111111]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => addToCart(prod)}
                className="group border border-[#e5e5e5] bg-white rounded-2xl p-4 text-left hover:border-[#111111] hover:shadow-md transition-all flex flex-col justify-between h-44 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-[#707072] uppercase tracking-wider bg-[#f5f5f5] px-2 py-0.5 rounded-full">
                      {prod.category}
                    </span>
                    {prod.stock_level !== undefined && (
                      <span
                        className={`text-[10px] font-bold ${
                          prod.stock_level > 5
                            ? "text-[#007d48]"
                            : prod.stock_level > 0
                            ? "text-[#f59e0b]"
                            : "text-[#d30005]"
                        }`}
                      >
                        {prod.stock_level} in stock
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#111111] mt-2.5 line-clamp-2 group-hover:text-[#007d48] transition-colors">
                    {prod.name}
                  </h4>
                </div>

                <div className="pt-2 border-t border-[#f5f5f5] flex items-center justify-between">
                  <span className="text-sm font-black text-[#111111]">
                    ₱{Number(prod.price).toFixed(2)}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#f5f5f5] group-hover:bg-[#111111] group-hover:text-white flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 border border-dashed border-[#e5e5e5] rounded-2xl flex flex-col items-center justify-center text-xs text-[#707072] gap-2">
                <Package className="w-8 h-8 text-[#cacacb]" />
                <p>No products found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </div>

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
            onRemoveItem={removeItem}
            onClearCart={clearCart}
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
    </div>
  );
}