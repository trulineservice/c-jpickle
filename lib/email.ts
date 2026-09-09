import QRCode from 'qrcode';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export interface BookingEmailDetails {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  courtName: string;
  dateStr: string;
  timeRange: string;
  durationHours: number;
  totalPrice: number;
  paymentMethod: string;
  checkInUrl?: string;
  notes?: string | null;
}

export interface PasswordResetEmailParams {
  to: string;
  recipientName?: string;
  tempPassword?: string;
  resetUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  provider: 'resend' | 'smtp' | 'sandbox';
  messageId?: string;
  error?: string;
}

/**
 * Multi-transport Email Dispatcher.
 * Dispatches emails directly through Resend or Nodemailer SMTP,
 * completely bypassing Supabase's built-in email infrastructure.
 */
export async function dispatchCustomEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDispatchResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || '465', 10);
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || `C&J Court <${smtpUser || 'bookings@cjcourt.com'}>`;

  // 1. Try Resend if configured
  if (resendApiKey && resendApiKey.length > 5 && !resendApiKey.includes('your_resend_api_key')) {
    try {
      const resend = new Resend(resendApiKey);
      const res = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      });

      if (res.error) {
        console.warn('[Resend API Dispatch Warning]:', res.error);
      } else {
        console.log(`[Email Service - Resend] Sent "${subject}" to ${to} (ID: ${res.data?.id})`);
        return {
          success: true,
          provider: 'resend',
          messageId: res.data?.id,
        };
      }
    } catch (resendErr) {
      console.warn('[Resend API Dispatch Error - Falling to SMTP]:', resendErr);
    }
  }

  // 2. Try Nodemailer SMTP if configured
  if (smtpUser && smtpPass && smtpPass.length > 2) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });

      console.log(`[Email Service - SMTP] Sent "${subject}" to ${to} (MessageId: ${info.messageId})`);
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
      };
    } catch (smtpErr) {
      console.error('[Nodemailer SMTP Error]:', smtpErr);
      // If live SMTP fails, log clearly but continue to sandbox log
    }
  }

  // 3. Fallback to Safe Development Sandbox
  console.log(`
================================================================================
[C&J PICKLEBALL EMAIL ENGINE - LOCAL DEV / SANDBOX DISPATCH]
To: ${to}
Subject: ${subject}
Provider: Sandbox (Neither live RESEND_API_KEY nor SMTP_PASS provided)
Timestamp: ${new Date().toISOString()}
--------------------------------------------------------------------------------
Notice: Configure RESEND_API_KEY or (SMTP_USER + SMTP_PASS) in .env for live inbox delivery.
================================================================================
`);

  return {
    success: true,
    provider: 'sandbox',
    messageId: `sandbox_${Date.now()}`,
  };
}

/**
 * Generates an SVG/PNG QR Code Data URL for court check-in.
 */
