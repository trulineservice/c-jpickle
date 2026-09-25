import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PosCartItem {
  id: string;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  stock_level?: number;
  dispensed_volume?: number;
  base_unit?: string;
  cart_item_key?: string;
}

export type PosDiscountType = 'none' | 'senior_citizen' | 'pwd' | 'student' | 'employee';

export interface PosCartTotals {
  grossSubtotal: number;
  isStatutory: boolean;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  discountAmount: number;
  netPayable: number;
}

export function computeCartTotals(
  cart: PosCartItem[],
  discountType: PosDiscountType,
  discountItemSelections: Record<string, number> = {}
): PosCartTotals {
  const grossSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isStatutory = discountType === 'senior_citizen' || discountType === 'pwd';

  let discountAmount = 0;
  let discountableGross = 0;

  if (discountType === 'senior_citizen' || discountType === 'pwd') {
    const hasExplicitSelections = Object.keys(discountItemSelections).length > 0;
    if (hasExplicitSelections) {
      discountableGross = cart.reduce((acc, item) => {
        const key = item.cart_item_key || item.id;
        const selectedQty = Math.min(item.quantity, Math.max(0, discountItemSelections[key] || 0));
        return acc + item.price * selectedQty;
      }, 0);
    } else {
      discountableGross = grossSubtotal;
    }
    // 20% statutory discount applied directly to designated items gross
    discountAmount = Math.round((discountableGross * 0.20) * 100) / 100;
  } else if (discountType === 'student') {
    // Always flat 10 pesos off total order (capped at grossSubtotal)
    discountAmount = grossSubtotal > 0 ? Math.min(10, grossSubtotal) : 0;
  } else if (discountType === 'employee') {
    // 10% employee discount applied directly to gross
    discountAmount = Math.round((grossSubtotal * 0.10) * 100) / 100;
  }

  const netPayable = Math.max(0, Math.round((grossSubtotal - discountAmount) * 100) / 100);

  return {
    grossSubtotal,
    isStatutory,
    vatableSales: 0,
    vatAmount: 0,
    vatExemptSales: 0,
    discountAmount,
    netPayable,
  };
}

interface PosCartStore {
  // State
  cart: PosCartItem[];
  paymentMethod: string;
  splitEwalletPercent: number;
  splitEwalletAmount: string;
  splitCashAmount: string;
  discountType: PosDiscountType;
  discountItemSelections: Record<string, number>;
  customerName: string;
  customerTin: string;
  discountIdNumber: string;
  cashTendered: string;
  autoPrintReceipt: boolean;
  viewMode: 'table' | 'grid';
  selectedDepartment: 'all' | 'coffee' | 'drinks' | 'food' | 'supplies';
  selectedCategory: string;
  searchQuery: string;

  // Actions
  addToCart: (product: {
    id: string;
    name: string;
    price: number;
    category: string;
    sku?: string;
    stock_level?: number;
    dispensed_volume?: number;
    base_unit?: string;
  }) => boolean;
  updateQuantity: (id: string, delta: number) => { requiresPin: boolean; item?: PosCartItem };
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCart: (cartOrUpdater: PosCartItem[] | ((prev: PosCartItem[]) => PosCartItem[])) => void;

  setPaymentMethod: (method: string) => void;
  setSplitEwalletPercent: (pct: number) => void;
  setSplitEwalletAmount: (amt: string) => void;
  setSplitCashAmount: (amt: string) => void;
  setDiscountType: (type: PosDiscountType) => void;
  setDiscountItemSelections: (selections: Record<string, number>) => void;
  setDiscountItemQuantity: (itemKey: string, quantity: number) => void;
  clearDiscountItemSelections: () => void;
  setCustomerName: (name: string) => void;
  setCustomerTin: (tin: string) => void;
  setDiscountIdNumber: (idNum: string) => void;
  setCashTendered: (tendered: string) => void;
  setAutoPrintReceipt: (enabled: boolean) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  setSelectedDepartment: (dept: 'all' | 'coffee' | 'drinks' | 'food' | 'supplies') => void;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (query: string) => void;
  resetOrder: () => void;
}

