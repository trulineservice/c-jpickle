'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import type { AvailabilitySlot, Court } from '@/types/database';
import { CourtSelector } from '@/components/booking/court-selector';
import { TimeSlotGrid } from '@/components/booking/time-slot-grid';
import { BookingSummaryCard } from '@/components/booking/booking-summary-card';
import {
  AlertCircle,
  Lock,
  Sparkles,
  CalendarDays,
  Clock,
  Trophy,
  ArrowRight,
  Flame,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { playHapticSound } from '@/lib/motion-feedback';

interface DaySummary {
  date: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  status: 'available' | 'almost_full' | 'fully_booked' | 'past';
}

const DEFAULT_COURTS: Court[] = [
  {
    id: '80d4920a-34d9-47f3-8f1b-4627f5b289de',
    name: 'Court 1 — Indoor (Pro Cushion)',
    type: 'indoor',
    hourly_rate: 350,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '052becb1-e01d-4cd9-88ae-3d6e419259fd',
    name: 'Court 2 — Indoor (Pickleball / Basketball)',
    type: 'indoor',
    hourly_rate: 350,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export default function BookPage() {
  const [courts, setCourts] = useState<Court[]>(DEFAULT_COURTS);
  const [selectedCourt, setSelectedCourt] = useState<Court>(DEFAULT_COURTS[0]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Multi-slot selection state
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);

  // Derived duration & start slot
  const durationHours = Math.max(1, selectedSlots.length);
  const selectedSlot = selectedSlots.length > 0 ? selectedSlots[0] : null;

  // Form & Auth State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paddleCount, setPaddleCount] = useState<number>(0);
  const [ballThrowerRental, setBallThrowerRental] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Slots & Availability
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [monthOverview, setMonthOverview] = useState<Record<string, DaySummary>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');

  useEffect(() => {
    async function loadInitialData() {
      const supabase = createClient();
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) setGuestName(profile.full_name);
          else if (user.user_metadata?.full_name) setGuestName(user.user_metadata.full_name);
          if (user.email) setGuestEmail(user.email);
          if (profile?.phone) setGuestPhone(profile.phone);
        } else {
          setIsAuthenticated(false);
        }
      } catch (authErr) {
        console.warn('Auth check error:', authErr);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }

      const { data: dbCourts } = await supabase
        .from('courts')
        .select('*')
        .order('name', { ascending: true });

      if (dbCourts && dbCourts.length > 0) {
        const activeCourts = dbCourts
          .filter((c: any) => {
            if (c.is_active === false || c.status === 'inactive') return false;
            const nameLower = (c.name || '').toLowerCase();
            // Exclude private venue rentals (Events Place Banquet Hall & View Deck Lounge) from court booking
            if (
              nameLower.includes('events place') ||
              nameLower.includes('view deck') ||
              nameLower.includes('banquet') ||
              nameLower.includes('lounge') ||
              nameLower.includes('3rd flr') ||
              nameLower.includes('5th flr')
            ) {
              return false;
            }
            return true;
          })
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type || (c.name?.toLowerCase().includes('outdoor') ? 'outdoor' : 'indoor'),
            hourly_rate:
              c.hourly_rate !== undefined && c.hourly_rate !== null ? Number(c.hourly_rate) : 350,
            is_active: c.is_active ?? true,
            created_at: c.created_at || new Date().toISOString(),
          }));

        if (activeCourts.length > 0) {
          setCourts(activeCourts);
          setSelectedCourt(activeCourts[0]);
        }
      }
    }
    loadInitialData();
  }, []);

  const formatDateToYMD = (d?: Date) => {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const rawDateStr = formatDateToYMD(selectedDate);

  const fetchAvailability = useCallback(async () => {
    if (!rawDateStr || !selectedCourt?.id) return;

    setIsLoadingSlots(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/availability?courtId=${selectedCourt.id}&date=${rawDateStr}&durationHours=1`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Could not fetch slot availability.');

      const data = await res.json();
      const loadedSlots: AvailabilitySlot[] = data.slots || [];
      setSlots(loadedSlots);

      if (data.monthOverview) {
        setMonthOverview((prev) => ({ ...prev, ...data.monthOverview }));
      }

      // Preserve only still-available slots in selection
      setSelectedSlots((prev) => {
        if (prev.length === 0) return [];
        return prev.filter((p) =>
          loadedSlots.some((s) => s.hour24 === p.hour24 && s.available)
        );
      });
    } catch (err: unknown) {
      console.error('Failed to load availability:', err);
      setErrorMessage('Unable to connect to availability service. Please try again.');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [rawDateStr, selectedCourt?.id]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Refresh entire month density whenever visible month or selected court changes
  useEffect(() => {
    if (!selectedCourt?.id) return;
    const yearNum = visibleMonth.getFullYear();
    const monthNum = String(visibleMonth.getMonth() + 1).padStart(2, '0');
    const monthStr = `${yearNum}-${monthNum}`;

    fetch(`/api/availability?courtId=${selectedCourt.id}&month=${monthStr}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.monthOverview) {
          setMonthOverview((prev) => ({ ...prev, ...data.monthOverview }));
        }
      })
      .catch((err) => console.warn('Failed to load month overview for court switch:', err));
  }, [selectedCourt?.id, visibleMonth]);

  // Auto-cancel and release hold if redirected back from PayMongo with cancelled=true
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const isCancelled = params.get('cancelled') === 'true';
    const cancelledBookingId = params.get('booking_id');

    if (isCancelled) {
      if (cancelledBookingId) {
        fetch('/api/checkout/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: cancelledBookingId }),
        })
          .then((r) => r.json())
          .then(() => {
            fetchAvailability();
          })
          .catch((err) => console.warn('[Cancel] Failed to release hold:', err));
      }
      setInfoMessage('Checkout was cancelled. Your temporary reservation hold has been released and the time slot is immediately available.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchAvailability]);

  const handleMonthChange = useCallback(
    async (newMonth: Date) => {
      playHapticSound('tap');
      setVisibleMonth(newMonth);
      if (!selectedCourt?.id) return;

      const yearNum = newMonth.getFullYear();
      const monthNum = String(newMonth.getMonth() + 1).padStart(2, '0');
      const monthStr = `${yearNum}-${monthNum}`;

      try {
        const res = await fetch(`/api/availability?courtId=${selectedCourt.id}&month=${monthStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.monthOverview) {
            setMonthOverview((prev) => ({ ...prev, ...data.monthOverview }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch month overview:', err);
      }
    },
    [selectedCourt?.id]
  );

  const calendarModifiers = useMemo(() => {
    const almostFullDates: Date[] = [];
    const fullyBookedDates: Date[] = [];

    Object.entries(monthOverview).forEach(([dateStr, summary]) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (summary.status === 'almost_full') almostFullDates.push(dateObj);
      if (summary.status === 'fully_booked') fullyBookedDates.push(dateObj);
    });

    return { almostFull: almostFullDates, fullyBooked: fullyBookedDates };
  }, [monthOverview]);

  const hourlyRate = selectedCourt?.hourly_rate ?? 350;
  const courtSubtotal = hourlyRate * durationHours;
  const paddleFee = paddleCount * 110;
  const ballThrowerFee = ballThrowerRental ? 350 * durationHours : 0;
  const grandTotal = courtSubtotal + paddleFee + ballThrowerFee;

  const filteredSlots = useMemo(() => {
    if (timeFilter === 'all') return slots;
    if (timeFilter === 'morning') return slots.filter((s) => s.hour24 >= 6 && s.hour24 < 12);
    if (timeFilter === 'afternoon') return slots.filter((s) => s.hour24 >= 12 && s.hour24 < 17);
    if (timeFilter === 'night') return slots.filter((s) => s.hour24 >= 17 && s.hour24 < 24);
    return slots;
  }, [slots, timeFilter]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      playHapticSound('error');
      return;
    }
    playHapticSound('tap');
    setSelectedDate(date);
    setSelectedSlots([]);
  };

  // Helper: Find next date that has open slots
  const findNextAvailableDate = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const ymd = formatDateToYMD(d);
      const summary = monthOverview[ymd];
      if (!summary || summary.status === 'available' || summary.status === 'almost_full') {
        return d;
      }
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }, [monthOverview]);

  const handleJumpNextAvailable = () => {
    playHapticSound('tap');
    const nextDate = findNextAvailableDate();
    setSelectedDate(nextDate);
    setVisibleMonth(nextDate);
    setSelectedSlots([]);
  };

  const otherCourt = useMemo(() => {
    return courts.find((c) => c.id !== selectedCourt?.id);
  }, [courts, selectedCourt?.id]);

  const handleSwitchToOtherCourt = () => {
    if (!otherCourt) return;
    playHapticSound('tap');
    setSelectedCourt(otherCourt);
    setSelectedSlots([]);
  };

  const handleInitiateCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent('/book')}`;
      return;
    }
    if (selectedSlots.length === 0 || !selectedSlot) {
      setErrorMessage('Please select one or more available time slots from the schedule below.');
      return;
    }
    if (!guestName.trim() || !guestEmail.trim()) {
      setErrorMessage('Your account name or email is missing. Please update your profile.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/checkout/paymongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          date: rawDateStr,
          timeSlot: selectedSlot.time,
          hour24: selectedSlot.hour24,
          durationHours: selectedSlots.length,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim() || undefined,
          paddleCount,
          paddleRental: paddleCount > 0,
          ballThrowerRental,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize PayMongo checkout.');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Checkout session URL was not returned.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDisplayDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No Date Selected';

  const todayDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const tomorrowDate = useMemo(() => {
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(todayDate.getDate() + 1);
    return tomorrow;
  }, [todayDate]);

  const todaySummary = monthOverview[formatDateToYMD(todayDate)];
  const tomorrowSummary = monthOverview[formatDateToYMD(tomorrowDate)];

  const selectedDateSummary = rawDateStr ? monthOverview[rawDateStr] : null;
  const isSelectedDateFullyBooked = selectedDateSummary?.status === 'fully_booked';
  const isSelectedDateAlmostFull = selectedDateSummary?.status === 'almost_full';

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 md:py-12 font-sans bg-[#F5F7FA] text-[#102A56]">
      {/* Header Bar */}
      <div className="border-b border-[#E2E8F0] pb-6 mb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FFD21C]" />
            <span>Live Court Reservation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Select Court &amp; Schedule
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold text-[#64748B]">
          <span className="text-[#0B2A67] font-extrabold">₱350 / hr Flat Rate</span>
          <span>•</span>
          <span>PayMongo Instant Lock</span>
          <span>•</span>
          <span className="text-[#007d48]">2-Day Refund &amp; Reschedule Guarantee</span>
        </div>
      </div>

      {/* Events Place & View Deck Banner Link */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-200 fill-current" />
          </div>
          <div>
            <strong className="text-amber-950 dark:text-amber-200 block font-extrabold text-sm">
              Planning a Wedding, Birthday, Debut or Private Party?
            </strong>
            <span className="text-amber-800 dark:text-amber-300">
              Book our 3rd Floor Banquet Hall (180 Pax) or 5th Floor View Deck Private Lounge (25 Pax) on our dedicated Venue Rental page.
            </span>
          </div>
        </div>
        <Link href="/book-events">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white text-xs px-5 font-bold h-10 rounded-xl shrink-0 cursor-pointer shadow-sm">
            <span>🎉 Reserve Events Place &amp; Lounge</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Account Required Banner */}
      {!isAuthLoading && !isAuthenticated && (
        <div className="p-4 sm:p-5 bg-[#EDF4FC] border border-[#E2E8F0] rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0B2A67] text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-[#0B2A67] block font-extrabold text-sm">
                Account Required to Reserve
              </strong>
              <span className="text-[#64748B]">
                Please sign in or create an account to secure your court reservation and receive digital QR passes.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/login?next=/book">
              <Button size="sm" variant="yellow" className="text-xs px-5 font-bold h-9 cursor-pointer">
                Sign In
              </Button>
            </Link>
            <Link href="/signup?next=/book">
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-4 font-bold h-9 bg-white border-[#E2E8F0] text-[#0B2A67] cursor-pointer"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Info / Cancellation Alert */}
      {infoMessage && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs mb-8 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{infoMessage}</span>
          </div>
          <button
            onClick={() => setInfoMessage(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-[#d30005]/20 bg-[#d30005]/5 text-[#d30005] text-xs mb-8 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Court Selection, Calendar, Slots */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Court Selection & Surface Specification */}
          <div className="border border-[#E2E8F0] p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-sm">
            <CourtSelector
              courts={courts}
              selectedCourt={selectedCourt}
              onSelectCourt={(c) => {
                setSelectedCourt(c);
                setSelectedSlots([]);
              }}
            />
          </div>

          {/* Step 2: Enhanced Athletic Calendar Card */}
          <div className="border border-[#E2E8F0] p-6 sm:p-8 space-y-5 rounded-2xl sm:rounded-3xl bg-white shadow-sm">
            {/* Header: Label & Quick Shortcuts */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#E2E8F0] pb-4 gap-3">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#FFD21C]" />
                  <span>2. Select Match Date</span>
                </label>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-[#0B2A67]">
                    {formattedDisplayDate}
                  </span>
                  {isSelectedDateFullyBooked && (
                    <span className="px-2 py-0.5 rounded-full bg-[#bf050b] text-white text-[9px] font-black uppercase tracking-wider">
                      Fully Scheduled
                    </span>
                  )}
                  {isSelectedDateAlmostFull && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider">
                      Filling Fast
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Date Shortcut Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    playHapticSound('tap');
                    setSelectedDate(todayDate);
                    setVisibleMonth(todayDate);
                    setSelectedSlots([]);
                  }}
                  className={`text-xs px-3 rounded-full border transition-all cursor-pointer active:scale-95 ${
                    formatDateToYMD(selectedDate) === formatDateToYMD(todayDate)
                      ? 'border-[#0B2A67] bg-[#0B2A67] text-white shadow-xs'
                      : 'border-[#E2E8F0] text-[#0B2A67] hover:bg-[#EDF4FC]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      todaySummary?.status === 'fully_booked'
                        ? 'bg-[#bf050b]'
                        : todaySummary?.status === 'almost_full'
                        ? 'bg-amber-500'
                        : 'bg-[#007d48]'
                    }`}
                  />
                  <span>Today</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    playHapticSound('tap');
                    setSelectedDate(tomorrowDate);
                    setVisibleMonth(tomorrowDate);
                    setSelectedSlots([]);
                  }}
                  className={`text-xs px-3 rounded-full border transition-all cursor-pointer active:scale-95 ${
                    formatDateToYMD(selectedDate) === formatDateToYMD(tomorrowDate)
                      ? 'border-[#0B2A67] bg-[#0B2A67] text-white shadow-xs'
                      : 'border-[#E2E8F0] text-[#0B2A67] hover:bg-[#EDF4FC]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      tomorrowSummary?.status === 'fully_booked'
                        ? 'bg-[#bf050b]'
                        : tomorrowSummary?.status === 'almost_full'
                        ? 'bg-amber-500'
                        : 'bg-[#007d48]'
                    }`}
                  />
                  <span>Tomorrow</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleJumpNextAvailable}
                  className="text-xs px-3 rounded-full border-[#E2E8F0] text-[#0B2A67] hover:bg-[#EDF4FC] hover:border-[#0B2A67] transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3 h-3 text-[#FFD21C] mr-1" />
                  <span>Next Open Date</span>
                </Button>
              </div>
            </div>

            {/* Selected Date Real-Time Status Notification Banner */}
            {isSelectedDateFullyBooked ? (
              <div className="p-4 rounded-2xl bg-[#bf050b]/8 border border-[#bf050b]/25 text-[#bf050b] space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#bf050b] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-tight text-[#bf050b]">
                        Fully Scheduled on {formattedDisplayDate}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#bf050b] text-white text-[9px] font-black uppercase tracking-wider">
                        0 Slots Open
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      All 18 court hours (6:00 AM – 12:00 AM) on {selectedCourt.name} are reserved. Switch courts or jump to the next available date below.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#bf050b]/15">
                  {otherCourt && (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={handleSwitchToOtherCourt}
                      className="text-xs font-bold bg-white text-[#0B2A67] border-[#0B2A67]/30 hover:bg-[#EDF4FC] rounded-full px-3.5 py-1.5 active:scale-95 cursor-pointer"
                    >
                      <span>Check {otherCourt.name.includes('1') ? 'Court 1' : 'Court 2'}</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="xs"
                    variant="yellow"
                    onClick={handleJumpNextAvailable}
                    className="text-xs font-black rounded-full px-3.5 py-1.5 active:scale-95 shadow-xs cursor-pointer"
                  >
                    <span>Jump to Next Open Date</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ) : isSelectedDateAlmostFull ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                  <div>
                    <span className="font-extrabold block text-amber-900">
                      High Demand Date &bull; Limited Slots Remaining
                    </span>
                    <span className="text-amber-800/80 text-[11px]">
                      Hours for {formattedDisplayDate} are filling fast. Book your consecutive slots now.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-black text-[10px] uppercase tracking-wider shrink-0">
                  Few Slots Left
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[#007d48]/5 border border-[#007d48]/20 text-[#007d48] flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#007d48] shrink-0" />
                  <span className="font-bold text-[#0B2A67]">
                    Open Court Availability &bull; Prime hours available on {formattedDisplayDate}.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#007d48]/15 text-[#007d48] font-bold text-[10px] uppercase tracking-wider shrink-0">
                  Open
                </span>
              </div>
            )}

            {/* Interactive Athletic Calendar Grid */}
            <div className="pt-1">
              <Calendar
                mode="single"
                month={visibleMonth}
                onMonthChange={handleMonthChange}
                selected={selectedDate}
                modifiers={calendarModifiers}
                onSelect={handleDateSelect}
                className="w-full text-[#102A56]"
                disabled={(d) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return d < today;
                }}
              />
            </div>

            {/* Clear Athletic Calendar Legend */}
            <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B] font-semibold">
              <span className="text-[10px] uppercase tracking-wider font-black text-[#0B2A67]">
                Availability Legend:
              </span>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#007d48]" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Filling Fast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#bf050b]" />
                  <span className="text-[#bf050b] font-bold">Fully Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-[#0B2A67] ring-1 ring-[#FFD21C]" />
                  <span className="text-[#0B2A67] font-bold">Selected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Time Slot Availability Grid (Multi-Select) */}
          <div className="border border-[#E2E8F0] p-6 sm:p-8 space-y-4 rounded-2xl sm:rounded-3xl bg-white shadow-sm">
            <TimeSlotGrid
              slots={filteredSlots}
              selectedSlots={selectedSlots}
              onSelectSlots={(newSlots) => setSelectedSlots(newSlots)}
              onClearSelection={() => setSelectedSlots([])}
              isLoading={isLoadingSlots}
              errorMessage={errorMessage}
              timeFilter={timeFilter}
              onFilterChange={(f) => setTimeFilter(f)}
              hourlyRate={hourlyRate}
            />
          </div>
        </div>

        {/* Right Column: Sticky Booking Summary Card */}
        <div className="lg:col-span-5 sticky top-24">
          <BookingSummaryCard
            selectedCourt={selectedCourt}
            selectedDateStr={formattedDisplayDate}
            selectedSlot={selectedSlot}
            selectedSlots={selectedSlots}
            durationHours={durationHours}
            paddleCount={paddleCount}
            onPaddleCountChange={setPaddleCount}
            ballThrowerRental={ballThrowerRental}
            onToggleBallThrowerRental={setBallThrowerRental}
            grandTotal={grandTotal}
            isAuthenticated={isAuthenticated}
            isAuthLoading={isAuthLoading}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            guestEmail={guestEmail}
            onGuestEmailChange={setGuestEmail}
            guestPhone={guestPhone}
            onGuestPhoneChange={setGuestPhone}
            isSubmitting={isSubmitting}
            onSubmit={handleInitiateCheckout}
          />
        </div>
      </div>
    </div>
  );
}