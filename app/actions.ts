'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/**
 * ============================================================================
 * C&J COURT - SERVER ACTIONS
 * ============================================================================
 * Table of Contents:
 * 1. AUTHENTICATION & ACCESS CONTROL
 *    - redirectBasedOnRole(userId)
 *    - login(formData)
 *    - signup(formData)
 *    - logout()
 *
 * 2. COURT BOOKING & PLAYER LIFECYCLE
 *    - cancelBooking(bookingId) [Strict 24-Hour Rule]
 *    - checkInBooking(bookingId)
 *
 * 3. CASHIER & POS OPERATIONS
 *    - createWalkInBooking(formData)
 *    - processPosTransaction(cart, total, paymentMethod)
 *
 * 4. OWNER & ADMIN FACILITY CONTROLS
 *    - createCashierAccount(formData)
 *    - voidTransaction(transactionId)
 *    - createCourt(formData)
 *    - toggleCourtStatus(courtId, currentStatus)
 * ============================================================================
 */

// ============================================================================
// 1. AUTHENTICATION & ACCESS CONTROL
// ============================================================================

/**
 * Internal helper to redirect users to their appropriate dashboard based on role.
 */
async function redirectBasedOnRole(userId: string, nextUrl?: string | null): Promise<void> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = profile?.role || 'client';

  revalidatePath('/', 'layout');

  if (role === 'owner' || role === 'admin') {
    redirect('/admin');
  } else if (role === 'cashier') {
    redirect('/cashier/schedule');
  } else if (nextUrl && nextUrl.startsWith('/')) {
    redirect(nextUrl);
  } else {
    redirect('/dashboard');
  }
}

