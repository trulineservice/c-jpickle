'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { pushBookingToGoogleCalendar, testGoogleCalendarConnection, normalizePrivateKey } from '@/lib/google-calendar-sync-engine';

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
 *    - cancelBooking(bookingId) [Strict 2-Day (48-Hour) Rule]
 *    - requestBookingRefund(payload) [Strict 2-Day (48-Hour) Rule]
 *    - rescheduleBooking(payload) [Player Reschedule Feature]
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
  } else if (role === 'cashier' || role === 'coordinator') {
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

  // Determine host dynamically for accurate email redirect
  let appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://c-j-pickleball.vercel.app').replace(/\/$/, '');
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      appUrl = `${proto}://${host}`;
    }
  } catch {
    // Fallback
  }

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

  // If user signed up and email is auto-confirmed, sign in immediately so account is active and credited
  if (data?.user && !data.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData?.user) {
      await redirectBasedOnRole(signInData.user.id, next);
      return redirect(destination);
    }

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
 * Strict 2-Day (48-Hour) Cancellation Action:
 * - Allows cancellation with refund eligibility only if (start_time - NOW() >= 48 hours).
 * - Cancellations within 48 hours are non-refundable for players (reschedule available instead).
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

  // 3. Evaluate 2-day (48-hour) refund eligibility rule
  const startTime = new Date(booking.start_time).getTime();
  const now = Date.now();
  const differenceHours = (startTime - now) / (1000 * 60 * 60);

  if (!isStaff && differenceHours < 48) {
    return {
      error: `Strict 2-day cancellation policy: This court reservation begins in ${differenceHours.toFixed(
        1
      )} hours. Cancellations with refund eligibility must be requested at least 2 days (48 hours) in advance. You can reschedule your booking instead.`,
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
 * - Validates strict 2-day (48-hour) rule (unless staff override).
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

  // 3. Evaluate 2-day (48-hour) refund rule
  const startTime = new Date(booking.start_time).getTime();
  const now = Date.now();
  const differenceHours = (startTime - now) / (1000 * 60 * 60);

  if (!isStaff && differenceHours < 48) {
    return {
      error: `Strict 2-day refund policy: This court reservation begins in ${differenceHours.toFixed(
        1
      )} hours. Cancellations are only eligible for a refund at least 2 days (48 hours) in advance. However, you can reschedule your session to another date or time slot!`,
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
 * Reschedule Court Booking:
 * - Allows player or staff to reschedule an active reservation to another date/time/court.
 * - Prevents double-booking and overlaps on the destination court.
 * - Validates that the original reservation has not already passed.
 */
export async function rescheduleBooking({
  bookingId,
  newCourtId,
  newStartTime,
  reason,
}: {
  bookingId: string;
  newCourtId: string;
  newStartTime: string;
  reason?: string;
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
    return { error: 'You must be logged in to reschedule a booking.' };
  }

  // 1. Fetch target booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, user_id, court_id, start_time, end_time, duration_hours, status, notes, reschedule_count, original_start_time')
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
    return { error: 'You are not authorized to reschedule this booking.' };
  }

  // 3. Validate status
  if (['cancelled', 'cancelled_refund_pending', 'expired'].includes(booking.status)) {
    return { error: `Cannot reschedule a booking that is currently ${booking.status}.` };
  }

  // 4. Validate original start time has not already passed
  const currentStartTime = new Date(booking.start_time).getTime();
  if (!isStaff && currentStartTime <= Date.now()) {
    return { error: 'Past or currently ongoing court sessions cannot be rescheduled.' };
  }

  // 5. Validate new date and time
  const targetStart = new Date(newStartTime);
  if (isNaN(targetStart.getTime()) || targetStart.getTime() <= Date.now()) {
    return { error: 'Please choose a valid future date and time slot.' };
  }

  const durationHours = booking.duration_hours || 1;
  const targetEnd = new Date(targetStart.getTime() + durationHours * 60 * 60 * 1000);

  // 6. Verify destination court exists and is active
  const targetCourtId = newCourtId || booking.court_id;
  const { data: court, error: courtError } = await supabase
    .from('courts')
    .select('id, name, is_active')
    .eq('id', targetCourtId)
    .single();

  if (courtError || !court || court.is_active === false) {
    return { error: 'The selected court is currently not active or available.' };
  }

  // 7. Check for slot conflicts on the target court (excluding this current booking)
  const nowUtc = new Date();
  const { data: conflicts, error: conflictErr } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, expires_at')
    .eq('court_id', targetCourtId)
    .neq('id', booking.id)
    .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment'])
    .lt('start_time', targetEnd.toISOString())
    .gt('end_time', targetStart.toISOString());

  if (conflictErr) {
    console.error('[Reschedule Conflict Check Error]:', conflictErr);
    return { error: 'Failed to verify court availability for the new time slot.' };
  }

  const activeConflict = (conflicts || []).find((b) => {
    if (b.status === 'pending_payment') {
      return b.expires_at ? new Date(b.expires_at) > nowUtc : false;
    }
    return true;
  });

  if (activeConflict) {
    return {
      error: 'The chosen slot on this court is already reserved or occupied. Please select another time or court.',
    };
  }

  // 8. Check maintenance windows
  try {
    const { data: maintenanceWindows } = await supabase
      .from('court_maintenance_schedules')
      .select('id')
      .eq('court_id', targetCourtId)
      .lt('start_time', targetEnd.toISOString())
      .gt('end_time', targetStart.toISOString());

    if (maintenanceWindows && maintenanceWindows.length > 0) {
      return { error: 'Court is scheduled for maintenance during this time slot. Please choose another slot.' };
    }
  } catch (maintErr) {
    // Silently continue if maintenance table is optional
  }

  // 9. Update the booking in Supabase
  const logEntry = `[Rescheduled ${new Date().toISOString()}]: From ${booking.start_time} to ${targetStart.toISOString()} (${court.name})${reason ? ` - Reason: ${reason}` : ''}`;
  const updatedNotes = booking.notes ? `${booking.notes}\n${logEntry}` : logEntry;

  const updatePayload: Record<string, any> = {
    court_id: targetCourtId,
    start_time: targetStart.toISOString(),
    end_time: targetEnd.toISOString(),
    notes: updatedNotes,
    updated_at: new Date().toISOString(),
    rescheduled_at: new Date().toISOString(),
    reschedule_count: (booking.reschedule_count || 0) + 1,
  };

  if (!booking.original_start_time) {
    updatePayload.original_start_time = booking.start_time;
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', booking.id);

  if (updateError) {
    console.error('[Reschedule Booking Error]:', updateError);
    return { error: 'Failed to reschedule booking. Please try again or select another time.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/cashier/schedule');
  revalidatePath('/admin');
  revalidatePath('/book');

  const formattedDate = targetStart.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = targetStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    success: true,
    message: `Session successfully rescheduled to ${court.name} on ${formattedDate} at ${formattedTime}!`,
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
  discountType?: 'none' | 'senior_citizen' | 'pwd' | 'student' | 'employee' | 'special';
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
 * Validates prices from pos_products server-side, applies customer discounts,
 * and decrements stock levels.
 */
export async function processPosTransaction(
  cart: {
    id: string;
    price?: number;
    quantity: number;
    dispensed_volume?: number;
    base_unit?: string;
  }[],
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
    .select('id, name, price, stock_level, volume, base_unit')
    .in('id', productIds);

  if (prodError || !dbProducts) {
    console.error('[POS Products Fetch Error]:', prodError);
    throw new Error('Failed to verify product prices from inventory.');
  }

  const productMap = new Map<string, { id: string; name: string; price: number; stock_level: number; volume: number; base_unit: string }>(
    dbProducts.map((p) => [
      p.id,
      {
        ...p,
        price: Number(p.price),
        stock_level: Number(p.stock_level ?? 0),
        volume: Number(p.volume ?? 0),
        base_unit: p.base_unit || 'pcs',
      },
    ])
  );

  let verifiedGross = 0;
  const lineItems: {
    transaction_id?: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
    dispensed_volume?: number;
    volume_unit?: string;
  }[] = [];
  const receiptItems: PosCheckoutResult['items'] = [];

  for (const item of cart) {
    const dbProduct = productMap.get(item.id);
    if (!dbProduct) {
      throw new Error(`Product not found in inventory: ${item.id}`);
    }
    const itemQuantity = Math.max(1, item.quantity);
    
    // Price calculation: if volume portion is dispensed and container has a price
    let itemPrice = dbProduct.price;
    if (item.dispensed_volume && item.dispensed_volume > 0 && dbProduct.volume > 0) {
      if (dbProduct.price > 0) {
        // Proportional portion price, rounded to 2 decimals
        itemPrice = item.price !== undefined ? item.price : Math.round(((item.dispensed_volume / dbProduct.volume) * dbProduct.price) * 100) / 100;
      } else {
        itemPrice = 0;
      }
    }

    const subtotal = itemPrice * itemQuantity;
    verifiedGross += subtotal;

    lineItems.push({
      product_id: dbProduct.id,
      quantity: itemQuantity,
      price_at_time: itemPrice,
      dispensed_volume: item.dispensed_volume || 0,
      volume_unit: item.base_unit || dbProduct.base_unit || 'pcs',
    });

    const displayName = item.dispensed_volume && item.dispensed_volume > 0
      ? `${dbProduct.name} (${item.dispensed_volume.toLocaleString('en-US')} ${item.base_unit || dbProduct.base_unit})`
      : dbProduct.name;

    receiptItems.push({
      productId: dbProduct.id,
      name: displayName,
      quantity: itemQuantity,
      price: itemPrice,
      subtotal,
    });
  }

  // Customer Privilege & Statutory Discount Calculations (Tax removed)
  const discountType = compliance?.discountType || 'none';

  let discountAmount = 0;

  if (discountType === 'senior_citizen' || discountType === 'pwd') {
    // 20% statutory discount applied directly to gross
    discountAmount = Math.round((verifiedGross * 0.20) * 100) / 100;
  } else if (discountType === 'student') {
    // Always flat 10 pesos off total order (capped at verifiedGross)
    discountAmount = verifiedGross > 0 ? Math.min(10, verifiedGross) : 0;
  } else if (discountType === 'employee') {
    // 10% employee discount applied directly to gross
    discountAmount = Math.round((verifiedGross * 0.10) * 100) / 100;
  }

  const finalTotal = Math.max(0, Math.round((verifiedGross - discountAmount) * 100) / 100);

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

  // 2. Insert master transaction with trusted server-side total and zeroed tax fields
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
      vatable_sales: 0,
      vat_amount: 0,
      vat_exempt_sales: 0,
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

  // 4. Update inventory stock levels (volume-aware deduction)
  for (const item of cart) {
    const dbProduct = productMap.get(item.id);
    if (dbProduct) {
      const isVolume = Boolean(dbProduct.volume > 0 && dbProduct.base_unit !== 'pcs' && item.dispensed_volume && item.dispensed_volume > 0);
      let newStock = 0;

      if (isVolume) {
        const totalDeductVolume = Number(item.dispensed_volume) * item.quantity;
        const currentTotalVolume = Math.round(dbProduct.stock_level * dbProduct.volume);
        const nextTotalVolume = Math.max(0, currentTotalVolume - totalDeductVolume);
        newStock = nextTotalVolume / dbProduct.volume;
        // Update local map so multiple items of the same product deduct consecutively
        dbProduct.stock_level = newStock;
      } else {
        newStock = Math.max(0, dbProduct.stock_level - item.quantity);
        dbProduct.stock_level = newStock;
      }

      await supabase
        .from('pos_products')
        .update({ stock_level: newStock })
        .eq('id', dbProduct.id);
    }
  }

  revalidatePath('/cashier');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/reports');
  revalidatePath('/admin');
  revalidatePath('/cashier/expenses');

  return {
    success: true,
    transactionId: transaction.id,
    invoiceNumber,
    customerName: compliance?.customerName?.trim() || undefined,
    discountType,
    discountIdNumber: compliance?.discountIdNumber?.trim() || undefined,
    grossAmount: verifiedGross,
    discountAmount,
    vatableSales: 0,
    vatAmount: 0,
    vatExemptSales: 0,
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
 * Helper to fetch POS Master PIN code reliably using service client to avoid session/cookie edge cases.
 */
async function getPosMasterPin(): Promise<string> {
  try {
    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await adminSupabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pos_master_pin')
      .single();
    if (!error && data?.value) return data.value.trim();
  } catch (err) {
    console.warn('[Get Master PIN fallback]:', err);
  }
  return process.env.POS_MASTER_PIN || '8888';
}

/**
 * Verify POS Master PIN for supervisor overrides and cart void actions.
 */
export async function verifyPosMasterPin(pin: string): Promise<{ success: boolean; error?: string }> {
  if (!pin || typeof pin !== 'string') {
    return { success: false, error: 'PIN code is required.' };
  }
  const masterPin = await getPosMasterPin();
  if (pin.trim() !== masterPin) {
    return { success: false, error: 'Invalid Master PIN code. Authorization denied.' };
  }
  return { success: true };
}

/**
 * Void a POS transaction with Master PIN authorization, reason auditing, and stock reversal.
 */
export async function voidPosTransactionWithPin(payload: {
  transactionId: string;
  pin: string;
  reason: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const { transactionId, pin, reason } = payload;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Staff login required.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Staff access required.' };
  }

  if (!pin) {
    return { success: false, error: 'Master PIN code is required to void transactions.' };
  }

  const masterPin = await getPosMasterPin();
  if (pin.trim() !== masterPin) {
    return { success: false, error: 'Invalid Master PIN code. Void authorization failed.' };
  }

  const adminSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Fetch transaction and verify it's not already voided
  const { data: tx, error: fetchErr } = await adminSupabase
    .from('pos_transactions')
    .select('id, invoice_number, status, total_amount')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    return { success: false, error: 'Transaction not found.' };
  }

  if (tx.status === 'voided') {
    return { success: false, error: 'Transaction has already been voided.' };
  }

  // 2. Fetch line items to restore inventory stock using elevated client once PIN is verified

  const { data: lineItems } = await adminSupabase
    .from('pos_transaction_items')
    .select('product_id, quantity')
    .eq('transaction_id', transactionId);

  if (lineItems && lineItems.length > 0) {
    for (const item of lineItems) {
      if (item.product_id) {
        const { data: prod } = await adminSupabase
          .from('pos_products')
          .select('id, stock_level')
          .eq('id', item.product_id)
          .single();

        if (prod) {
          const restoredStock = Number(prod.stock_level ?? 0) + Number(item.quantity ?? 0);
          await adminSupabase
            .from('pos_products')
            .update({ stock_level: restoredStock })
            .eq('id', prod.id);
        }
      }
    }
  }

  // 3. Mark transaction as voided
  const voidReason = reason?.trim() || 'Cashier / Supervisor Void';
  const { error: updateErr } = await adminSupabase
    .from('pos_transactions')
    .update({
      status: 'voided',
      void_reason: voidReason,
      voided_at: new Date().toISOString(),
      voided_by: user.id,
    })
    .eq('id', transactionId);

  if (updateErr) {
    console.error('[Void POS Transaction Error]:', updateErr);
    return { success: false, error: 'Failed to update transaction status.' };
  }

  revalidatePath('/cashier');
  revalidatePath('/cashier/reports');
  revalidatePath('/admin');
  revalidatePath('/cashier/expenses');

  return {
    success: true,
    message: `Invoice ${tx.invoice_number || `#${tx.id.slice(0, 8)}`} voided successfully. Inventory stock has been restored.`,
  };
}

/**
 * Fetch POS Master PIN for verified Admin / Owner.
 */
export async function getPosMasterPinForAdmin(): Promise<{ success: boolean; pin?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Only Owner or Admin can view Master PIN.' };
  }

  const pin = await getPosMasterPin();
  return { success: true, pin };
}

/**
 * Update POS Master PIN code (Owner / Admin only).
 */
export async function updatePosMasterPin(payload: {
  currentPin?: string;
  newPin: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  const { currentPin, newPin } = payload;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized: Please log in as an administrator.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized: Only Owner or Admin can modify Master PIN.' };
  }

  const existingPin = await getPosMasterPin();
  if (currentPin && currentPin.trim() !== '' && currentPin.trim() !== existingPin) {
    return { success: false, error: 'Current Master PIN is incorrect.' };
  }

  const cleanNew = newPin?.trim();
  if (!cleanNew || cleanNew.length < 4 || cleanNew.length > 8 || !/^\d+$/.test(cleanNew)) {
    return { success: false, error: 'New PIN must be between 4 and 8 numeric digits.' };
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'pos_master_pin',
      value: cleanNew,
      description: 'Master PIN code required for POS item voiding, order cancellation, and sales invoice voiding',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[Update Master PIN Error]:', error);
    return { success: false, error: 'Failed to save new Master PIN.' };
  }

  revalidatePath('/admin');
  revalidatePath('/cashier');
  return { success: true, message: 'Master PIN successfully updated.' };
}

/**
 * Void a POS transaction (legacy alias).
 */
export async function voidTransaction(transactionId: string): Promise<void> {
  const masterPin = await getPosMasterPin();
  await voidPosTransactionWithPin({
    transactionId,
    pin: masterPin,
    reason: 'Admin Dashboard Quick Void',
  });
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
 * Request a Password Reset / Change Password link sent to user's email.
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    redirect('/forgot-password?message=' + encodeURIComponent('Please enter a valid email address.'));
  }

  const token = crypto.randomBytes(32).toString('hex');
  const supabase = await createClient();

  // Create reset token in Supabase database
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_password_reset_token', {
    p_email: email,
    p_token: token,
    p_hours: 1,
  });

  if (rpcError) {
    console.error('[Create Reset Token Error]:', rpcError);
    redirect('/forgot-password?message=' + encodeURIComponent('Unable to process password reset. Please try again.'));
  }

  const result = rpcData as { success?: boolean; error?: string; full_name?: string } | null;
  if (!result?.success) {
    redirect('/forgot-password?message=' + encodeURIComponent(result?.error || 'No account found with this email address.'));
  }

  const userFullName = result.full_name || 'Valued Player';

  // Determine current origin dynamically based on the incoming request host
  let origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://c-j-pickleball.vercel.app').replace(/\/$/, '');
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      origin = `${proto}://${host}`;
    }
  } catch {
    // Fallback to origin default
  }

  const resetUrl = `${origin}/reset-password?token=${token}`;

  // Optional companion trigger: Supabase native reset password (non-blocking)
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
  } catch (supaErr) {
    console.warn('[Supabase native reset warning]:', supaErr);
  }

  // Dispatch custom branded email directly via Resend / Nodemailer SMTP
  let devLink: string | undefined = undefined;
  try {
    const { sendPasswordResetEmail } = await import('@/lib/email');
    const dispatchResult = await sendPasswordResetEmail({
      to: email,
      recipientName: userFullName,
      resetUrl,
    });

    if (dispatchResult.provider === 'sandbox') {
      devLink = resetUrl;
    }

    console.log(`[Forgot Password] Reset email dispatched to ${email} via provider: ${dispatchResult.provider}`);
  } catch (emailErr) {
    console.error('[Forgot Password Email Dispatch Error]:', emailErr);
  }

  const successMessage =
    'A password reset link has been sent to your email. Click the link inside the email to choose your new password.';

  const queryParams = new URLSearchParams({
    success: successMessage,
    email,
  });

  if (devLink) {
    queryParams.set('dev_link', devLink);
  }

  redirect(`/forgot-password?${queryParams.toString()}`);
}

