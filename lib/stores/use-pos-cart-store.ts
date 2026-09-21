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
}

export type PosDiscountType = 'none' | 'senior_citizen' | 'pwd';

export interface PosCartTotals {
  grossSubtotal: number;
  isStatutory: boolean;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  discountAmount: number;
  netPayable: number;
}

export function computeCartTotals(cart: PosCartItem[], discountType: PosDiscountType): PosCartTotals {
  const grossSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isStatutory = discountType === 'senior_citizen' || discountType === 'pwd';

  let vatableSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let discountAmount = 0;
  let netPayable = grossSubtotal;

  if (isStatutory) {
    // 12% VAT Exemption Base
    vatExemptSales = Math.round((grossSubtotal / 1.12) * 100) / 100;
    // 20% Statutory Discount on Net Base
    discountAmount = Math.round((vatExemptSales * 0.20) * 100) / 100;
    // Net Payable
    netPayable = Math.round((vatExemptSales - discountAmount) * 100) / 100;
  } else {
    vatableSales = Math.round((grossSubtotal / 1.12) * 100) / 100;
    vatAmount = Math.round((grossSubtotal - vatableSales) * 100) / 100;
    netPayable = grossSubtotal;
  }

  return {
    grossSubtotal,
    isStatutory,
    vatableSales,
    vatAmount,
    vatExemptSales,
    discountAmount,
    netPayable,
  };
}

interface PosCartStore {
  // State
  cart: PosCartItem[];
  paymentMethod: string;
  discountType: PosDiscountType;
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
  addToCart: (product: { id: string; name: string; price: number; category: string; sku?: string; stock_level?: number }) => boolean;
  updateQuantity: (id: string, delta: number) => { requiresPin: boolean; item?: PosCartItem };
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCart: (cartOrUpdater: PosCartItem[] | ((prev: PosCartItem[]) => PosCartItem[])) => void;

  setPaymentMethod: (method: string) => void;
  setDiscountType: (type: PosDiscountType) => void;
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
      discountType: 'none',
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

        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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
              },
            ],
          };
        });
        return true;
      },

      updateQuantity: (id, delta) => {
        const currentCart = get().cart;
        const item = currentCart.find((i) => i.id === id);
        if (!item) return { requiresPin: false };

        if (item.quantity + delta <= 0) {
          set((state) => ({
            cart: state.cart.filter((i) => i.id !== id),
          }));
          return { requiresPin: false };
        }

        set((state) => ({
          cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i)),
        }));

        return { requiresPin: false };
      },

      removeItem: (id) => {
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== id),
        }));
      },

      clearCart: () => {
        set({
          cart: [],
          discountType: 'none',
          customerName: '',
          customerTin: '',
          discountIdNumber: '',
          cashTendered: '',
        });
      },

      setCart: (cartOrUpdater) => {
        set((state) => ({
          cart: typeof cartOrUpdater === 'function' ? cartOrUpdater(state.cart) : cartOrUpdater,
        }));
      },

      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setDiscountType: (discountType) => set({ discountType }),
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
          customerName: '',
          customerTin: '',
          discountIdNumber: '',
          cashTendered: '',
        });
      },
    }),
    {
      name: 'cj-pos-cart-store',
      // Persist cart, discount, and preferences
      partialize: (state) => ({
        cart: state.cart,
        paymentMethod: state.paymentMethod,
        discountType: state.discountType,
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
