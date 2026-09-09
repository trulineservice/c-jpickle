'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Printer,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export interface BookingDisplayData {
  id: string;
  courtName: string;
  courtType: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentMethod: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string | null;
  createdAt: string;
}

export default function BookingSuccessClient({ booking }: { booking: BookingDisplayData }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#111111', '#007d48', '#cacacb', '#f5f5f5'],
      });
    } catch {
      // ignore
    }

    QRCode.toDataURL(
      JSON.stringify({
        ref: booking.id,
        court: booking.courtName,
        player: booking.guestName,
        start: booking.startTime,
        system: 'C&J Arena',
      }),
      {
        width: 260,
        margin: 2,
        color: {
          dark: '#111111',
          light: '#ffffff',
        },
      }
    ).then((url) => setQrDataUrl(url));
  }, [booking]);

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const formattedDate = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(startDate);

  const formatTime = (d: Date) =>
    new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit' }).format(d);

  const timeSlotRange = `${formatTime(startDate)} – ${formatTime(endDate)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-16 space-y-8 font-sans text-foreground bg-background">
      
      {/* Header Banner - Hidden during Print */}
      <div className="text-center space-y-3 print:hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] text-xs font-bold border border-[#007d48]/30">
          <CheckCircle2 className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
          <span>PAYMENT VERIFIED • RESERVATION CONFIRMED</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-display uppercase tracking-tight text-foreground">
          YOU&apos;RE ON THE COURT
        </h1>
        <p className="text-[#707072] dark:text-[#a1a1aa] text-sm md:text-base max-w-xl mx-auto">
          An official booking receipt and fast check-in QR pass has been issued to{' '}
          <span className="text-foreground font-semibold">{booking.guestEmail}</span>.
        </p>
      </div>

      {/* Action Buttons Bar - Hidden during Print */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <Button
          onClick={handlePrint}
          className="bg-[#111111] hover:bg-[#222222] text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-semibold px-6 h-11 rounded-full flex items-center gap-2 text-xs transition-colors"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF Receipt
        </Button>
        <Link href="/book">
          <Button variant="outline" className="border-[#cacacb] dark:border-[#27272a] text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] h-11 rounded-full font-semibold text-xs">
            Book Another Court
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" className="text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] h-11 rounded-full font-semibold text-xs flex items-center gap-1.5">
            View My Portal <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Printable Ticket & Receipt Card Container */}
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] rounded-none shadow-none overflow-hidden print:border-black">
          
          {/* Ticket Top Athletic Header */}
          <div className="bg-[#111111] dark:bg-[#0c0c0e] p-6 text-white flex items-center justify-between print:bg-none print:text-black print:border-b print:border-[#cacacb]">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#cacacb] dark:text-[#707072] block">
                C&amp;J COURTS • OFFICIAL TICKET PASS
              </span>
              <h2 className="text-2xl font-bold uppercase tracking-tight">{booking.courtName}</h2>
              <p className="text-xs text-[#cacacb] dark:text-[#a1a1aa]">Indoor Pro Cushion Arena • Air Conditioned</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase bg-white/20 text-white px-3 py-1 rounded-full border border-white/30 block print:border-black print:text-black">
                {booking.status.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#cacacb] dark:text-[#a1a1aa] font-mono block mt-1">
                Ref: #{booking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-6 print:p-4">
            
            {/* Key Reservation Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f5f5f5] dark:bg-[#18181c] p-5 border border-[#cacacb] dark:border-[#27272a]">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-foreground" /> Playing Date
                </span>
                <p className="font-bold text-foreground text-base">{formattedDate}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-foreground" /> Session Interval
                </span>
                <p className="font-bold text-foreground text-base">
                  {timeSlotRange} ({booking.durationHours} hr{booking.durationHours > 1 ? 's' : ''})
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-[#cacacb] dark:border-[#27272a] md:border-t-0 md:pt-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-foreground" /> Arena Location
                </span>
                <p className="text-xs font-semibold text-foreground">
                  C&amp;J Court, Tomas Morato, Quezon City
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-[#cacacb] dark:border-[#27272a] md:border-t-0 md:pt-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007d48] dark:text-[#10b981]" /> Player Contact
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {booking.guestName} ({booking.guestEmail})
                </p>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-2 bg-[#f5f5f5] dark:bg-[#18181c] p-4 border border-[#cacacb] dark:border-[#27272a]">
              <div className="flex justify-between text-xs text-[#707072] dark:text-[#a1a1aa]">
                <span>
                  {booking.courtName} ({booking.durationHours} hr{booking.durationHours > 1 ? 's' : ''})
                </span>
                <span className="font-bold text-foreground">
                  ₱{booking.totalPrice.toFixed(2)}
                </span>
              </div>

              {booking.notes && (
                <div className="flex justify-between text-xs text-[#707072] dark:text-[#a1a1aa]">
                  <span>{booking.notes}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-[#cacacb] dark:border-[#27272a]">
                <span>Total Amount Paid</span>
                <span className="text-foreground font-display text-2xl tracking-tight">
                  ₱{booking.totalPrice.toFixed(2)} {booking.currency}
                </span>
              </div>
            </div>

            {/* Fast Check-In QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-[#141418] p-5 border border-[#cacacb] dark:border-[#27272a]">
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Reception Check-In Pass
                </span>
                <p className="text-xs text-[#707072] dark:text-[#a1a1aa] leading-relaxed">
                  Present this QR code or mention Reference ID{' '}
                  <strong className="font-mono text-foreground">
                    #{booking.id.slice(0, 8).toUpperCase()}
                  </strong>{' '}
                  at the C&amp;J Court reception desk upon arrival.
                </p>
                <div className="text-[11px] text-[#707072] dark:text-[#a1a1aa] pt-1">
                  Payment Channel: <span className="capitalize font-bold text-foreground">{booking.paymentMethod}</span>
                </div>
              </div>

              {qrDataUrl ? (
                <div className="shrink-0 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR Code"
                    className="w-32 h-32 border border-[#cacacb] dark:border-[#27272a] mx-auto p-1 bg-white"
                  />
                  <span className="text-[9px] font-mono text-[#707072] dark:text-[#a1a1aa] uppercase mt-1 block">
                    Scan for check-in
                  </span>
                </div>
              ) : (
                <div className="w-32 h-32 bg-[#f5f5f5] dark:bg-[#18181c] flex items-center justify-center text-xs text-[#707072] dark:text-[#a1a1aa]">
                  Loading QR...
                </div>
              )}
            </div>

            {/* Venue Rules & Cancellation Policy */}
            <div className="text-[11px] text-[#707072] dark:text-[#a1a1aa] space-y-1 bg-[#f5f5f5] dark:bg-[#18181c] p-4 border border-[#cacacb] dark:border-[#27272a]">
              <p className="font-bold text-[#d30005]">
                • 24-Hour Reschedule &amp; Cancellation Policy:
              </p>
              <p>
                Sessions may be cancelled for a refund only if requested at least 24 hours prior to
                session start. Non-marking court shoes are strictly required inside the arena.
              </p>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-[#707072] dark:text-[#a1a1aa] pt-2 border-t border-[#cacacb] dark:border-[#27272a]">
              <p>Thank you for choosing C&amp;J Pickleball Arena. Play at your peak.</p>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, header, footer, button, .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: auto;
          }
        }
      `}</style>

    </div>
  );
}