/**
 * Complete Password Reset with New Password using secure token or active recovery session.
 */
export async function resetPasswordWithToken(formData: FormData): Promise<void> {
  const token = (formData.get('token') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || password.length < 6) {
    const targetUrl = token
      ? `/reset-password?token=${encodeURIComponent(token)}&message=`
      : `/reset-password?message=`;
    redirect(targetUrl + encodeURIComponent('Password must be at least 6 characters long.'));
  }

  if (password !== confirmPassword) {
    const targetUrl = token
      ? `/reset-password?token=${encodeURIComponent(token)}&message=`
      : `/reset-password?message=`;
    redirect(targetUrl + encodeURIComponent('Passwords do not match. Please re-enter and try again.'));
  }

  const supabase = await createClient();

  // Mode 1: Token-based reset (custom link from email)
  if (token) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('complete_password_reset', {
      p_token: token,
      p_new_password: password,
    });

    if (rpcError) {
      console.error('[Complete Password Reset RPC Error]:', rpcError);
      redirect(`/reset-password?token=${encodeURIComponent(token)}&message=` + encodeURIComponent('Failed to update password. Please try again.'));
    }

    const result = rpcData as { success?: boolean; error?: string; email?: string; user_id?: string } | null;
    if (!result?.success) {
      redirect(`/reset-password?token=${encodeURIComponent(token)}&message=` + encodeURIComponent(result?.error || 'Reset link is invalid or has expired. Please request a new one.'));
    }

    // Direct synchronization via admin client to ensure Supabase Auth internal hash is updated
    const targetUserId = result.user_id;
    try {
      const adminSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      if (targetUserId) {
        await adminSupabase.auth.admin.updateUserById(targetUserId, {
          password,
          email_confirm: true,
        });
      } else if (result.email) {
        const { data: userData } = await adminSupabase.auth.admin.listUsers();
        const matchedUser = userData?.users.find(
          (u) => u.email?.toLowerCase() === result.email?.toLowerCase()
        );
        if (matchedUser) {
          await adminSupabase.auth.admin.updateUserById(matchedUser.id, {
            password,
            email_confirm: true,
          });
        }
      }
    } catch (adminErr) {
      console.warn('[Admin password sync warning]:', adminErr);
    }

    // Attempt automatic login with the new credentials
    if (result.email) {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password,
        });

        if (!signInError && signInData?.user) {
          await redirectBasedOnRole(signInData.user.id, '/dashboard');
          redirect('/dashboard');
        }
      } catch {
        // If sign-in triggers redirect, let Next handle it
      }
    }

    redirect('/login?message=' + encodeURIComponent('Your password has been changed successfully! You can now log in with your new password.'));
  }

  // Mode 2: Session-based recovery (from Supabase native reset email link)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/forgot-password?message=' + encodeURIComponent('Your reset session has expired or is invalid. Please request a new reset link.'));
  }

  // 1. Update user password in active Supabase session
  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    console.error('[Session Reset Password Error]:', updateError);
    try {
      const adminSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: adminUpdateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });
      if (adminUpdateError) {
        redirect('/reset-password?message=' + encodeURIComponent(adminUpdateError.message || updateError.message || 'Failed to update password. Please try again.'));
      }
    } catch {
      redirect('/reset-password?message=' + encodeURIComponent(updateError.message || 'Failed to update password. Please try again.'));
    }
  } else {
    // 2. Also ensure via admin client that email_confirm is true and password hash is synced
    try {
      const adminSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await adminSupabase.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });
    } catch (adminErr) {
      console.warn('[Admin password sync warning for session recovery]:', adminErr);
    }
  }

  await redirectBasedOnRole(user.id, '/dashboard');
  redirect('/dashboard');
}