/**
 * Sign in existing user with Email & Password.
 */
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const next = formData.get('next') as string | null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[Auth Error - Login]:', error.message);
    const redirectUrl = next 
      ? `/login?message=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
      : `/login?message=${encodeURIComponent(error.message)}`;
    return redirect(redirectUrl);
  }

  if (data?.user) {
    await redirectBasedOnRole(data.user.id, next);
  }

  redirect(next && next.startsWith('/') ? next : '/dashboard');
}

/**
 * Register new user with full name and client role.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const next = formData.get('next') as string | null;

  // Never route confirmation emails to localhost; always use the public production app URL
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://c-j-pickleball.vercel.app').replace(/\/$/, '');
  const destination = next && next.startsWith('/') ? next : '/dashboard';
  const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(destination)}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'client',
      },
      emailRedirectTo,
    },
  });

  if (error) {
    console.error('[Auth Error - Signup]:', error.message);
    const redirectUrl = next 
      ? `/signup?message=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
      : `/signup?message=${encodeURIComponent(error.message)}`;
    return redirect(redirectUrl);
  }

  // If user signed up but session is null, Supabase has sent a verification email
  if (data?.user && !data.session) {
    const redirectUrl = next
      ? `/signup?verification_sent=true&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
      : `/signup?verification_sent=true&email=${encodeURIComponent(email)}`;
    return redirect(redirectUrl);
  }

  if (data?.user) {
    await redirectBasedOnRole(data.user.id, next);
  }

  redirect(destination);
}

/**
 * Sign out user and clear active session.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}

// ============================================================================
// 2. COURT BOOKING & PLAYER LIFECYCLE
// ============================================================================

/**
 * Strict 24-Hour Cancellation Action:
 * - Allows cancellation only if (start_time - NOW() >= 24 hours).
 * - Online (PayMongo) bookings transition to 'cancelled_refund_pending'.
 * - Cash/Counter bookings transition to 'cancelled'.
 */
export async function cancelBooking(bookingId: string): Promise<{
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to cancel a booking.' };
  }

  // 1. Fetch target booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, user_id, start_time, status, total_price, payment_method')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: 'Booking reservation not found.' };
  }

  // 2. Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role && ['owner', 'admin', 'cashier'].includes(profile.role);

  if (!isStaff && booking.user_id !== user.id) {
    return { error: 'You are not authorized to cancel this booking.' };
  }

  if (['cancelled', 'cancelled_refund_pending', 'expired'].includes(booking.status)) {
    return { error: `Booking is already marked as ${booking.status}.` };
  }

  // 3. Evaluate 24-hour rule
  const startTime = new Date(booking.start_time).getTime();
  const now = Date.now();
  const differenceHours = (startTime - now) / (1000 * 60 * 60);

  if (!isStaff && differenceHours < 24) {
    return {
      error: `Strict 24-hour cancellation rule: This court reservation begins in ${differenceHours.toFixed(
        1
      )} hours. Cancellations are only permitted at least 24 hours in advance.`,
    };
  }

  // 4. Update status in database
  const newStatus = booking.payment_method === 'cash' ? 'cancelled' : 'cancelled_refund_pending';

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('[Cancel Booking Error]:', updateError);
    return { error: 'Failed to update booking cancellation status.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/cashier/schedule');
  revalidatePath('/admin');

  return {
    success: true,
    status: newStatus,
    message:
      newStatus === 'cancelled_refund_pending'
        ? 'Booking cancelled. Refund request has been queued for processing.'
        : 'Booking cancelled successfully.',
  };
}

/**
 * Request Booking Refund with E-Wallet Details (GCash, Maya, etc.):
 * - Player provides E-Wallet provider, account holder name, and account/mobile number.
 * - Validates strict 24-hour rule (unless staff override).
 * - Transitions status to 'cancelled_refund_pending' and refund_status to 'pending'.
 */
export async function requestBookingRefund({
  bookingId,
  walletType,
  accountName,
  accountNumber,
  reason,
}: {
  bookingId: string;
  walletType: string;
  accountName: string;
  accountNumber: string;
  reason?: string;
}): Promise<{
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to request a refund.' };
  }

  if (!walletType || !accountName?.trim() || !accountNumber?.trim()) {
    return { error: 'Please specify the E-Wallet provider, account name, and account/mobile number.' };
  }

  // 1. Fetch target booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, user_id, start_time, status, total_price, payment_method')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: 'Booking reservation not found.' };
  }

  // 2. Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role && ['owner', 'admin', 'cashier'].includes(profile.role);

  if (!isStaff && booking.user_id !== user.id) {
    return { error: 'You are not authorized to cancel this booking.' };
  }

  if (['cancelled', 'cancelled_refund_pending', 'expired'].includes(booking.status)) {
    return { error: `Booking is already marked as ${booking.status}.` };
  }

  // 3. Evaluate 24-hour rule
  const startTime = new Date(booking.start_time).getTime();
  const now = Date.now();
  const differenceHours = (startTime - now) / (1000 * 60 * 60);

  if (!isStaff && differenceHours < 24) {
    return {
      error: `Strict 24-hour cancellation rule: This court reservation begins in ${differenceHours.toFixed(
        1
      )} hours. Cancellations are only permitted at least 24 hours in advance.`,
    };
  }

  // 4. Update status & save refund e-wallet details
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled_refund_pending',
      refund_status: 'pending',
      refund_wallet_type: walletType,
      refund_account_name: accountName.trim(),
      refund_account_number: accountNumber.trim(),
      refund_reason: reason?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('[Refund Request Error]:', updateError);
    return { error: 'Failed to record refund request. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/cashier/schedule');
  revalidatePath('/admin');
  revalidatePath('/book');

  return {
    success: true,
    status: 'cancelled_refund_pending',
    message: `Cancellation requested. Your refund of ₱${Number(booking.total_price).toFixed(2)} will be processed to your ${walletType} account (${accountNumber.trim()}) by management.`,
  };
}

/**
 * Admin Void Schedule & Process Refund:
 * - Allows Admin/Owner to void court booking schedule and release the slot.
 * - Marks refund as completed with optional transaction/reference ID (e.g. GCash Ref No).
 */
export async function adminVoidAndRefundBooking({
  bookingId,
  action,
  refundReference,
  adminNotes,
}: {
  bookingId: string;
  action: 'void_and_refund' | 'void_only' | 'reject_refund';
  refundReference?: string;
  adminNotes?: string;
}): Promise<{
  success?: boolean;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Staff login required.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { error: 'Access denied: Only administrators or owners can void schedules and process refunds.' };
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: 'Booking not found.' };
  }

  let updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (action === 'void_and_refund') {
    updatePayload = {
      ...updatePayload,
      status: 'cancelled',
      refund_status: 'completed',
      refund_reference: refundReference?.trim() || 'ADMIN_VOID_REFUND',
      refund_processed_at: new Date().toISOString(),
      refund_processed_by: user.id,
      notes: adminNotes?.trim() 
        ? (booking.notes ? `${booking.notes} | Voided: ${adminNotes.trim()}` : adminNotes.trim())
        : booking.notes,
    };
  } else if (action === 'void_only') {
    updatePayload = {
      ...updatePayload,
      status: 'cancelled',
      refund_status: 'voided_no_refund',
      refund_processed_at: new Date().toISOString(),
      refund_processed_by: user.id,
      notes: adminNotes?.trim() 
        ? (booking.notes ? `${booking.notes} | Voided without refund: ${adminNotes.trim()}` : adminNotes.trim())
        : booking.notes,
    };
  } else if (action === 'reject_refund') {
    updatePayload = {
      ...updatePayload,
      status: 'paid',
      refund_status: 'rejected',
      notes: adminNotes?.trim() 
        ? (booking.notes ? `${booking.notes} | Refund Rejected: ${adminNotes.trim()}` : adminNotes.trim())
        : booking.notes,
    };
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId);

  if (updateError) {
    console.error('[Admin Void Error]:', updateError);
    return { error: 'Failed to update booking status.' };
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/cashier/schedule');
  revalidatePath('/book');

  const actionDescriptions = {
    void_and_refund: 'Schedule voided and refund marked as completed. Court slot is now available.',
    void_only: 'Schedule voided without refund. Court slot is now available.',
    reject_refund: 'Refund request rejected. Booking restored to paid status.',
  };

  return {
    success: true,
    message: actionDescriptions[action] || 'Action completed successfully.',
  };
}

/**
 * Check In Player at Reception Desk.
 */
export async function checkInBooking(bookingId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized. Staff login required.');

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'checked_in',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    console.error('[Check-in Error]:', error);
    throw new Error('Failed to update check-in status.');
  }

  revalidatePath('/cashier/schedule');
  revalidatePath('/admin');
  return { success: true };
}

// ============================================================================
// 3. CASHIER & POS OPERATIONS
// ============================================================================

/**
 * Create Walk-in Cash or Counter QR Booking from Cashier POS.
 */
export async function createWalkInBooking(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized. Staff login required.');

  const courtId = formData.get('courtId') as string;
  const dateStr = formData.get('date') as string;
  const hour = parseInt(formData.get('hour') as string, 10);
  const duration = parseInt((formData.get('duration') as string) || '1', 10);
  const guestName = (formData.get('guestName') as string) || 'Walk-in Guest';
  const guestPhone = formData.get('guestPhone') as string;
  const paymentMethod = (formData.get('paymentMethod') as string) || 'cash';

  const startTime = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00.000+08:00`);
  const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

  // Check for conflicting active bookings (Availability check domain rule)
  const nowUtc = new Date();
  const { data: overlappingBookings } = await supabase
    .from('bookings')
    .select('id, status, expires_at')
    .eq('court_id', courtId)
    .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment'])
    .lt('start_time', endTime.toISOString())
    .gt('end_time', startTime.toISOString());

  const activeConflict = (overlappingBookings || []).find((b) => {
    if (b.status === 'pending_payment') {
      return b.expires_at ? new Date(b.expires_at) > nowUtc : false;
    }
    return true;
  });

  if (activeConflict) {
    throw new Error('Court is already reserved or occupied during this time slot.');
  }

  // Fetch court rate
  const { data: court } = await supabase
    .from('courts')
    .select('hourly_rate')
    .eq('id', courtId)
    .single();

  const rate = court?.hourly_rate !== undefined && court?.hourly_rate !== null ? Number(court.hourly_rate) : 1;
  const totalPrice = rate * duration;

  const { error } = await supabase.from('bookings').insert({
    court_id: courtId,
    user_id: user.id,
    guest_name: guestName,
    guest_phone: guestPhone || null,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_hours: duration,
    total_price: totalPrice,
    currency: 'PHP',
    status: 'walk_in',
    payment_method: paymentMethod === 'counter_qr' ? 'counter_qr' : 'cash',
  });

  if (error) {
    console.error('[POS Walk-in Error]:', error);
    throw new Error('Failed to record walk-in booking.');
  }

  revalidatePath('/cashier/schedule');
  revalidatePath('/admin');
}

