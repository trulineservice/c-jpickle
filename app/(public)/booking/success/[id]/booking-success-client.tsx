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
  Sparkles,
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

  const isEvent = (() => {
    const name = (booking.courtName || '').toLowerCase();
    const type = (booking.courtType || '').toLowerCase();
    const notes = (booking.notes || '').toLowerCase();
    return (
      name.includes('event') ||
      name.includes('banquet') ||
      name.includes('view deck') ||
      name.includes('lounge') ||
      name.includes('hall') ||
      name.includes('3rd') ||
      name.includes('5th') ||
      type.includes('event') ||
      type.includes('hall') ||
      type.includes('viewdeck') ||
      notes.includes('event:') ||
      notes.includes('deposit') ||
      notes.includes('catering') ||
      notes.includes('inclusions:')
    );
  })();

  const isViewDeck = (booking.courtName || '').toLowerCase().includes('view deck') || (booking.courtName || '').toLowerCase().includes('5th');

  useEffect(() => {
    try {
      confetti({
        particleCount: isEvent ? 90 : 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: isEvent
          ? ['#FFD21C', '#0B2A67', '#d97706', '#007d48', '#bf050b']
          : ['#0B2A67', '#FFD21C', '#bf050b', '#007d48'],
      });
    } catch {
      // ignore
    }

    QRCode.toDataURL(
      JSON.stringify({
        ref: booking.id,
        court: booking.courtName,
        customer: booking.guestName,
        start: booking.startTime,
        type: isEvent ? 'Event Venue Booking' : 'Sports Court Booking',
        system: 'C&J Arena',
      }),
      {
        width: 260,
        margin: 2,
        color: {
          dark: isEvent ? '#0B2A67' : '#0B2A67',
          light: '#ffffff',
        },
      }
    ).then((url) => setQrDataUrl(url));
  }, [booking, isEvent]);

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
      <div className="text-center space-y-3.5 print:hidden">
        {isEvent ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-300 dark:border-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>CELEBRATION VERIFIED • GRAND VENUE RESERVED</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
              YOUR VENUE IS SECURED
            </h1>
            <p className="text-[#64748B] dark:text-[#a1a1aa] text-sm md:text-base max-w-xl mx-auto font-medium">
              An official grand venue booking receipt and event coordinator pass has been issued to{' '}
              <span className="text-[#0B2A67] dark:text-[#FFD21C] font-extrabold">{booking.guestEmail}</span>.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#007d48]/10 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-300 text-xs font-black uppercase tracking-widest border border-[#007d48]/30 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-[#007d48] dark:text-emerald-400" />
              <span>PAYMENT VERIFIED • RESERVATION CONFIRMED</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
              YOU&apos;RE ON THE COURT
            </h1>
            <p className="text-[#64748B] dark:text-[#a1a1aa] text-sm md:text-base max-w-xl mx-auto font-medium">
              An official booking receipt and fast check-in QR pass has been issued to{' '}
              <span className="text-[#0B2A67] dark:text-[#FFD21C] font-extrabold">{booking.guestEmail}</span>.
            </p>
          </>
        )}
      </div>

      {/* Action Buttons Bar - Hidden during Print */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <Button
          onClick={handlePrint}
          className="bg-[#0B2A67] hover:bg-[#123A82] text-white border border-[#FFD21C]/40 shadow-md font-black px-6 h-11 rounded-full flex items-center gap-2 text-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#FFD21C]" /> Print / Save PDF Receipt
        </Button>

        {isEvent ? (
          <Link href="/book-events">
            <Button variant="outline" className="border-[#0B2A67]/20 dark:border-white/20 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 h-11 px-6 rounded-full font-bold text-xs transition-all active:scale-[0.98] cursor-pointer">
              Book Another Event
            </Button>
          </Link>
        ) : (
          <Link href="/book">
            <Button variant="outline" className="border-[#0B2A67]/20 dark:border-white/20 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 h-11 px-6 rounded-full font-bold text-xs transition-all active:scale-[0.98] cursor-pointer">
              Book Another Court
            </Button>
          </Link>
        )}

        <Link href="/dashboard">
          <Button className="bg-[#FFD21C] hover:bg-[#ffe052] text-[#0B2A67] font-black h-11 px-6 rounded-full flex items-center gap-1.5 text-xs transition-all active:scale-[0.98] shadow-xs cursor-pointer">
            View My Portal <ArrowRight className="w-4 h-4 text-[#0B2A67]" />
          </Button>
        </Link>
      </div>

      {/* Printable Ticket & Receipt Card Container */}
      <div className="flex justify-center">
        <Card className={`w-full max-w-2xl border-2 ${
          isEvent ? 'border-amber-400/40 dark:border-amber-500/30' : 'border-[#0B2A67]/20 dark:border-white/15'
        } bg-white dark:bg-[#071E4B]/40 rounded-3xl shadow-xl overflow-hidden print:border-black print:rounded-none print:shadow-none`}>
          
          {/* Ticket Header */}
          {isEvent ? (
            /* EVENTS PLACE & VIEW DECK GRAND BANQUET HEADER */
            <div className="bg-gradient-to-r from-[#071E4B] via-[#0B2A67] to-[#041230] p-6 sm:p-8 text-white flex items-center justify-between border-b-4 border-[#FFD21C] print:bg-none print:text-black print:border-b print:border-[#cacacb] rounded-t-3xl print:rounded-none relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD21C] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFD21C] fill-current" />
                  {isViewDeck ? 'C&J VIEW DECK • OFFICIAL LOUNGE PASS' : 'C&J EVENTS PLACE • OFFICIAL GRAND BANQUET PASS'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">{booking.courtName}</h2>
                <p className="text-xs text-white/80 font-medium">
                  {isViewDeck
                    ? '5th Floor View Deck Lounge • 150-sqm Private Venue (25 Pax Max)'
                    : '3rd Floor Banquet Hall • 500-sqm Full Air-Conditioned Venue (180 Pax Max)'}
                </p>
              </div>
              <div className="text-right space-y-1 relative z-10">
                <span className="text-[11px] font-black uppercase bg-amber-500 text-slate-950 px-3.5 py-1 rounded-full border border-amber-300 shadow-sm inline-block print:border-black print:text-black">
                  {booking.status.toUpperCase()}
                </span>
                <span className="text-xs text-[#FFD21C] font-mono font-bold block">
                  Ref: #{booking.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            /* SPORTS COURT TICKET HEADER */
            <div className="bg-[#0B2A67] dark:bg-[#05183B] p-6 text-white flex items-center justify-between border-b-4 border-[#FFD21C] print:bg-none print:text-black print:border-b print:border-[#cacacb] rounded-t-3xl print:rounded-none">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD21C] block">
                  C&amp;J COURTS • OFFICIAL TICKET PASS
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">{booking.courtName}</h2>
                <p className="text-xs text-white/80 font-medium">Indoor Pro Cushion Arena • Air Conditioned</p>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[11px] font-black uppercase bg-[#007d48] text-white px-3.5 py-1 rounded-full border border-white/20 shadow-sm inline-block print:border-black print:text-black">
                  {booking.status.toUpperCase()}
                </span>
                <span className="text-xs text-[#FFD21C] font-mono font-bold block">
                  Ref: #{booking.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          <CardContent className="p-6 md:p-8 space-y-6 print:p-4">
            
            {/* Key Reservation Metadata Grid */}
            {isEvent ? (
              /* EVENTS PLACE METADATA GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/60 dark:bg-[#030F28] p-5 rounded-2xl border border-amber-200/80 dark:border-white/10">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-[#FFD21C] flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-amber-700 dark:text-[#FFD21C]" /> Event Date
                  </span>
                  <p className="font-extrabold text-foreground text-base">{formattedDate}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-[#FFD21C] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-[#FFD21C]" /> Duration &amp; Time Window
                  </span>
                  <p className="font-extrabold text-foreground text-base">
                    {timeSlotRange} ({booking.durationHours} Hours Banquet Rental)
                  </p>
                </div>

                <div className="space-y-1 pt-3 border-t border-amber-200/60 dark:border-white/10 md:border-t-0 md:pt-0">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-[#FFD21C] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-700 dark:text-[#FFD21C]" /> Venue Level &amp; Access
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {isViewDeck ? '5th Floor View Deck Lounge' : '3rd Floor Banquet Hall'}, 25 Bologna St., Muzon, Taytay, Rizal (Dedicated Elevator Access)
                  </p>
                </div>

                <div className="space-y-1 pt-3 border-t border-amber-200/60 dark:border-white/10 md:border-t-0 md:pt-0">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-[#FFD21C] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-emerald-400" /> Event Host / Organizer
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {booking.guestName} ({booking.guestEmail})
                  </p>
                </div>
              </div>
            ) : (
              /* COURT BOOKING METADATA GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#EDF4FC] dark:bg-[#030F28] p-5 rounded-2xl border border-[#0B2A67]/15 dark:border-white/10">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C]" /> Playing Date
                  </span>
                  <p className="font-extrabold text-foreground text-base">{formattedDate}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C]" /> Session Interval
                  </span>
                  <p className="font-extrabold text-foreground text-base">
                    {timeSlotRange} ({booking.durationHours} hr{booking.durationHours > 1 ? 's' : ''})
                  </p>
                </div>

                <div className="space-y-1 pt-3 border-t border-[#0B2A67]/10 dark:border-white/10 md:border-t-0 md:pt-0">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C]" /> Arena Location
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    Ground Sports Level, 25 Bologna St., Muzon, Taytay, Rizal, 1920
                  </p>
                </div>

                <div className="space-y-1 pt-3 border-t border-[#0B2A67]/10 dark:border-white/10 md:border-t-0 md:pt-0">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-emerald-400" /> Player Contact
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {booking.guestName} ({booking.guestEmail})
                  </p>
                </div>
              </div>
            )}

            {/* Pricing & Deposit Breakdown */}
            <div className={`space-y-2.5 p-5 rounded-2xl border ${
              isEvent
                ? 'bg-[#EDF4FC]/80 dark:bg-[#030F28]/80 border-blue-200 dark:border-white/10'
                : 'bg-[#EDF4FC]/70 dark:bg-[#030F28]/70 border-[#0B2A67]/15 dark:border-white/10'
            }`}>
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>
                  {booking.courtName} &bull; {booking.durationHours} Hours Rental
                </span>
                <span className="font-mono text-[#0B2A67] dark:text-white">
                  ₱{booking.totalPrice.toFixed(2)}
                </span>
              </div>

              {booking.notes && (
                <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-[#0B2A67]/10 text-xs text-[#64748B] dark:text-white/80 space-y-1 font-medium">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C] block">
                    {isEvent ? 'Package Inclusions & Notes:' : 'Booking Notes:'}
                  </span>
                  <p className="leading-relaxed">{booking.notes}</p>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2.5 border-t border-[#0B2A67]/10 dark:border-white/10 text-sm font-black text-[#0B2A67] dark:text-white">
                <span>{isEvent ? 'Amount Paid Today (Online Checkout):' : 'Total Amount Paid:'}</span>
                <span className="text-[#0B2A67] dark:text-[#FFD21C] font-mono text-2xl font-black tracking-tight">
                  ₱{booking.totalPrice.toFixed(2)} {booking.currency}
                </span>
              </div>
            </div>

            {/* Fast Check-In QR Code & Coordination Pass */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white dark:bg-[#071E4B]/60 p-5 rounded-2xl border border-[#0B2A67]/20 dark:border-white/15 shadow-sm">
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] block">
                  {isEvent
                    ? isViewDeck
                      ? '5th Floor Event Coordinator Pass & Access'
                      : '3rd Floor Banquet Coordinator Pass & Access'
                    : 'Reception Check-In Pass'}
                </span>
                <p className="text-xs text-[#64748B] dark:text-white/70 leading-relaxed font-medium">
                  {isEvent
                    ? `Present this digital QR pass to the C&J Event Supervisor upon arrival via the ${
                        isViewDeck ? '5th Floor' : '3rd Floor'
                      } Dedicated Elevator Access. Reference ID: `
                    : 'Present this QR code or mention Reference ID '}
                  <strong className="font-mono text-[#0B2A67] dark:text-[#FFD21C]">
                    #{booking.id.slice(0, 8).toUpperCase()}
                  </strong>.
                </p>
                <div className="text-[11px] text-[#64748B] dark:text-white/60 pt-1 font-semibold">
                  Payment Channel: <span className="capitalize font-black text-[#0B2A67] dark:text-white">{booking.paymentMethod}</span>
                </div>
              </div>

              {qrDataUrl ? (
                <div className="shrink-0 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR Code"
                    className="w-32 h-32 border-2 border-[#0B2A67] dark:border-[#FFD21C] mx-auto p-1 bg-white rounded-xl shadow-xs"
                  />
                  <span className="text-[9px] font-mono font-bold text-[#0B2A67] dark:text-[#FFD21C] uppercase mt-1.5 block tracking-wider">
                    {isEvent ? 'Scan Event Pass' : 'Scan for Check-In'}
                  </span>
                </div>
              ) : (
                <div className="w-32 h-32 bg-[#EDF4FC] dark:bg-[#18181c] rounded-xl flex items-center justify-center text-xs text-[#64748B] font-bold">
                  Loading QR...
                </div>
              )}
            </div>

            {/* Venue Guidelines & Cancellation Terms */}
            {isEvent ? (
              <div className="text-[11px] text-[#64748B] dark:text-white/70 space-y-1 bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 font-medium">
                <p className="font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <span>• Grand Event Venue &amp; Banquet Guidelines:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Caterers &amp; decorators receive complimentary setup access 2 hours prior to scheduled start time.</li>
                  <li>Date lock deposits (50%) guarantee venue hold and are subject to 14-day cancellation terms.</li>
                  <li>Sound system decibel compliance strictly observed after 10:00 PM per municipal ordinances.</li>
                </ul>
              </div>
            ) : (
              <div className="text-[11px] text-[#64748B] dark:text-white/70 space-y-1 bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 font-medium">
                <p className="font-extrabold text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1">
                  <span>• 2-Day Refund &amp; Match Reschedule Policy:</span>
                </p>
                <p>
                  Sessions may be cancelled for a full refund if requested at least 2 days (48 hours) prior to session start. Within 2 days, you can reschedule your session anytime from your player dashboard. Non-marking court shoes are strictly required.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-[#64748B] dark:text-white/60 pt-2 border-t border-[#0B2A67]/10 dark:border-white/10 font-medium">
              <p>
                {isEvent
                  ? 'Thank you for celebrating with C&J Events Place & View Deck. Elevate your memories.'
                  : 'Thank you for choosing C&J Pickleball Arena. Play at your peak.'}
              </p>
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