/**
 * Backwards compatibility alias for existing callers
 */
export const resetPasswordWithTempPassword = requestPasswordReset;

/**
 * Handle Dashboard Settings Password Update
 */
export async function updateUserPassword(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const password = (formData.get('password') as string)?.trim();

    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Your session has expired. Please log in again.' };
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    try {
      const adminSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: adminError } = await adminSupabase.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });
      if (adminError && updateError) {
        return { error: adminError.message || updateError.message };
      }
    } catch (adminErr) {
      if (updateError) {
        return { error: updateError.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[updateUserPassword Exception]:', err);
    return { error: err?.message || 'Failed to update password. Please try again.' };
  }
}

// ============================================================================
// 6. DAILY EXPENSES & INVENTORY MANAGEMENT
// ============================================================================

export interface AddDailyExpenseParams {
  expenseDate?: string;
  category: string;
  title: string;
  amount: number;
  paymentMethod?: string;
  receiptReference?: string;
  notes?: string;
}

/**
 * Record a new daily operational expense (utilities, supplies, maintenance, petty cash).
 */
export async function addDailyExpense(params: AddDailyExpenseParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Staff access required to log expenses.' };
    }

    if (!params.title || !params.title.trim()) {
      return { success: false, error: 'Expense description/title is required.' };
    }

    const numAmount = Number(params.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Valid expense amount greater than 0 is required.' };
    }

    const { error } = await supabase
      .from('daily_expenses')
      .insert({
        expense_date: params.expenseDate || new Date().toISOString().split('T')[0],
        category: params.category || 'supplies',
        title: params.title.trim(),
        amount: numAmount,
        payment_method: params.paymentMethod || 'cash',
        receipt_reference: params.receiptReference?.trim() || null,
        notes: params.notes?.trim() || null,
        recorded_by: user.id,
      });

    if (error) {
      console.error('[Add Daily Expense Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/cashier/expenses');
    revalidatePath('/cashier/reports');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    console.error('[Add Daily Expense Exception]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to record expense.' };
  }
}