export interface PosCompliancePayload {
  customerName?: string;
  customerTin?: string;
  discountType?: 'none' | 'senior_citizen' | 'pwd' | 'special';
  discountIdNumber?: string;
}

export interface PosCheckoutResult {
  success: boolean;
  transactionId: string;
  invoiceNumber: string;
  customerName?: string;
  discountType: string;
  discountIdNumber?: string;
  grossAmount: number;
  discountAmount: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

/**
 * Process POS Item Sale (Equipment, Pro Paddles, Beverages).
 * Validates prices from pos_products server-side, applies BIR statutory discounts,
 * records VAT breakdown, and decrements stock levels.
 */
export async function processPosTransaction(
  cart: { id: string; price?: number; quantity: number }[],
  _clientTotal: number,
  paymentMethod: string,
  compliance?: PosCompliancePayload
): Promise<PosCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  if (!cart || cart.length === 0) {
    throw new Error('Cannot process empty cart.');
  }

  // 1. Fetch products from database to calculate trusted server-side total and check stock
  const productIds = cart.map((item) => item.id);
  const { data: dbProducts, error: prodError } = await supabase
    .from('pos_products')
    .select('id, name, price, stock_level')
    .in('id', productIds);

  if (prodError || !dbProducts) {
    console.error('[POS Products Fetch Error]:', prodError);
    throw new Error('Failed to verify product prices from inventory.');
  }

