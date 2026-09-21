'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';
import type { Court } from '@/types/database';
import {
  AlertCircle,
  Lock,
  Sparkles,
  CalendarDays,
  Clock,
  PartyPopper,
  Users,
  CheckCircle2,
  Zap,
  Volume2,
  Tv,
  Wind,
  Utensils,
  GlassWater,
  Building2,
  CalendarCheck,
  CreditCard,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { playHapticSound } from '@/lib/motion-feedback';

interface VenueAmenity {
  id: string;
  name: string;
  price: number;
  icon: any;
  description: string;
}

const VENUE_AMENITIES: VenueAmenity[] = [
  {
    id: 'sound_lights',
    name: 'Pro Sound & Lighting Package',
    price: 1500,
    icon: Volume2,
    description: 'Wireless mics, DJ mixer, ambient LED uplighting & surround audio system',
  },
  {
    id: 'stage_projector',
    name: 'Stage & HD Projector Setup',
    price: 1200,
    icon: Tv,
    description: 'Elevated mobile stage platform + high-lumen projector & motorized screen',
  },
  {
    id: 'full_aircon',
    name: 'Full High-Power Aircon Package',
    price: 1000,
    icon: Wind,
    description: 'Unrestricted high-output cooling for large indoor gatherings',
  },
  {
    id: 'catering_prep',
    name: 'Catering Kitchen & Prep Access',
    price: 800,
    icon: Utensils,
    description: 'Dedicated buffet table setup, food warmer station & prep area access',
  },
];

const EVENT_TYPES = [
  { id: 'wedding', label: '💍 Wedding / Reception' },
  { id: 'birthday', label: '🎂 Birthday / Debut (18 Roses/Candles)' },
  { id: 'corporate', label: '💼 Corporate Assembly / Fellowship' },
  { id: 'cocktail', label: '🍸 Private Lounge & Sunset Party' },
  { id: 'reunion', label: '👨‍👩‍👧‍👦 Family Reunion / Homecoming' },
  { id: 'seminar', label: '🎓 Seminar / Workshop' },
  { id: 'other', label: '🎉 Other Special Event' },
];

export default function BookEventsPage() {
  // Venues State
  const [venues, setVenues] = useState<Court[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Court | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);

  // Date & Duration State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [startHour, setStartHour] = useState<number>(14); // 2:00 PM default
  const [durationHours, setDurationHours] = useState<number>(4); // 4-hour base

  // Event Details State
  const [eventType, setEventType] = useState<string>('birthday');
  const [guestCount, setGuestCount] = useState<number>(50);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['sound_lights', 'full_aircon']);
  const [isDownPayment, setIsDownPayment] = useState<boolean>(true); // 50% deposit vs 100% full

  // Auth & Guest Details State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Processing & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Load Venues & User Auth
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Check User Auth
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
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }

      // Fetch Events Place & View Deck Courts
      try {
        const { data: dbCourts } = await supabase
          .from('courts')
          .select('*')
          .order('name', { ascending: true });

        if (dbCourts && dbCourts.length > 0) {
          const venueList = dbCourts.filter((c: any) => {
            const nameLower = (c.name || '').toLowerCase();
            return (
              nameLower.includes('events place') ||
              nameLower.includes('view deck') ||
              nameLower.includes('banquet') ||
              nameLower.includes('lounge') ||
              nameLower.includes('3rd flr') ||
              nameLower.includes('5th flr')
            );
          });

          if (venueList.length > 0) {
            setVenues(venueList);
            setSelectedVenue(venueList[0]);
          } else {
            // Fallback default venue objects if database seeds aren't fetched
            const fallbackVenues: Court[] = [
              {
                id: 'e0000001-0000-0000-0000-000000000001',
                name: 'Events Place Rental (3rd Flr Banquet Hall)',
                type: 'indoor',
                hourly_rate: 1.00,
                is_active: true,
                created_at: new Date().toISOString(),
              },
              {
                id: 'e0000002-0000-0000-0000-000000000002',
                name: 'View Deck Private Lounge (5th Flr)',
                type: 'indoor',
                hourly_rate: 1.00,
                is_active: true,
                created_at: new Date().toISOString(),
              },
            ];
            setVenues(fallbackVenues);
            setSelectedVenue(fallbackVenues[0]);
          }
        }
      } catch (err) {
        console.warn('Could not fetch venues:', err);
      } finally {
        setIsLoadingVenues(false);
      }
    }

    loadData();
  }, []);

  // Fetch Existing Reservations for Conflict Prevention
  const fetchVenueBookings = useCallback(async () => {
    if (!selectedVenue || !selectedDate) return;
    const supabase = createClient();
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, status, guest_name')
      .eq('court_id', selectedVenue.id)
      .gte('start_time', `${dateStr}T00:00:00.000Z`)
      .lte('start_time', `${dateStr}T23:59:59.999Z`)
      .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment']);

    setExistingBookings(bookings || []);
  }, [selectedVenue, selectedDate]);

  useEffect(() => {
    fetchVenueBookings();
  }, [fetchVenueBookings]);

  // Auto-cancel and release venue hold if redirected back with cancelled=true
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
          .then(() => {
            fetchVenueBookings();
          })
          .catch((err) => console.warn('[Cancel] Failed to release venue hold:', err));
      }
      setInfoMessage('Checkout was cancelled. Your temporary venue reservation hold has been released.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchVenueBookings]);

  // Pricing Calculations
  const hourlyRate = selectedVenue ? Number(selectedVenue.hourly_rate) : 1.00;
  const baseVenuePrice = hourlyRate * durationHours;

  const amenitiesTotalPrice = useMemo(() => {
    return selectedAmenities.reduce((total, id) => {
      const item = VENUE_AMENITIES.find((a) => a.id === id);
      return total + (item ? item.price : 0);
    }, 0);
  }, [selectedAmenities]);

  const grandTotalPrice = baseVenuePrice + amenitiesTotalPrice;
  const requiredDownPayment = isDownPayment ? Math.round(grandTotalPrice * 0.5) : grandTotalPrice;

  // Toggle Amenity Selection
  const toggleAmenity = (id: string) => {
    playHapticSound('tap');
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Conflict Check Calculation
  const isSlotConflicted = useMemo(() => {
    if (!selectedDate || !selectedVenue) return false;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const targetStart = new Date(`${dateStr}T${startHour.toString().padStart(2, '0')}:00:00.000+08:00`);
    const targetEnd = new Date(targetStart.getTime() + durationHours * 60 * 60 * 1000);

    return existingBookings.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return targetStart < bEnd && targetEnd > bStart;
    });
  }, [selectedDate, selectedVenue, startHour, durationHours, existingBookings]);

  // Handle PayMongo Checkout Trigger
  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue || !selectedDate) return;

    if (!guestName.trim() || !guestEmail.trim()) {
      setErrorMessage('Please enter your full name and email address for your reservation receipt.');
      playHapticSound('error');
      return;
    }

    if (isSlotConflicted) {
      setErrorMessage('The selected time slot conflicts with an existing reservation. Please adjust your start time or date.');
      playHapticSound('error');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    playHapticSound('scan');

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const selectedEventObj = EVENT_TYPES.find((t) => t.id === eventType);
      const eventLabel = selectedEventObj ? selectedEventObj.label : 'Special Event';

      // Compose full notes
      const notesParts = [
        `Event: ${eventLabel} (${guestCount} Guests)`,
        `Payment Plan: ${isDownPayment ? '50% Down Payment Deposit' : 'Full Payment'}`,
      ];

      if (selectedAmenities.length > 0) {
        const amenityNames = selectedAmenities
          .map((id) => VENUE_AMENITIES.find((a) => a.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        notesParts.push(`Inclusions: ${amenityNames}`);
      }

      if (specialNotes.trim()) {
        notesParts.push(`Notes: ${specialNotes.trim()}`);
      }

      const res = await fetch('/api/checkout/paymongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: selectedVenue.id,
          date: dateStr,
          hour24: startHour,
          durationHours,
          guestName,
          guestEmail,
          guestPhone,
          downPaymentAmount: isDownPayment ? requiredDownPayment : undefined,
          notes: notesParts.join(' • '),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Failed to initialize venue reservation checkout session.');
      }

      // Redirect directly to PayMongo payment gateway
      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process venue booking.';
      setErrorMessage(msg);
      playHapticSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:00 ${period}`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-background text-[#111111] dark:text-foreground font-sans pb-16">
      {/* Top Banner Hero */}
      <div className="bg-gradient-to-r from-[#071E4B] via-[#0B2A67] to-[#041230] text-white py-10 px-4 sm:px-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD21C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#FFD21C] text-[#071E4B] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-current" />
                Grand Venue Reservations
              </span>
              <span className="text-xs text-white/70">25 Bologna St., Muzon, Taytay, Rizal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Events Place &amp; Private View Deck Booking
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
              Reserve our 3rd Floor Banquet Hall (180 Pax) or 5th Floor View Deck Lounge (25 Pax) for Weddings, Birthdays, Corporate Assemblies, and VIP gatherings.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shrink-0 backdrop-blur-xs"
          >
            <span>🏓 Switch to Court Booking</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main Reservation Workbench */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {infoMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{infoMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setInfoMessage(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleProceedToCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 7 COLS: Venue Selection, Date, Amenities & Event Info */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Select Venue */}
            <div className="bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#222226] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#222226] pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0B2A67] dark:text-blue-400" />
                  1. Select Venue Space
                </h3>
                <span className="text-[11px] text-[#707072] font-semibold">2 Premium Options Available</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venues.map((v) => {
                  const isSelected = selectedVenue?.id === v.id;
                  const isEventsPlace = v.name.toLowerCase().includes('events place') || v.name.toLowerCase().includes('3rd');

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        playHapticSound('tap');
                        setSelectedVenue(v);
                        if (isEventsPlace) {
                          setDurationHours(4);
                        } else {
                          setDurationHours(2);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'border-[#0B2A67] dark:border-blue-500 bg-[#f4f7fc] dark:bg-[#151d2a] shadow-sm'
                          : 'border-[#e5e5e5] dark:border-[#27272a] bg-white dark:bg-[#18181c] hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            isEventsPlace ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-purple-100 text-purple-900 border border-purple-300'
                          }`}>
                            {isEventsPlace ? '🎉 3rd Flr Banquet Hall' : '🌆 5th Flr View Lounge'}
                          </span>
                          <span className="text-xs font-black font-mono text-foreground">
                            ₱{Number(v.hourly_rate).toFixed(2)}/hr
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">
                          {v.name}
                        </h4>
                        <p className="text-[11px] text-[#707072] dark:text-[#8a8a93] mt-1">
                          {isEventsPlace
                            ? 'Capacity: up to 180 Guests • Air-Conditioned • Stage & Banquet Setup'
                            : 'Capacity: up to 25 Guests • Glass Lounge • Panoramic Rooftop Views'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold border-t border-black/5 dark:border-white/5 pt-2">
                        <span className="text-[#0B2A67] dark:text-blue-400">
                          {isEventsPlace ? '4-Hour Base Package' : '2-Hour Base Package'}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0B2A67] dark:text-blue-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date & Duration Selector */}
            <div className="bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#222226] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#222226] pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#0B2A67] dark:text-blue-400" />
                  2. Reservation Date &amp; Time
                </h3>
                <span className="text-[11px] text-[#707072] font-semibold">Real-Time Availability</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Calendar */}
                <div className="flex justify-center border border-[#e5e5e5] dark:border-[#27272a] rounded-2xl p-2 bg-[#fdfdfd] dark:bg-black">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) {
                        playHapticSound('tap');
                        setSelectedDate(d);
                      }
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="p-1 pointer-events-auto text-xs"
                  />
                </div>

                {/* Duration & Start Time Controls */}
                <div className="space-y-4">
                  {/* Start Hour */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0B2A67]" />
                      Event Start Time
                    </label>
                    <select
                      value={startHour}
                      onChange={(e) => {
                        playHapticSound('tap');
                        setStartHour(parseInt(e.target.value, 10));
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-bold outline-none"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
                        <option key={h} value={h}>
                          {formatHourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration Hours */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0B2A67]" />
                      Total Event Hours
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 4, 6, 8].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            playHapticSound('tap');
                            setDurationHours(h);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            durationHours === h
                              ? 'bg-[#0B2A67] text-white border-[#0B2A67] shadow-xs'
                              : 'bg-[#f5f5f5] dark:bg-[#18181c] text-[#707072] border-[#cacacb] dark:border-[#3f3f46]'
                          }`}
                        >
                          {h} Hrs
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conflict Notice */}
                  {isSlotConflicted && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Warning: Selected time slot overlaps with an existing reservation.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Event Type, Guest Count & Add-ons */}
            <div className="bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#222226] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#222226] pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <PartyPopper className="w-4 h-4 text-[#0B2A67] dark:text-blue-400" />
                  3. Event Details &amp; Amenities
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Event Type / Occasion
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium outline-none"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estimated Guests */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span>Estimated Guest Count</span>
                    <span className="text-[10px] text-[#707072]">
                      Max {selectedVenue?.name.includes('View Deck') ? '25' : '180'} Pax
                    </span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 1)}
                    className="h-10 px-4 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Add-ons Checklist */}
              <div className="pt-3 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Select Package Add-ons &amp; Inclusions:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VENUE_AMENITIES.map((item) => {
                    const isChecked = selectedAmenities.includes(item.id);
                    const IconComponent = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleAmenity(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-[#0B2A67]/5 dark:bg-blue-950/30 border-[#0B2A67] dark:border-blue-500'
                            : 'bg-[#f8f9fa] dark:bg-[#18181c] border-[#cacacb] dark:border-[#3f3f46] hover:border-gray-400'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? 'bg-[#0B2A67] border-[#0B2A67] text-white'
                              : 'bg-white dark:bg-black border-gray-400'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                              <IconComponent className="w-3.5 h-3.5 text-[#0B2A67] shrink-0" />
                              {item.name}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#0B2A67] dark:text-blue-400 shrink-0">
                              +₱{item.price}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#707072] dark:text-[#8a8a93] mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Requests / Notes */}
              <div className="pt-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Special Instructions / Theme / Catering Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Motif is Navy & Gold. Caterer arriving 2 hours early for setup..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: Booking Summary, Payment Option & Instant Checkout */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <div className="bg-white dark:bg-[#121215] border border-[#e5e5e5] dark:border-[#222226] rounded-3xl p-6 shadow-xl space-y-5">
              
              <div className="border-b border-[#f0f0f0] dark:border-[#222226] pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-blue-400">
                  Reservation Summary
                </span>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  {selectedVenue?.name || 'Venue Reservation'}
                </h2>
              </div>

              {/* Event Breakdown List */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[#707072]">Target Date:</span>
                  <span className="font-bold font-mono text-foreground">
                    {selectedDate ? selectedDate.toDateString() : 'Select Date'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[#707072]">Time Window:</span>
                  <span className="font-bold font-mono text-foreground">
                    {formatHourLabel(startHour)} &ndash; {formatHourLabel(startHour + durationHours)} ({durationHours} hrs)
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[#707072]">Venue Hourly Rate:</span>
                  <span className="font-bold font-mono text-foreground">
                    ₱{hourlyRate.toFixed(2)}/hr &times; {durationHours} hrs = ₱{baseVenuePrice.toFixed(2)}
                  </span>
                </div>

                {selectedAmenities.length > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-[#707072]">Selected Inclusions ({selectedAmenities.length}):</span>
                    <span className="font-bold font-mono text-[#0B2A67] dark:text-blue-400">
                      +₱{amenitiesTotalPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Down Payment Option Toggle */}
              <div className="p-4 rounded-2xl bg-[#f4f7fc] dark:bg-[#151d2a] border border-blue-200 dark:border-blue-900 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] dark:text-blue-400 block">
                  Payment Plan Option:
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playHapticSound('tap');
                      setIsDownPayment(true);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${
                      isDownPayment
                        ? 'bg-[#0B2A67] text-white border-[#0B2A67] shadow-xs'
                        : 'bg-white dark:bg-black text-[#707072] border-gray-300'
                    }`}
                  >
                    <span>50% Down Payment</span>
                    <span className="text-[10px] opacity-80 mt-1 font-mono">
                      Pay ₱{requiredDownPayment.toFixed(2)} Now
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playHapticSound('tap');
                      setIsDownPayment(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex flex-col justify-between ${
                      !isDownPayment
                        ? 'bg-[#0B2A67] text-white border-[#0B2A67] shadow-xs'
                        : 'bg-white dark:bg-black text-[#707072] border-gray-300'
                    }`}
                  >
                    <span>Full Payment (100%)</span>
                    <span className="text-[10px] opacity-80 mt-1 font-mono">
                      Pay ₱{grandTotalPrice.toFixed(2)} Now
                    </span>
                  </button>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="pt-2 border-t border-[#f0f0f0] dark:border-[#222226] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#707072]">
                  <span>Total Event Package:</span>
                  <span className="font-mono font-bold text-foreground">₱{grandTotalPrice.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-base font-black text-foreground">
                  <span>Due Today via PayMongo:</span>
                  <span className="font-mono text-[#0B2A67] dark:text-blue-400 text-lg sm:text-xl">
                    ₱{requiredDownPayment.toFixed(2)}
                  </span>
                </div>

                {isDownPayment && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold text-right">
                    Remaining balance of ₱{(grandTotalPrice - requiredDownPayment).toFixed(2)} due on event date.
                  </p>
                )}
              </div>

              {/* Customer Contact Details */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Reservation Holder Information
                </span>

                <Input
                  required
                  placeholder="Full Name (e.g. Atty. Jerome Bautista)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-10 px-3.5 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
                />

                <Input
                  required
                  type="email"
                  placeholder="Email Address for Digital Receipt"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="h-10 px-3.5 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
                />

                <Input
                  placeholder="Mobile Phone Number (0917...)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="h-10 px-3.5 rounded-xl bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-xs font-medium"
                />
              </div>

              {/* PayMongo Checkout Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isSlotConflicted}
                className="w-full h-12 rounded-2xl bg-[#0B2A67] hover:bg-[#082050] text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connecting PayMongo Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[#FFD21C] fill-current" />
                    <span>Reserve &amp; Pay ₱{requiredDownPayment.toFixed(2)}</span>
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-[#707072]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured by PayMongo (GCash, Maya, QR Ph &amp; Cards) • Google Calendar Auto-Sync</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