/**
 * Delete an operational expense record (Admin/Owner only).
 */
export async function deleteDailyExpense(expenseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin or Owner privileges required to delete expenses.' };
    }

    const { error } = await supabase
      .from('daily_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('[Delete Expense Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/cashier/expenses');
    revalidatePath('/cashier/reports');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    console.error('[Delete Expense Exception]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete expense.' };
  }
}

export interface UpdateInventoryItemParams {
  id: string;
  costPrice?: number;
  price?: number;
  stockLevel?: number;
  reorderThreshold?: number;
  baseUnit?: string;
  volume?: number;
  isActive?: boolean;
}

/**
 * Update POS Product inventory metrics, selling price, and unit cost price.
 */
export async function updateInventoryItem(params: UpdateInventoryItemParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Staff access required.' };
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (params.costPrice !== undefined) {
      const c = Number(params.costPrice);
      if (isNaN(c) || c < 0) return { success: false, error: 'Cost price must be >= 0.' };
      updatePayload.cost_price = c;
    }

    if (params.price !== undefined) {
      const p = Number(params.price);
      if (isNaN(p) || p <= 0) return { success: false, error: 'Selling price must be > 0.' };
      updatePayload.price = p;
    }

    if (params.stockLevel !== undefined) {
      const s = Number(params.stockLevel);
      if (isNaN(s) || s < 0) return { success: false, error: 'Stock level cannot be negative.' };
      updatePayload.stock_level = s;
    }

    if (params.reorderThreshold !== undefined) {
      const r = Number(params.reorderThreshold);
      if (isNaN(r) || r < 0) return { success: false, error: 'Threshold must be >= 0.' };
      updatePayload.reorder_threshold = r;
    }

    if (params.baseUnit !== undefined) {
      updatePayload.base_unit = params.baseUnit.trim() || 'pcs';
    }

    if (params.volume !== undefined) {
      const v = Number(params.volume);
      if (!isNaN(v) && v >= 0) {
        updatePayload.volume = v;
      }
    }

    if (params.isActive !== undefined) {
      updatePayload.is_active = Boolean(params.isActive);
    }

    const { error } = await supabase
      .from('pos_products')
      .update(updatePayload)
      .eq('id', params.id);

    if (error) {
      console.error('[Update Inventory Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/cashier');
    revalidatePath('/cashier/inventory');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    console.error('[Update Inventory Exception]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update inventory.' };
  }
}