  const productMap = new Map<string, { id: string; name: string; price: number; stock_level: number }>(
    dbProducts.map((p) => [p.id, { ...p, price: Number(p.price), stock_level: Number(p.stock_level ?? 0) }])
  );

  let verifiedGross = 0;
  const lineItems: { transaction_id?: string; product_id: string; quantity: number; price_at_time: number }[] = [];
  const receiptItems: PosCheckoutResult['items'] = [];

  for (const item of cart) {
    const dbProduct = productMap.get(item.id);
    if (!dbProduct) {
      throw new Error(`Product not found in inventory: ${item.id}`);
    }
    const itemQuantity = Math.max(1, item.quantity);
    const itemPrice = dbProduct.price;
    const subtotal = itemPrice * itemQuantity;
    verifiedGross += subtotal;

    lineItems.push({
      product_id: dbProduct.id,
      quantity: itemQuantity,
      price_at_time: itemPrice,
    });

    receiptItems.push({
      productId: dbProduct.id,
      name: dbProduct.name,
      quantity: itemQuantity,
      price: itemPrice,
      subtotal,
    });
  }

  // BIR EOPT & Statutory Compliance Calculations (RA 9994 / RA 10754)
  const discountType = compliance?.discountType || 'none';
  const isStatutoryDiscount = discountType === 'senior_citizen' || discountType === 'pwd';

  let vatableSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let discountAmount = 0;
  let finalTotal = verifiedGross;

  if (isStatutoryDiscount) {
    // 12% VAT Exemption Base
    vatExemptSales = Math.round((verifiedGross / 1.12) * 100) / 100;
    // 20% Statutory Discount on Net Base
    discountAmount = Math.round((vatExemptSales * 0.20) * 100) / 100;
    // Final Net Payable
    finalTotal = Math.round((vatExemptSales - discountAmount) * 100) / 100;
    vatableSales = 0;
    vatAmount = 0;
  } else {
    vatableSales = Math.round((verifiedGross / 1.12) * 100) / 100;
    vatAmount = Math.round((verifiedGross - vatableSales) * 100) / 100;
    vatExemptSales = 0;
    discountAmount = 0;
    finalTotal = verifiedGross;
  }

