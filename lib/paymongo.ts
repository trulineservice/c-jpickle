import type { PayMongoCheckoutPayload, PayMongoCheckoutResponse } from '@/types/database';

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1/checkout_sessions';

export interface CreateCheckoutParams {
  bookingId: string;
  courtName: string;
  durationHours: number;
  totalPrice: number; // in PHP, e.g. 300 * durationHours
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  dateStr: string;
  timeSlot: string;
  originUrl: string;
}

export async function createPayMongoCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  const rawOrigin = params.originUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const safeOrigin = rawOrigin.replace(/0\.0\.0\.0/g, 'localhost').replace(/\/$/, '');

  const successUrl = `${safeOrigin}/booking/success/${params.bookingId}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${safeOrigin}/book?cancelled=true&booking_id=${params.bookingId}`;

  // If no PayMongo API key is configured, provide an intelligent simulated sandbox session
  if (!secretKey || secretKey.trim() === '' || secretKey === 'your-paymongo-secret-key') {
    console.warn(
      '[PayMongo SDK] PAYMONGO_SECRET_KEY is not set. Providing dynamic sandbox mock session for local testing.'
    );
    
    // Create a mock session ID
    const mockSessionId = `cs_mock_${params.bookingId.replace(/-/g, '').slice(0, 16)}`;
    const mockCheckoutUrl = `${safeOrigin}/booking/success/${params.bookingId}?mock_payment=true&session_id=${mockSessionId}`;

    return {
      checkoutUrl: mockCheckoutUrl,
      sessionId: mockSessionId,
    };
  }

  // PayMongo requires a minimum amount of 100 centavos (₱1.00 PHP)
  const rawCentavos = Math.round(params.totalPrice * 100);
  const amountInCentavos = Math.max(100, rawCentavos);

  const payload: PayMongoCheckoutPayload = {
    data: {
      attributes: {
        billing: {
          name: params.customerName || 'C&J Guest',
          email: params.customerEmail || 'guest@cjcourt.com',
          phone: params.customerPhone || undefined,
        },
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        description: `C&J Court Reservation: ${params.courtName} on ${params.dateStr} at ${params.timeSlot} (${params.durationHours} hr${params.durationHours > 1 ? 's' : ''})`,
        line_items: [
          {
            amount: amountInCentavos,
            currency: 'PHP',
            name: `${params.courtName} - Court Reservation`,
            quantity: 1,
            description: `₱${(amountInCentavos / 100).toFixed(2)} (${params.durationHours} hr session) on ${params.dateStr} @ ${params.timeSlot}`,
          },
        ],
        payment_method_types: ['gcash', 'paymaya', 'card', 'grab_pay', 'dob', 'qrph'],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          booking_id: params.bookingId,
          court_name: params.courtName,
          duration_hours: String(params.durationHours),
          total_price: String(params.totalPrice),
          customer_email: params.customerEmail,
        },
      },
    },
  };

  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

  const response = await fetch(PAYMONGO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayMongo API Error]:', response.status, errorBody);
    let friendlyDetail = `Status ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.errors && Array.isArray(parsed.errors)) {
        friendlyDetail = parsed.errors.map((e: { detail?: string; code?: string }) => e.detail || e.code).join(', ');
      }
    } catch {
      friendlyDetail = errorBody;
    }
    throw new Error(`PayMongo API Error: ${friendlyDetail}`);
  }

  const result = (await response.json()) as PayMongoCheckoutResponse;

  return {
    checkoutUrl: result.data.attributes.checkout_url,
    sessionId: result.data.id,
  };
}

/**
 * Verify PayMongo Webhook signature
 */
export function verifyPayMongoSignature(
  payload: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader || !webhookSecret) return true; // allow bypass if secret not configured

  try {
    const crypto = require('crypto');
    const parts = signatureHeader.split(',');
    let timestamp = '';
    let testSignature = '';
    let liveSignature = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key.trim() === 't') timestamp = value.trim();
      if (key.trim() === 'te') testSignature = value.trim();
      if (key.trim() === 'li') liveSignature = value.trim();
    }

    const signatureToMatch = liveSignature || testSignature;
    if (!signatureToMatch || !timestamp) return false;

    const signaturePayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signatureToMatch),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}