/**
 * Record a down payment / deposit on a booking (e.g. 50% deposit for venue rental).
 * Automatically updates status to 'paid', sets down_payment_amount, and triggers
 * instant server-side push to Google Calendar.
 */
export async function recordDownPayment(params: {
  bookingId: string;
  downPaymentAmount: number;
  paymentMethod: string;
  notes?: string;
}): Promise<{ success: boolean; googleSynced?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'admin', 'cashier', 'coordinator'].includes(profile.role)) {
      return { success: false, error: 'Forbidden. Staff permissions required.' };
    }

    const { data: existingBooking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_price, notes')
      .eq('id', params.bookingId)
      .single();

    if (fetchErr || !existingBooking) {
      return { success: false, error: 'Booking not found.' };
    }

    const amount = Number(params.downPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please specify a valid down payment amount > 0.' };
    }

    const combinedNotes = [
      existingBooking.notes,
      `Down payment of ₱${amount.toFixed(2)} received via ${params.paymentMethod.toUpperCase()} (Recorded by ${profile.full_name || 'Staff'})`,
      params.notes,
    ]
      .filter(Boolean)
      .join(' | ');

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        down_payment_amount: amount,
        status: 'paid',
        payment_method: params.paymentMethod,
        notes: combinedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.bookingId);

    if (updateErr) {
      console.error('[Record Down Payment Error]:', updateErr);
      return { success: false, error: updateErr.message };
    }

    revalidatePath('/cashier/schedule');
    revalidatePath('/admin');

    // Automatically trigger Google Calendar push
    let googleSynced = false;
    try {
      const syncRes = await pushBookingToGoogleCalendar(params.bookingId);
      googleSynced = Boolean(syncRes.success);
    } catch (gErr) {
      console.warn('[Record Down Payment] Google sync warning:', gErr);
    }

    return { success: true, googleSynced };
  } catch (err: unknown) {
    console.error('[Record Down Payment Exception]:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to record down payment.' };
  }
}