export const usePosCartStore = create<PosCartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      paymentMethod: 'GCash / QR Ph',
      splitEwalletPercent: 50,
      splitEwalletAmount: '',
      splitCashAmount: '',
      discountType: 'none',
      discountItemSelections: {},
      customerName: '',
      customerTin: '',
      discountIdNumber: '',
      cashTendered: '',
      autoPrintReceipt: true,
      viewMode: 'grid',
      selectedDepartment: 'all',
      selectedCategory: 'All',
      searchQuery: '',

      addToCart: (product) => {
        if (product.stock_level !== undefined && product.stock_level <= 0) {
          return false;
        }

        const itemKey = product.dispensed_volume
          ? `${product.id}-${product.dispensed_volume}${product.base_unit || ''}`
          : product.id;

        set((state) => {
          const existing = state.cart.find((item) => (item.cart_item_key || item.id) === itemKey);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                (item.cart_item_key || item.id) === itemKey ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return {
            cart: [
              ...state.cart,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                sku: product.sku,
                stock_level: product.stock_level,
                quantity: 1,
                dispensed_volume: product.dispensed_volume,
                base_unit: product.base_unit,
                cart_item_key: itemKey,
              },
            ],
          };
        });
        return true;
      },

      updateQuantity: (id, delta) => {
        const currentCart = get().cart;
        const item = currentCart.find((i) => (i.cart_item_key || i.id) === id);
        if (!item) return { requiresPin: false };

        if (item.quantity + delta <= 0) {
          set((state) => {
            const nextSelections = { ...state.discountItemSelections };
            delete nextSelections[id];
            return {
              cart: state.cart.filter((i) => (i.cart_item_key || i.id) !== id),
              discountItemSelections: nextSelections,
            };
          });
          return { requiresPin: false };
        }

        set((state) => ({
          cart: state.cart.map((i) => ((i.cart_item_key || i.id) === id ? { ...i, quantity: i.quantity + delta } : i)),
        }));

        return { requiresPin: false };
      },

      removeItem: (id) => {
        set((state) => {
          const nextSelections = { ...state.discountItemSelections };
          delete nextSelections[id];
          return {
            cart: state.cart.filter((i) => (i.cart_item_key || i.id) !== id),
            discountItemSelections: nextSelections,
          };
        });
      },

      clearCart: () => {
        set({
          cart: [],
          discountType: 'none',
          discountItemSelections: {},
          customerName: '',
          customerTin: '',
          discountIdNumber: '',
          cashTendered: '',
          splitEwalletAmount: '',
          splitCashAmount: '',
        });
      },

      setCart: (cartOrUpdater) => {
        set((state) => ({
          cart: typeof cartOrUpdater === 'function' ? cartOrUpdater(state.cart) : cartOrUpdater,
        }));
      },

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setSplitEwalletPercent: (splitEwalletPercent) => set({ splitEwalletPercent }),
      setSplitEwalletAmount: (splitEwalletAmount) => set({ splitEwalletAmount }),
      setSplitCashAmount: (splitCashAmount) => set({ splitCashAmount }),
      setDiscountType: (discountType) =>
        set((state) => {
          if (discountType === 'none') {
            return { discountType, discountItemSelections: {} };
          }
          return { discountType };
        }),
      setDiscountItemSelections: (discountItemSelections) => set({ discountItemSelections }),
      setDiscountItemQuantity: (itemKey, quantity) =>
        set((state) => ({
          discountItemSelections: {
            ...state.discountItemSelections,
            [itemKey]: Math.max(0, quantity),
          },
        })),
      clearDiscountItemSelections: () => set({ discountItemSelections: {} }),
      setCustomerName: (customerName) => set({ customerName }),
      setCustomerTin: (customerTin) => set({ customerTin }),
      setDiscountIdNumber: (discountIdNumber) => set({ discountIdNumber }),
      setCashTendered: (cashTendered) => set({ cashTendered }),
      setAutoPrintReceipt: (autoPrintReceipt) => set({ autoPrintReceipt }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      resetOrder: () => {
        set({
          cart: [],
          discountType: 'none',
          discountItemSelections: {},
          customerName: '',
          customerTin: '',
          discountIdNumber: '',
          cashTendered: '',
          splitEwalletAmount: '',
          splitCashAmount: '',
        });
      },
    }),
    {
      name: 'cj-pos-cart-store',
      // Persist cart, discount, and preferences
      partialize: (state) => ({
        cart: state.cart,
        paymentMethod: state.paymentMethod,
        splitEwalletPercent: state.splitEwalletPercent,
        splitEwalletAmount: state.splitEwalletAmount,
        splitCashAmount: state.splitCashAmount,
        discountType: state.discountType,
        discountItemSelections: state.discountItemSelections,
        customerName: state.customerName,
        customerTin: state.customerTin,
        discountIdNumber: state.discountIdNumber,
        cashTendered: state.cashTendered,
        autoPrintReceipt: state.autoPrintReceipt,
        viewMode: state.viewMode,
      }),
    }
  )
);
