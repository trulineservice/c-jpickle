'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import type { AvailabilitySlot, Court } from '@/types/database';
import { CourtSelector } from '@/components/booking/court-selector';
import { DurationSelector, type DurationOption } from '@/components/booking/duration-selector';
import { TimeSlotGrid } from '@/components/booking/time-slot-grid';
import { BookingSummaryCard } from '@/components/booking/booking-summary-card';
import { AlertCircle, Lock } from 'lucide-react';

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
    hourly_rate: 300,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '052becb1-e01d-4cd9-88ae-3d6e419259fd',
    name: 'Court 2 — Indoor (Tournament Spec)',
    type: 'indoor',
    hourly_rate: 300,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const DURATION_OPTIONS: DurationOption[] = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return {
    hours: h,
    label: `${h} Hour${h > 1 ? 's' : ''}`,
    description:
      h === 1
        ? 'Single match'
        : h === 2
        ? 'Doubles match'
        : h <= 4
        ? 'Squad tournament block'
        : 'Arena private block',
  };
});

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
  const [durationHours, setDurationHours] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

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
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'night'>('all');

  useEffect(() => {
    async function loadInitialData() {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
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
          .filter((c: any) => c.is_active !== false && c.status !== 'inactive')
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type || (c.name?.toLowerCase().includes('outdoor') ? 'outdoor' : 'indoor'),
            hourly_rate: c.hourly_rate !== undefined && c.hourly_rate !== null ? Number(c.hourly_rate) : 300,
            is_active: c.is_active !== false,
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
        `/api/availability?courtId=${selectedCourt.id}&date=${rawDateStr}&durationHours=${durationHours}`
      );
      if (!res.ok) throw new Error('Could not fetch slot availability.');

      const data = await res.json();
      const loadedSlots: AvailabilitySlot[] = data.slots || [];
      setSlots(loadedSlots);

      if (data.monthOverview) {
        setMonthOverview((prev) => ({ ...prev, ...data.monthOverview }));
      }

      setSelectedSlot((prev) => {
        if (!prev) return null;
        const stillAvailable = loadedSlots.find(
          (s) => s.hour24 === prev.hour24 && s.available
        );
        return stillAvailable || null;
      });
    } catch (err: unknown) {
      console.error('Failed to load availability:', err);
      setErrorMessage('Unable to connect to availability service. Please try again.');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [rawDateStr, selectedCourt?.id, durationHours]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleMonthChange = useCallback(
    async (newMonth: Date) => {
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

  const hourlyRate = selectedCourt?.hourly_rate ?? 300;
  const courtSubtotal = hourlyRate * durationHours;
  const paddleFee = paddleCount * 150;
  const ballThrowerFee = ballThrowerRental ? 150 * durationHours : 0;
  const grandTotal = courtSubtotal + paddleFee + ballThrowerFee;

  const filteredSlots = useMemo(() => {
    if (timeFilter === 'all') return slots;
    if (timeFilter === 'morning') return slots.filter((s) => s.hour24 >= 6 && s.hour24 < 12);
    if (timeFilter === 'afternoon') return slots.filter((s) => s.hour24 >= 12 && s.hour24 < 17);
    if (timeFilter === 'night') return slots.filter((s) => s.hour24 >= 17 && s.hour24 <= 22);
    return slots;
  }, [slots, timeFilter]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleInitiateCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent('/book')}`;
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please pick an available time slot from the schedule below.');
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
          durationHours,
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

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-8 md:py-12 font-sans bg-white text-[#111111]">
      {/* Header Bar */}
      <div className="border-b border-[#cacacb] pb-6 mb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] block mb-1">
            Live Reservation
          </span>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-[#111111]">
            SELECT COURT &amp; SCHEDULE
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-[#707072]">
          <span className="text-[#111111] font-bold">₱300 / hr Flat Rate</span>
          <span>•</span>
          <span>PayMongo Instant Lock</span>
          <span>•</span>
          <span className="text-[#007d48] font-semibold">24h Cancellation Guarantee</span>
        </div>
      </div>

      {/* Account Required Banner */}
      {!isAuthLoading && !isAuthenticated && (
        <div className="p-4 bg-[#f5f5f5] border border-[#cacacb] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#111111] shrink-0" />
            <div>
              <strong className="text-[#111111] block font-bold text-xs uppercase tracking-wide">
                Account Required to Reserve
              </strong>
              <span className="text-[#707072]">
                Please sign in or register to secure your court reservation.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login?next=/book">
              <Button size="sm" className="bg-[#111111] text-white hover:bg-[#222222] text-xs px-4">
                Sign In
              </Button>
            </Link>
            <Link href="/signup?next=/book">
              <Button size="sm" variant="secondary" className="text-xs px-4">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 border border-[#d30005] bg-white text-[#d30005] text-xs mb-8 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Court, Duration, Calendar, Slots */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Court Selection */}
          <div className="border border-[#cacacb] p-6 space-y-6">
            <CourtSelector
              courts={courts}
              selectedCourt={selectedCourt}
              onSelectCourt={(c) => {
                setSelectedCourt(c);
                setSelectedSlot(null);
              }}
            />

            <DurationSelector
              durationHours={durationHours}
              durationOptions={DURATION_OPTIONS}
              onSelectDuration={(h) => {
                setDurationHours(h);
                setSelectedSlot(null);
              }}
            />
          </div>

          {/* Step 2: Calendar Card */}
          <div className="border border-[#cacacb] p-6 space-y-4 bg-white">
            <div className="flex items-baseline justify-between border-b border-[#cacacb] pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
                2. Select Date ({formattedDisplayDate})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setSelectedDate(today);
                    setVisibleMonth(today);
                    setSelectedSlot(null);
                  }}
                  className="text-xs px-3 rounded-full border-[#cacacb] text-[#111111] hover:bg-[#f5f5f5]"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);
                    setSelectedDate(tomorrow);
                    setVisibleMonth(tomorrow);
                    setSelectedSlot(null);
                  }}
                  className="text-xs px-3 rounded-full border-[#cacacb] text-[#111111] hover:bg-[#f5f5f5]"
                >
                  Tomorrow
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Calendar
                mode="single"
                month={visibleMonth}
                onMonthChange={handleMonthChange}
                selected={selectedDate}
                modifiers={calendarModifiers}
                onSelect={handleDateSelect}
                className="w-full text-[#111111]"
                disabled={(d) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return d < today;
                }}
              />
            </div>
          </div>

          {/* Step 3: Time Slot Availability Grid */}
          <div className="border border-[#cacacb] p-6 space-y-4">
            <TimeSlotGrid
              slots={filteredSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              isLoading={isLoadingSlots}
              errorMessage={errorMessage}
              timeFilter={timeFilter}
              onFilterChange={(f) => setTimeFilter(f)}
              durationHours={durationHours}
            />
          </div>
        </div>

        {/* Right Column: Sticky Booking Summary Card */}
        <div className="lg:col-span-5 sticky top-24">
          <BookingSummaryCard
            selectedCourt={selectedCourt}
            selectedDateStr={formattedDisplayDate}
            selectedSlot={selectedSlot}
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