/**
 * Manual trigger to push or refresh an individual booking on Google Calendar.
 */
export async function triggerManualGoogleCalendarSync(bookingId: string): Promise<{
  success: boolean;
  googleEventId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const result = await pushBookingToGoogleCalendar(bookingId);
    revalidatePath('/cashier/schedule');
    revalidatePath('/admin');
    return result;
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Sync failed' };
  }
}

/**
 * Save Google Calendar API configuration keys into system_settings.
 */
export async function saveGoogleCalendarSettings(params: {
  calendarId: string;
  serviceAccountEmail?: string;
  privateKey?: string;
  autoSyncEnabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Admin permissions required.' };
    }

    let serviceEmail = params.serviceAccountEmail ? params.serviceAccountEmail.trim() : '';
    let privKey = params.privateKey ? normalizePrivateKey(params.privateKey) : '';

    // Check if user pasted full JSON into serviceAccountEmail or privateKey
    if (params.privateKey && params.privateKey.includes('client_email')) {
      try {
        const parsed = JSON.parse(params.privateKey.trim());
        if (parsed.client_email) serviceEmail = parsed.client_email.trim();
        if (parsed.private_key) privKey = normalizePrivateKey(parsed.private_key);
      } catch {
        // ignore
      }
    }

    const updates = [
      { key: 'google_calendar_id', value: params.calendarId.trim(), description: 'Target Google Calendar ID' },
      { key: 'google_calendar_auto_sync_enabled', value: params.autoSyncEnabled ? 'true' : 'false', description: 'Auto sync enabled' },
    ];

    if (serviceEmail) {
      updates.push({
        key: 'google_service_account_email',
        value: serviceEmail,
        description: 'Google Cloud Service Account client email',
      });
    }

    if (privKey) {
      updates.push({
        key: 'google_private_key',
        value: privKey,
        description: 'Google Cloud Service Account RSA Private Key',
      });
    }

    for (const item of updates) {
      await supabase
        .from('system_settings')
        .upsert({
          key: item.key,
          value: item.value,
          description: item.description,
          updated_at: new Date().toISOString(),
        });
    }

    revalidatePath('/admin');
    revalidatePath('/cashier/schedule');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save settings.' };
  }
}