  // Generate Official Sequential Sales Invoice (SI) Number
  let invoiceNumber = '';
  try {
    const { data: invData, error: invError } = await supabase.rpc('generate_pos_invoice_number');
    if (!invError && invData) {
      invoiceNumber = invData as string;
    }
  } catch {
    // Fallback if rpc is unavailable
  }

  if (!invoiceNumber) {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    invoiceNumber = `SI-${dateStr}-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  // 2. Insert master transaction with trusted server-side total and tax fields
  const { data: transaction, error: txError } = await supabase
    .from('pos_transactions')
    .insert({
      invoice_number: invoiceNumber,
      cashier_id: user.id,
      customer_name: compliance?.customerName?.trim() || null,
      customer_tin: compliance?.customerTin?.trim() || null,
      discount_type: discountType,
      discount_id_number: compliance?.discountIdNumber?.trim() || null,
      gross_amount: verifiedGross,
      discount_amount: discountAmount,
      vatable_sales: vatableSales,
      vat_amount: vatAmount,
      vat_exempt_sales: vatExemptSales,
      zero_rated_sales: 0,
      total_amount: finalTotal,
      payment_method: paymentMethod,
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error('[POS Transaction Error]:', txError);
    throw new Error('Failed to process POS transaction.');
  }

  // 3. Insert transaction line items
  const itemsWithTxId = lineItems.map((item) => ({
    ...item,
    transaction_id: transaction.id,
  }));

  const { error: itemsError } = await supabase.from('pos_transaction_items').insert(itemsWithTxId);

  if (itemsError) {
    console.error('[POS Line Items Error]:', itemsError);
    throw new Error('Failed to record transaction items.');
  }

  // 4. Update inventory stock levels
  for (const item of cart) {
    const dbProduct = productMap.get(item.id);
    if (dbProduct) {
      const newStock = Math.max(0, dbProduct.stock_level - item.quantity);
      await supabase
        .from('pos_products')
        .update({ stock_level: newStock })
        .eq('id', dbProduct.id);
    }
  }

  revalidatePath('/cashier');
  revalidatePath('/cashier/reports');
  revalidatePath('/admin');

  return {
    success: true,
    transactionId: transaction.id,
    invoiceNumber,
    customerName: compliance?.customerName?.trim() || undefined,
    discountType,
    discountIdNumber: compliance?.discountIdNumber?.trim() || undefined,
    grossAmount: verifiedGross,
    discountAmount,
    vatableSales,
    vatAmount,
    vatExemptSales,
    zeroRatedSales: 0,
    total: finalTotal,
    paymentMethod,
    createdAt: transaction.created_at || new Date().toISOString(),
    items: receiptItems,
  };
}

// ============================================================================
// 4. OWNER & ADMIN FACILITY CONTROLS
// ============================================================================

/**
 * Provision new Staff Account (Cashier or Owner).
 */
export async function createCashierAccount(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized: Owner or Admin access required.');
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const role = (formData.get('role') as string) || 'cashier';

  const adminSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createError) {
    console.error('[Create Staff Error]:', createError.message);
    throw new Error(createError.message);
  }

  if (newUser.user) {
    await adminSupabase
      .from('profiles')
      .update({ role, full_name: fullName })
      .eq('id', newUser.user.id);
  }

  revalidatePath('/admin');
}

/**
 * Void a POS transaction.
 */
export async function voidTransaction(transactionId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized: Owner or Admin access required.');
  }

  const { error } = await supabase
    .from('pos_transactions')
    .update({ status: 'voided' })
    .eq('id', transactionId);

  if (error) {
    console.error('[Void Transaction Error]:', error);
    throw new Error('Failed to void transaction.');
  }

  revalidatePath('/admin');
}

/**
 * Create a new Court in the facility.
 */
export async function createCourt(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized: Owner or Admin access required.');
  }

  const name = formData.get('name') as string;
  const rate = parseFloat((formData.get('rate') as string) || '300');
  const { error } = await supabase.from('courts').insert({
    name,
    type: 'indoor',
    hourly_rate: rate,
    is_active: true,
  });

  if (error) {
    console.error('[Create Court Error]:', error);
    throw new Error('Failed to create court.');
  }

  revalidatePath('/admin/courts');
  revalidatePath('/book');
}

/**
 * Toggle Court Active / Maintenance Status.
 */
export async function toggleCourtStatus(
  courtId: string,
  currentStatus: boolean | string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    throw new Error('Unauthorized: Owner or Admin access required.');
  }

  const newActive = typeof currentStatus === 'boolean' ? !currentStatus : currentStatus !== 'active';

  const { error } = await supabase
    .from('courts')
    .update({ is_active: newActive, updated_at: new Date().toISOString() })
    .eq('id', courtId);

  if (error) {
    console.error('[Toggle Court Error]:', error);
    throw new Error('Failed to update court status.');
  }

  revalidatePath('/admin/courts');
  revalidatePath('/book');
}

// ============================================================================
// 5. PASSWORD MANAGEMENT
// ============================================================================

/**
 * Generate a temporary password (matching strict regex: 1 uppercase, 1 lowercase, 1 number, 1 special char, 8-12 length)
 */
function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  const specials = '!@#$%^&*';
  
  const getRandom = (str: string) => str[Math.floor(Math.random() * str.length)];
  
  let pwd = getRandom(upper) + getRandom(chars) + getRandom(nums) + getRandom(specials);
  
  const all = chars + upper + nums + specials;
  for(let i = 0; i < 4; i++) {
    pwd += getRandom(all);
  }
  
  // Shuffle string
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Handle Forgot Password by generating a temp password and emailing it via SMTP
 */
export async function resetPasswordWithTempPassword(formData: FormData): Promise<void> {
  const email = (formData.get('email') as string)?.trim();
  if (!email) {
    redirect('/forgot-password?message=' + encodeURIComponent('Email is required'));
  }

  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const adminSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user by email via Admin API
  const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === email);

  if (listError || !user) {
    // For security, don't reveal if user exists, just return success
    redirect('/forgot-password?success=' + encodeURIComponent('If an account exists with this email, a temporary password has been sent. Please check your inbox.'));
  }

  // Generate Temp Password
  const tempPassword = generateTempPassword();

  // Update User Password via Admin API
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    password: tempPassword,
  });

  if (updateError) {
    console.error('[Forgot Password Error]:', updateError);
    redirect('/forgot-password?message=' + encodeURIComponent('Failed to reset password. Please try again.'));
  }

  // Send Email via Nodemailer
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.SMTP_USER || 'aarongelaga222@gmail.com',
        pass: process.env.SMTP_PASS, 
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER || 'aarongelaga222@gmail.com',
      to: email,
      subject: 'Your Temporary Password for C&J Pickleball',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>A request was made to reset your password. Here is your temporary password:</p>
          <div style="background:#f5f5f5; padding:15px; text-align:center; font-size: 24px; letter-spacing: 2px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
            ${tempPassword}
          </div>
          <p>Please log in and navigate to the <b>Settings</b> tab in your dashboard to change this password immediately.</p>
          <p style="color: #707072; font-size: 12px; margin-top: 30px;">If you did not request this, please contact support immediately.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('[Email Dispatch Error]:', emailError);
  }

  redirect('/forgot-password?success=' + encodeURIComponent('A temporary password has been sent to your email address. Please check your inbox and log in.'));
}

/**
 * Handle Dashboard Settings Password Update
 */
export async function updateUserPassword(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();
  const password = formData.get('password') as string;

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('[Update Password Error]:', error);
    return { error: error.message };
  }

  return { success: true };
}