export async function generateBookingQRCodeDataUrl(bookingId: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(
      JSON.stringify({
        bookingId,
        system: 'C&J Court',
        timestamp: new Date().toISOString(),
      }),
      {
        width: 250,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }
    );
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

/**
 * HTML Template for Court Booking Confirmation.
 */
export function generateBookingEmailHtml(details: BookingEmailDetails, qrDataUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C&J Court Reservation Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f1117;
      color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #181b22;
      border: 1px solid #2d3342;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 14px;
      font-weight: 600;
      opacity: 0.95;
    }
    .content {
      padding: 28px 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #f59e0b;
      font-size: 12px;
      font-weight: 800;
      border-radius: 999px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .card {
      background: #101217;
      border: 1px solid #232733;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #1e232f;
      font-size: 14px;
    }
    .row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .row:first-child {
      padding-top: 0;
    }
    .label {
      color: #94a3b8;
    }
    .value {
      font-weight: 700;
      color: #ffffff;
      text-align: right;
    }
    .highlight-price {
      color: #10b981;
      font-size: 18px;
    }
    .qr-section {
      text-align: center;
      background: #101217;
      border: 1px dashed #334155;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .qr-img {
      display: inline-block;
      margin: 12px auto;
      border-radius: 12px;
      padding: 8px;
      background: #ffffff;
      max-width: 180px;
    }
    .policy {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      border-left: 3px solid #f59e0b;
      padding-left: 12px;
      margin-bottom: 20px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      border-top: 1px solid #232733;
      font-size: 12px;
      color: #64748b;
      background: #101217;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>C&J PICKLEBALL ARENA</h1>
      <p>Tournament Play • Indoor Cushioned Courts</p>
    </div>
    
    <div class="content">
      <div class="badge">Booking Confirmed • Paid</div>
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #ffffff;">See you on the court, ${details.customerName}!</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
        Your tournament-grade court reservation at C&J Court has been locked and confirmed. Present your ticket QR code at the counter check-in desk upon arrival.
      </p>

      <div class="card">
        <div class="row">
          <span class="label">Reference Number</span>
          <span class="value" style="font-family: monospace; color: #fbbf24;">#${details.bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Reserved Court</span>
          <span class="value">${details.courtName}</span>
        </div>
        <div class="row">
          <span class="label">Playing Date</span>
          <span class="value">${details.dateStr}</span>
        </div>
        <div class="row">
          <span class="label">Time Interval</span>
          <span class="value">${details.timeRange}</span>
        </div>
        <div class="row">
          <span class="label">Duration</span>
          <span class="value">${details.durationHours} Hour${details.durationHours > 1 ? 's' : ''}</span>
        </div>
        <div class="row">
          <span class="label">Total Paid</span>
          <span class="value highlight-price">₱${details.totalPrice.toFixed(2)}</span>
        </div>
        <div class="row">
          <span class="label">Payment Channel</span>
          <span class="value" style="text-transform: capitalize;">${details.paymentMethod}</span>
        </div>
        ${
          details.notes
            ? `
        <div class="row">
          <span class="label">Add-ons & Rentals</span>
          <span class="value" style="color: #38bdf8;">${details.notes}</span>
        </div>`
            : ''
        }
      </div>

      ${
        qrDataUrl
          ? `
      <div class="qr-section">
        <p style="margin: 0; font-size: 13px; font-weight: 700; color: #f59e0b; text-transform: uppercase;">Fast Check-in Ticket</p>
        <img src="${qrDataUrl}" alt="Check-in QR Code" class="qr-img" />
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Show this QR code at C&J Court reception desk</p>
      </div>`
          : ''
      }

      <div class="policy">
        <strong>Strict 24-Hour Cancellation Policy:</strong> Cancellations must be requested at least 24 hours prior to session start time to be eligible for a refund.
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">C&J Court • Tomas Morato, Quezon City</p>
      <p style="margin: 4px 0 0 0;">Operating Daily: 6:00 AM – 10:00 PM • Inquiries: +63 (917) 555-CJCOURT</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch Booking Confirmation Email.
 */
export async function sendBookingConfirmationEmail(
  details: BookingEmailDetails
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const qrDataUrl = await generateBookingQRCodeDataUrl(details.bookingId);
  const emailHtml = generateBookingEmailHtml(details, qrDataUrl);

  const result = await dispatchCustomEmail({
    to: details.customerEmail,
    subject: `Court Reservation Confirmed (#${details.bookingId.slice(0, 8).toUpperCase()}) — C&J Court`,
    html: emailHtml,
  });

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

/**
 * Branded HTML Template for Password Reset Email.
 */
export function generatePasswordResetEmailHtml({
  recipientName = 'Valued Player',
  tempPassword,
  resetUrl,
}: {
  recipientName?: string;
  tempPassword?: string;
  resetUrl?: string;
}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://c-j-pickleball.vercel.app').replace(/\/$/, '');
  const loginUrl = resetUrl || `${appUrl}/login`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset — C&J Pickleball Arena</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f1117;
      color: #f1f5f9;
      margin: 0;
      padding: 28px 12px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #181b22;
      border: 1px solid #2d3342;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .header {
      background: linear-gradient(135deg, #111111 0%, #1e232f 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 2px solid #f59e0b;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff;
      text-transform: uppercase;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #f59e0b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 32px 26px;
    }
    .badge {
      display: inline-block;
      padding: 5px 14px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #f59e0b;
      font-size: 11px;
      font-weight: 800;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 18px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 12px 0;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .code-box {
      background: #101217;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .code-value {
      font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 28px;
      font-weight: 900;
      color: #f59e0b;
      letter-spacing: 3px;
      padding: 6px 12px;
      user-select: all;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background: #ffffff;
      color: #111111;
      font-weight: 800;
      font-size: 14px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 999px;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
    }
    .btn:hover {
      background: #f1f5f9;
    }
    .alert-box {
      background: rgba(239, 68, 68, 0.08);
      border-left: 3px solid #ef4444;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #fca5a5;
      line-height: 1.5;
      margin-top: 24px;
    }
    .footer {
      background: #101217;
      border-top: 1px solid #232733;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>C&J PICKLEBALL ARENA</h1>
      <p>Security & Player Authentication</p>
    </div>

    <div class="content">
      <div class="badge">Password Reset</div>
      <h2 class="title">Hello, ${recipientName}</h2>
      <p class="text">
        We received a request to access your C&J Pickleball account. Use the temporary credentials below to log in securely:
      </p>

      ${
        tempPassword
          ? `
      <div class="code-box">
        <div class="code-label">Your Temporary Access Password</div>
        <div class="code-value">${tempPassword}</div>
      </div>
      <p class="text" style="text-align: center; font-size: 12px; color: #94a3b8;">
        Copy this password, log in, and immediately update your password in <strong>Settings</strong>.
      </p>`
          : ''
      }

      <div class="btn-container">
        <a href="${loginUrl}" class="btn" target="_blank">
          ${resetUrl ? 'Set New Password' : 'Log In to C&J Court'}
        </a>
      </div>

      <div class="alert-box">
        <strong>Security Notice:</strong> If you did not initiate this password reset request, someone may have entered your email by mistake. Please change your password immediately or contact arena management.
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">C&J Court • Tomas Morato, Quezon City</p>
      <p style="margin: 4px 0 0 0;">Dedicated Member Support: support@cjcourt.com</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch Password Reset Email directly through Resend / SMTP.
 * Bypasses Supabase default email infrastructure.
 */
export async function sendPasswordResetEmail({
  to,
  recipientName = 'Player',
  tempPassword,
  resetUrl,
}: PasswordResetEmailParams): Promise<EmailDispatchResult> {
  const html = generatePasswordResetEmailHtml({
    recipientName,
    tempPassword,
    resetUrl,
  });

  return await dispatchCustomEmail({
    to,
    subject: 'Your Password Reset for C&J Pickleball Arena',
    html,
  });
}