/**
 * Server action to test Google Calendar direct push.
 */
export async function testGoogleCalendarSyncAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    return await testGoogleCalendarConnection();
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Test failed' };
  }
}

/**
 * Server action to fetch current Google Calendar settings.
 */
export async function getGoogleCalendarSettingsAction(): Promise<{
  success: boolean;
  calendarId?: string;
  serviceAccountEmail?: string;
  autoSyncEnabled?: boolean;
  hasPrivateKey?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'google_calendar_id',
        'google_service_account_email',
        'google_private_key',
        'google_calendar_auto_sync_enabled',
      ]);

    if (error) return { success: false, error: error.message };

    const map = new Map((data || []).map((row) => [row.key, row.value]));
    return {
      success: true,
      calendarId: map.get('google_calendar_id') || '',
      serviceAccountEmail: map.get('google_service_account_email') || '',
      autoSyncEnabled: map.get('google_calendar_auto_sync_enabled') !== 'false',
      hasPrivateKey: !!map.get('google_private_key'),
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load settings' };
  }
}

// ============================================================================
// CASHIER DUTY & SHIFT SYSTEM ACTIONS
// ============================================================================

export async function clockInCashierAction(params?: {
  openingFloat?: number;
  notes?: string;
}): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized. Staff login required.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'admin', 'cashier', 'coordinator'].includes(profile.role)) {
      return { success: false, error: 'Forbidden. Staff access required.' };
    }

    // Check if already on duty
    const { data: existingActive } = await supabase
      .from('cashier_duty_sessions')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('status', 'on_duty')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingActive) {
      return { success: true, session: existingActive };
    }

    const { data: newSession, error } = await supabase
      .from('cashier_duty_sessions')
      .insert({
        cashier_id: user.id,
        started_at: new Date().toISOString(),
        status: 'on_duty',
        opening_float: params?.openingFloat ?? 0,
        notes: params?.notes || null,
      })
      .select()
      .single();

    if (error || !newSession) {
      return { success: false, error: error?.message || 'Failed to clock in for duty' };
    }

    revalidatePath('/cashier');
    revalidatePath('/cashier/schedule');
    revalidatePath('/admin');
    return { success: true, session: newSession };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Clock in failed' };
  }
}

