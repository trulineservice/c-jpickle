'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import type { AvailabilitySlot, Court } from '@/types/database';
import {
  Clock,
  Check,
  AlertCircle,
  Loader2,
  CalendarDays,
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import Image from 'next/image';

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

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, i) => {
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

  // Form
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paddleRental, setPaddleRental] = useState(false);
  const [ballThrowerRental, setBallThrowerRental] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Slots
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
  const paddleFee = paddleRental ? 150 : 0;
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

  const handleInitiateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
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
          paddleRental,
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
      
      {/* Top Header Bar */}
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

      {/* Account Required Notice */}
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

      {/* Main Grid: Left Column (7 cols) & Right Column (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* LEFT COLUMN: COURT, DURATION, CALENDAR, SLOTS */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Step 1: Court & Duration Selection */}
          <div className="border border-[#cacacb] p-6 space-y-6">
            <div className="flex items-baseline justify-between border-b border-[#cacacb] pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
                1. Select Court
              </span>
              <span className="text-xs text-[#707072]">2 Indoor Courts</span>
            </div>

            {/* Court Filter Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courts.map((court) => {
                const isSelected = selectedCourt?.id === court.id;
                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => {
                      setSelectedCourt(court);
                      setSelectedSlot(null);
                    }}
                    className={`p-4 text-left border rounded-full transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-[#cacacb] hover:border-[#111111]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold tracking-tight">
                        {court.name}
                      </div>
                      <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-[#707072]'}`}>
                        ₱{court.hourly_rate} / hr • Indoor Cushion
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Duration Dropdown */}
            <div className="pt-2">
              <Label htmlFor="durationSelect" className="text-xs font-bold uppercase text-[#707072] tracking-wider block mb-2">
                Session Duration
              </Label>
              <div className="relative">
                <select
                  id="durationSelect"
                  value={durationHours}
                  onChange={(e) => {
                    setDurationHours(Number(e.target.value));
                    setSelectedSlot(null);
                  }}
                  className="w-full h-11 px-4 pr-10 rounded-full bg-[#f5f5f5] border border-transparent text-[#111111] font-medium text-sm appearance-none focus:outline-none focus:border-[#111111] cursor-pointer"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.hours} value={opt.hours}>
                      {opt.label} — ₱{(hourlyRate * opt.hours).toLocaleString()} ({opt.description})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#707072] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
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
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#cacacb] pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707072]">
                3. Choose Time Slot
              </span>

              {/* Filter Chips */}
              <div className="flex items-center gap-1">
                {(['all', 'morning', 'afternoon', 'night'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTimeFilter(filter)}
                    className={`h-7 px-3 rounded-full text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                      timeFilter === filter
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#f5f5f5] text-[#707072] hover:text-[#111111]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#707072] gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
                <span className="text-xs">Checking real-time court availability...</span>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="py-12 text-center text-[#707072] text-xs font-medium">
                No slots match filter for this date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {filteredSlots.map((slot) => {
                  const isSelected = selectedSlot?.hour24 === slot.hour24;
                  const isAvailable = slot.available;

                  return (
                    <button
                      key={slot.hour24}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`h-12 px-3 rounded-full text-xs font-semibold transition-all border flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : isAvailable
                          ? 'bg-white text-[#111111] border-[#cacacb] hover:border-[#111111]'
                          : 'bg-[#f5f5f5] text-[#cacacb] border-transparent cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>{slot.time}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-white' : isAvailable ? 'text-[#007d48]' : 'text-[#cacacb]'}`}>
                        {isSelected ? '✓' : isAvailable ? 'Open' : 'Full'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SUMMARY & PAYMONGO CHECKOUT */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="border border-[#111111] p-6 sm:p-8 bg-white space-y-6">
            <div className="border-b border-[#cacacb] pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707072] block mb-1">
                Booking Summary
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-[#111111]">
                {selectedCourt?.name}
              </h3>
            </div>

            {/* Match Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-[#707072]">
                <span>Date</span>
                <span className="text-[#111111] font-semibold">{formattedDisplayDate}</span>
              </div>
              <div className="flex justify-between text-[#707072]">
                <span>Starting Slot</span>
                <span className="text-[#111111] font-semibold">{selectedSlot ? selectedSlot.time : '—'}</span>
              </div>
              <div className="flex justify-between text-[#707072]">
                <span>Duration</span>
                <span className="text-[#111111] font-semibold">{durationHours} Hour{durationHours > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-[#707072]">
                <span>Court Rate</span>
                <span className="text-[#111111] font-semibold">₱{hourlyRate} × {durationHours} = ₱{courtSubtotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Pro Carbon Paddle Add-On */}
            <div className="p-4 bg-[#f5f5f5] border border-[#cacacb] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-white border border-[#cacacb] overflow-hidden shrink-0">
                    <Image
                      src="/gear-paddle.jpg"
                      alt="Pro Carbon Paddle"
                      fill
                      sizes="48px"
                      className="object-cover p-1"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">
                      Pro Carbon Paddle Bundle
                    </h4>
                    <p className="text-[11px] text-[#707072]">
                      2× 16mm Raw Carbon Paddles + 3× Balls
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-[#111111] block">
                    +₱150
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaddleRental(!paddleRental)}
                    className={`text-[11px] font-bold underline cursor-pointer ${
                      paddleRental ? 'text-[#d30005]' : 'text-[#111111]'
                    }`}
                  >
                    {paddleRental ? 'Remove' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Ball Thrower Machine Add-On */}
            <div className="p-4 bg-[#f5f5f5] border border-[#cacacb] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-white border border-[#cacacb] overflow-hidden shrink-0">
                    <Image
                      src="/gear-ball-thrower.png"
                      alt="Smart Ball Thrower Machine"
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">
                      Smart Ball Thrower Machine
                    </h4>
                    <p className="text-[11px] text-[#707072]">
                      Automated feeder &amp; drills launcher (₱150 / hr)
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-[#111111] block">
                    +₱{150 * durationHours}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBallThrowerRental(!ballThrowerRental)}
                    className={`text-[11px] font-bold underline cursor-pointer ${
                      ballThrowerRental ? 'text-[#d30005]' : 'text-[#111111]'
                    }`}
                  >
                    {ballThrowerRental ? 'Remove' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Total Price */}
            <div className="border-t border-[#cacacb] pt-4 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-[#707072] uppercase font-bold tracking-wider block">
                  Total Amount Due
                </span>
                <span className="text-3xl font-bold tracking-tight text-[#111111]">
                  ₱{grandTotal.toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-[#007d48] font-semibold">
                No Hidden Fees
              </span>
            </div>

            {/* Instant Checkout Action */}
            <div className="pt-2">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  disabled={!selectedSlot || isSubmitting}
                  onClick={handleInitiateCheckout}
                  className="w-full bg-[#111111] text-white hover:bg-[#222222] font-medium text-sm h-12"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to PayMongo...
                    </span>
                  ) : !selectedSlot ? (
                    'Select a Time Slot to Continue'
                  ) : (
                    `Pay ₱${grandTotal.toLocaleString()} & Lock Slot`
                  )}
                </Button>
              ) : (
                <Link href={`/login?next=${encodeURIComponent('/book')}`} className="w-full block">
                  <Button size="lg" className="w-full bg-[#111111] text-white hover:bg-[#222222] font-medium text-sm h-12">
                    Sign In to Reserve (₱{grandTotal.toLocaleString()})
                  </Button>
                </Link>
              )}
            </div>

            <p className="text-[11px] text-[#707072] text-center leading-relaxed">
              Instant lock via PayMongo with GCash, Maya, QR Ph, &amp; Cards. 
              Full refund on cancellations made at least 24 hours prior.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}