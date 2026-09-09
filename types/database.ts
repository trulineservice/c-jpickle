export type UserRole = 'owner' | 'admin' | 'cashier' | 'client';

export type BookingStatus = 
  | 'pending_payment'
  | 'paid'
  | 'checked_in'
  | 'walk_in'
  | 'cancelled'
  | 'cancelled_refund_pending'
  | 'expired';

export type PaymentMethod = 'paymongo' | 'cash' | 'counter_qr' | 'other';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
  court_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  currency: string;
  status: BookingStatus;
  payment_method: PaymentMethod;
  paymongo_checkout_session_id: string | null;
  expires_at: string | null;
  notes?: string | null;
  paddle_count?: number;
  created_at: string;
  updated_at: string;
  courts?: Court | Court[] | null;
  profiles?: Profile | Profile[] | null;
  booking_refunds?: BookingRefund | null;
  // Backward-compatible direct refund properties
  refund_wallet_type?: WalletType | string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_reason?: string | null;
  refund_status?: RefundStatus | string | null;
  refund_reference?: string | null;
  refund_processed_at?: string | null;
  refund_processed_by?: string | null;
}

export type RefundStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'completed' | 'voided_no_refund';
export type WalletType = 'gcash' | 'maya' | 'bank_transfer' | 'counter_cash';

export interface BookingRefund {
  id: string;
  booking_id: string;
  amount: number;
  wallet_type: WalletType | string;
  account_name: string | null;
  account_number: string | null;
  reason: string | null;
  status: RefundStatus | string;
  reference: string | null;
  processed_by: string | null;
  processed_at: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_level: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PosTransaction {
  id: string;
  invoice_number?: string | null;
  cashier_id: string | null;
  customer_name?: string | null;
  customer_tin?: string | null;
  discount_type?: 'none' | 'senior_citizen' | 'pwd' | 'special' | string | null;
  discount_id_number?: string | null;
  gross_amount?: number;
  discount_amount?: number;
  vatable_sales?: number;
  vat_amount?: number;
  vat_exempt_sales?: number;
  zero_rated_sales?: number;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'voided' | 'refunded';
  created_at: string;
  profiles?: { full_name: string | null } | null;
  pos_transaction_items?: PosTransactionItem[];
}

export interface PosTransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  pos_products?: PosProduct;
}

export interface AvailabilitySlot {
  time: string; // e.g. "06:00 AM", "07:00 AM", "08:00 PM"
  isoString: string; // full ISO string for the start time
  hour24: number; // 6, 7, 8 ... 21
  available: boolean;
  status?: 'available' | 'booked' | 'pending';
  reason?: string;
}

export interface PayMongoCheckoutPayload {
  data: {
    attributes: {
      billing?: {
        name: string;
        email: string;
        phone?: string;
      };
      send_email_receipt: boolean;
      show_description: boolean;
      show_line_items: boolean;
      line_items: Array<{
        amount: number; // in centavos (e.g. 30000 = ₱300.00)
        currency: string; // 'PHP'
        name: string;
        quantity: number;
        description?: string;
      }>;
      payment_method_types: string[];
      description: string;
      success_url: string;
      cancel_url: string;
      metadata?: Record<string, string>;
    };
  };
}

export interface PayMongoCheckoutResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      checkout_url: string;
      status: string;
      payment_intent?: {
        id: string;
        attributes: {
          status: string;
          amount: number;
        };
      };
      payments?: Array<{
        id: string;
        attributes: {
          status: string;
          amount: number;
          source: {
            type: string;
          };
        };
      }>;
    };
  };
}