export async function clockOutCashierAction(params?: {
  sessionId?: string;
  closingCash?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized. Staff login required.' };

    let query = supabase
      .from('cashier_duty_sessions')
      .update({
        ended_at: new Date().toISOString(),
        status: 'off_duty',
        closing_cash: params?.closingCash ?? null,
        notes: params?.notes ? params.notes : undefined,
        updated_at: new Date().toISOString(),
      });

    if (params?.sessionId) {
      query = query.eq('id', params.sessionId);
    } else {
      query = query.eq('cashier_id', user.id).eq('status', 'on_duty');
    }

    const { error } = await query;
    if (error) return { success: false, error: error.message };

    revalidatePath('/cashier');
    revalidatePath('/cashier/schedule');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Clock out failed' };
  }
}

export async function getActiveDutySessionAction(): Promise<{
  onDuty: boolean;
  session?: any;
  cashierName?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { onDuty: false };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    const { data: session } = await supabase
      .from('cashier_duty_sessions')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('status', 'on_duty')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return { onDuty: false, cashierName: profile?.full_name || 'Staff' };

    return {
      onDuty: true,
      session,
      cashierName: profile?.full_name || 'Staff',
    };
  } catch {
    return { onDuty: false };
  }
}

export async function getCashiersOnDutyAtAction(targetTimeIso: string): Promise<{
  success: boolean;
  targetTime: string;
  cashiers: Array<{
    sessionId: string;
    cashierId: string;
    cashierName: string;
    cashierEmail: string;
    cashierPhone: string;
    cashierRole: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    openingFloat: number;
    closingCash: number | null;
    notes: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, targetTime: targetTimeIso, cashiers: [], error: 'Unauthorized' };

    const { data, error } = await supabase.rpc('get_cashiers_on_duty_at', {
      p_target_time: targetTimeIso,
    });

    if (error) {
      return { success: false, targetTime: targetTimeIso, cashiers: [], error: error.message };
    }

    const cashiers = (data || []).map((row: any) => ({
      sessionId: row.session_id,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      cashierEmail: row.cashier_email,
      cashierPhone: row.cashier_phone,
      cashierRole: row.cashier_role,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status,
      openingFloat: Number(row.opening_float || 0),
      closingCash: row.closing_cash !== null ? Number(row.closing_cash) : null,
      notes: row.notes,
    }));

    return {
      success: true,
      targetTime: targetTimeIso,
      cashiers,
    };
  } catch (err: unknown) {
    return {
      success: false,
      targetTime: targetTimeIso,
      cashiers: [],
      error: err instanceof Error ? err.message : 'Failed to query duty roster',
    };
  }
}

// ============================================================================
// 10. ADMIN PLAYER MANAGEMENT CRUD (WITH SOFT DELETE)
// ============================================================================

export interface AdminPlayerInput {
  fullName: string;
  email?: string;
  phone?: string;
  role?: 'client' | 'customer';
  skillLevel?: string;
  emergencyContact?: string;
  notes?: string;
}

export async function adminCreatePlayerAction(payload: AdminPlayerInput): Promise<{ success: boolean; error?: string; playerId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    if (!payload.fullName?.trim()) {
      return { success: false, error: 'Full name is required' };
    }

    const cleanEmail = payload.email?.trim().toLowerCase() || null;
    const cleanPhone = payload.phone?.trim() || null;

    if (cleanEmail) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'A player with this email address already exists.' };
      }
    }

    const newId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: newId,
      full_name: payload.fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: payload.role || 'client',
      skill_level: payload.skillLevel?.trim() || '3.0',
      emergency_contact: payload.emergencyContact?.trim() || null,
      notes: payload.notes?.trim() || null,
      is_deleted: false,
    });

    if (insertErr) {
      console.error('[Admin Create Player Error]:', insertErr);
      return { success: false, error: insertErr.message };
    }

    revalidatePath('/admin/players');
    revalidatePath('/admin');
    return { success: true, playerId: newId };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create player profile' };
  }
}

export async function adminUpdatePlayerAction(
  playerId: string,
  payload: AdminPlayerInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.fullName !== undefined) updateData.full_name = payload.fullName.trim();
    if (payload.email !== undefined) updateData.email = payload.email.trim().toLowerCase() || null;
    if (payload.phone !== undefined) updateData.phone = payload.phone.trim() || null;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.skillLevel !== undefined) updateData.skill_level = payload.skillLevel.trim() || '3.0';
    if (payload.emergencyContact !== undefined) updateData.emergency_contact = payload.emergencyContact.trim() || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes.trim() || null;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', playerId);

    if (error) {
      console.error('[Admin Update Player Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/players');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update player profile' };
  }
}

export async function adminSoftDeletePlayerAction(
  playerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const { data, error } = await supabase.rpc('soft_delete_player', {
      p_player_id: playerId,
      p_reason: reason.trim() || 'Archived by Administrator',
    });

    if (error) {
      console.error('[Soft Delete Player RPC Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/players');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to archive player profile' };
  }
}

export async function adminRestorePlayerAction(playerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const { data, error } = await supabase.rpc('restore_player', {
      p_player_id: playerId,
    });

    if (error) {
      console.error('[Restore Player RPC Error]:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/players');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to restore player profile' };
  }
}




