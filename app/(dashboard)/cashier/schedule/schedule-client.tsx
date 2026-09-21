'use client';

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { checkInBooking, recordDownPayment, triggerManualGoogleCalendarSync } from '@/app/actions';
import { GoogleCalendarSyncModal } from '@/components/google-calendar-sync-modal';
import { getGoogleCalendarOneClickAddUrl } from '@/lib/google-calendar';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Trophy,
  Sparkles,
  Clock,
  CheckCircle2,
  Plus,
  Flame,
  Radio,
  Banknote,
  QrCode,
  Loader2,
  RefreshCw,
  Search,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  MapPin,
  Check,
  Activity,
  LayoutGrid,
  ListTodo,
  CalendarDays,
  Eye,
  Zap,
  AlertCircle,
} from 'lucide-react';

export interface ScheduleBooking {
  id: string;
  court_id?: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  total_price?: number;
  status: string;
  payment_method?: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  notes?: string | null;
  expires_at?: string | null;
  down_payment_amount?: number;
  google_calendar_event_id?: string | null;
  google_calendar_synced_at?: string | null;
  profiles?: { full_name?: string | null } | null;
  courts?: { id?: string; name?: string } | null;
}

export interface ScheduleCourt {
  id: string;
  name: string;
  type?: string;
  hourly_rate?: number;
}

// C&J Court Operational Hours: 6:00 AM (6) to 12:00 AM (24) -> 18 intervals
const START_HOUR = 6;
const END_HOUR = 24;
const OPERATING_SLOTS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => i + START_HOUR
);

// Helper to extract PHT (UTC+8) date string 'YYYY-MM-DD'
const getPhtDateStr = (isoString: string) => {
  const d = new Date(isoString);
  const pht = new Date(d.getTime() + 8 * 3600 * 1000);
  const yyyy = pht.getUTCFullYear();
  const mm = String(pht.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(pht.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function ScheduleClient({
  initialBookings,
  courts,
  initialDateStr,
}: {
  initialBookings: ScheduleBooking[];
  courts: ScheduleCourt[];
  initialDateStr: string;
}) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<string>(initialDateStr);
  const [viewMode, setViewMode] = useState<'month_grid' | 'timeline' | 'day_agenda'>('month_grid');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  
  // Auto-switch to Day Agenda view on small mobile viewports for optimal scheduling coordinator UX
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('day_agenda');
    }
  }, []);

  // Date state for month grid navigation
  const [gridMonthDate, setGridMonthDate] = useState<Date>(() => {
    const [y, m] = initialDateStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const [bookings, setBookings] = useState<ScheduleBooking[]>(initialBookings);
  const [monthBookings, setMonthBookings] = useState<Record<string, ScheduleBooking[]>>({});
  const [selectedBooking, setSelectedBooking] = useState<ScheduleBooking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);

  // Down Payment & Google Calendar states
  const [downPaymentAmountInput, setDownPaymentAmountInput] = useState<string>('');
  const [downPaymentMethodInput, setDownPaymentMethodInput] = useState<'cash' | 'gcash' | 'counter_qr'>('cash');
  const [isRecordingDP, setIsRecordingDP] = useState(false);
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [dpFeedback, setDpFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Realtime clock for live marker (updates every 30s)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Format month string YYYY-MM
  const currentMonthStr = useMemo(() => {
    const yyyy = gridMonthDate.getFullYear();
    const mm = String(gridMonthDate.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, [gridMonthDate]);

  // Horizontal Date Strip for Mobile Day Agenda
  const agendaDateStrip = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const centerDate = new Date(y, m - 1, d);
    const strip: {
      dateStr: string;
      dayOfWeek: string;
      dayNumber: number;
      isToday: boolean;
      isSelected: boolean;
      count: number;
    }[] = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let offset = -4; offset <= 9; offset++) {
      const target = new Date(centerDate);
      target.setDate(target.getDate() + offset);
      const targetY = target.getFullYear();
      const targetM = String(target.getMonth() + 1).padStart(2, '0');
      const targetD = String(target.getDate()).padStart(2, '0');
      const dateStr = `${targetY}-${targetM}-${targetD}`;
      const dayOfWeek = new Intl.DateTimeFormat('en-PH', { weekday: 'short' }).format(target);
      const bList = monthBookings[dateStr] || [];
      const validCount = bList.filter(
        (b) => b.status !== 'cancelled' && b.status !== 'expired'
      ).length;

      strip.push({
        dateStr,
        dayOfWeek,
        dayNumber: target.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === currentDate,
        count: validCount,
      });
    }
    return strip;
  }, [currentDate, monthBookings]);

  // Fetch all bookings for the visible month to populate the Calendar Grid
  const fetchMonthAllBookings = useCallback(async (monthStr: string) => {
    try {
      const supabase = createClient();
      const [year, month] = monthStr.split('-').map(Number);
      
      // UTC boundaries covering the entire month in PHT (UTC+8)
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0)).toISOString();
      const endOfMonth = new Date(Date.UTC(year, month, 1, 15, 59, 59, 999)).toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          duration_hours,
          total_price,
          status,
          payment_method,
          guest_name,
          guest_phone,
          guest_email,
          notes,
          expires_at,
          down_payment_amount,
          google_calendar_event_id,
          google_calendar_synced_at,
          profiles:profiles!bookings_user_id_fkey ( full_name ),
          courts ( id, name )
        `)
        .gte('end_time', startOfMonth)
        .lte('start_time', endOfMonth)
        .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment', 'cancelled'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading month bookings:', error);
        return;
      }

      if (data) {
        const formatted: ScheduleBooking[] = (data as unknown as ScheduleBooking[]).map((b) => {
          const singleProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
          const singleCourt = Array.isArray(b.courts) ? b.courts[0] : b.courts;
          const isExpiredHold = b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at) <= new Date();
          return {
            ...b,
            status: isExpiredHold ? 'expired' : b.status,
            guest_name: b.guest_name || singleProfile?.full_name || 'Walk-in Client',
            down_payment_amount: b.down_payment_amount ? Number(b.down_payment_amount) : 0,
            google_calendar_event_id: b.google_calendar_event_id || null,
            google_calendar_synced_at: b.google_calendar_synced_at || null,
            profiles: singleProfile || null,
            courts: singleCourt || null,
          };
        });

        // Group by PHT Date YYYY-MM-DD
        const grouped: Record<string, ScheduleBooking[]> = {};
        formatted.forEach((b) => {
          const dateKey = getPhtDateStr(b.start_time);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(b);
        });

        setMonthBookings(grouped);
      }
    } catch (err) {
      console.error('Failed to fetch month bookings:', err);
    }
  }, []);

  useEffect(() => {
    fetchMonthAllBookings(currentMonthStr);
  }, [currentMonthStr, fetchMonthAllBookings]);

  // Walk-in modal state
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInCourtId, setWalkInCourtId] = useState(courts[0]?.id || '');
  const [walkInDate, setWalkInDate] = useState(initialDateStr);
  const [walkInHour, setWalkInHour] = useState(8);
  const [walkInDuration, setWalkInDuration] = useState(1);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<'cash' | 'counter_qr'>('cash');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Supabase Realtime Subscription for instantaneous schedule updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('schedule-bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookingsForDate(currentDate);
          fetchMonthAllBookings(currentMonthStr);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate, currentMonthStr, fetchMonthAllBookings]);

  // Fetch bookings for specific date
  const fetchBookingsForDate = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const startOfDay = new Date(`${dateStr}T00:00:00.000+08:00`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59.999+08:00`).toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          duration_hours,
          total_price,
          status,
          payment_method,
          guest_name,
          guest_phone,
          guest_email,
          notes,
          expires_at,
          down_payment_amount,
          google_calendar_event_id,
          google_calendar_synced_at,
          profiles:profiles!bookings_user_id_fkey ( full_name ),
          courts ( id, name )
        `)
        .gte('end_time', startOfDay)
        .lte('start_time', endOfDay)
        .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment', 'cancelled'])
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching date schedule:', error);
        return;
      }

      if (data) {
        const formatted: ScheduleBooking[] = (data as unknown as ScheduleBooking[]).map((b) => {
          const singleProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
          const singleCourt = Array.isArray(b.courts) ? b.courts[0] : b.courts;
          const isExpiredHold = b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at) <= new Date();
          return {
            ...b,
            status: isExpiredHold ? 'expired' : b.status,
            guest_name: b.guest_name || singleProfile?.full_name || 'Walk-in Client',
            down_payment_amount: b.down_payment_amount ? Number(b.down_payment_amount) : 0,
            google_calendar_event_id: b.google_calendar_event_id || null,
            google_calendar_synced_at: b.google_calendar_synced_at || null,
            profiles: singleProfile || null,
            courts: singleCourt || null,
          };
        });

        setBookings(formatted);
      }
    } catch (err) {
      console.error('Failed to load schedule for date:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Date Selection Handlers
  const handleDateSelect = (dateStr: string) => {
    if (!dateStr) return;
    setCurrentDate(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    setGridMonthDate(new Date(y, m - 1, 1));
    const url = new URL(window.location.href);
    url.searchParams.set('date', dateStr);
    window.history.pushState({}, '', url.toString());
    fetchBookingsForDate(dateStr);
  };

  const handleOffsetDay = (offset: number) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + offset);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    handleDateSelect(`${yyyy}-${mm}-${dd}`);
  };

  const handleOffsetMonth = (offset: number) => {
    setGridMonthDate((prev) => {
      const nextMonth = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      return nextMonth;
    });
  };

  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowStr = () => {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    return `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      await checkInBooking(selectedBooking.id);
      setSelectedBooking(null);
      fetchBookingsForDate(currentDate);
      fetchMonthAllBookings(currentMonthStr);
    });
  };

  const handleRecordDownPayment = async () => {
    if (!selectedBooking) return;
    const amount = parseFloat(downPaymentAmountInput);
    if (!amount || amount <= 0) {
      setDpFeedback({ type: 'error', message: 'Please enter a valid deposit/payment amount.' });
      return;
    }

    setIsRecordingDP(true);
    setDpFeedback(null);
    try {
      const res = await recordDownPayment({
        bookingId: selectedBooking.id,
        downPaymentAmount: amount,
        paymentMethod: downPaymentMethodInput,
      });

      if (res.success) {
        setDpFeedback({
          type: 'success',
          message: `Down payment of ₱${amount.toFixed(2)} recorded! ${res.googleSynced ? '✓ Auto-synced to Google Calendar.' : ''}`,
        });
        setDownPaymentAmountInput('');
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: 'paid',
                down_payment_amount: (prev.down_payment_amount || 0) + amount,
                google_calendar_event_id: res.googleSynced ? 'synced' : prev.google_calendar_event_id,
              }
            : null
        );
        fetchBookingsForDate(currentDate);
        fetchMonthAllBookings(currentMonthStr);
      } else {
        setDpFeedback({ type: 'error', message: res.error || 'Failed to record down payment.' });
      }
    } catch (err: unknown) {
      setDpFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error recording payment' });
    } finally {
      setIsRecordingDP(false);
    }
  };

  const handleManualGCalSync = async () => {
    if (!selectedBooking) return;
    setIsSyncingGCal(true);
    setDpFeedback(null);
    try {
      const res = await triggerManualGoogleCalendarSync(selectedBooking.id);
      if (res.success) {
        setDpFeedback({ type: 'success', message: '✓ Event successfully pushed to your Google Calendar!' });
        setSelectedBooking((prev) =>
          prev ? { ...prev, google_calendar_event_id: res.googleEventId || 'synced' } : null
        );
      } else {
        setDpFeedback({
          type: 'error',
          message: res.error || 'Failed to push to Google Calendar. Check Direct API Settings in calendar modal.',
        });
      }
    } catch (err: unknown) {
      setDpFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setIsSyncingGCal(false);
    }
  };


  const openWalkInForSlot = (courtId: string, hour: number, targetDate?: string) => {
    setWalkInCourtId(courtId);
    setWalkInDate(targetDate || currentDate);
    setWalkInHour(hour);
    setWalkInDuration(1);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInError(null);
    setIsWalkInOpen(true);
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInLoading(true);
    setWalkInError(null);

    try {
      const res = await fetch('/api/pos/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: walkInCourtId,
          date: walkInDate,
          hour24: walkInHour,
          durationHours: walkInDuration,
          guestName: walkInName.trim() || 'Walk-in Client',
          guestPhone: walkInPhone.trim() || undefined,
          paymentMethod: walkInPaymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create walk-in booking.');

      setIsWalkInOpen(false);
      const playerDisplayName = walkInName.trim() || 'Walk-in Client';
      setWalkInName('');
      setWalkInPhone('');
      
      setSuccessBanner(
        `✓ Walk-in booking confirmed for ${playerDisplayName} on ${walkInDate} (${formatHour(walkInHour)})!`
      );
      setTimeout(() => setSuccessBanner(null), 6000);

      // Refresh both timeline and month bookings
      if (walkInDate !== currentDate) {
        handleDateSelect(walkInDate);
      } else {
        await fetchBookingsForDate(walkInDate);
      }
      await fetchMonthAllBookings(currentMonthStr);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWalkInError(msg);
    } finally {
      setWalkInLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    const h = hour % 24;
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const formatTimeSlot = (startTime: string, endTime: string) => {
    const s = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(startTime));
    const e = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(endTime));
    return `${s} – ${e}`;
  };

  const getGridColumn = (startTime: string, endTime: string) => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Convert UTC timestamp to local Philippine hours (UTC+8)
    const startHour = new Date(startDate.getTime() + 8 * 3600 * 1000).getUTCHours();
    let endHour = new Date(endDate.getTime() + 8 * 3600 * 1000).getUTCHours();
    if (endHour === 0 && endDate.getTime() > startDate.getTime()) {
      endHour = 24;
    }

    const startCol = Math.max(startHour - START_HOUR + 1, 1);
    const endCol = Math.max(endHour - START_HOUR + 1, startCol + 1);
    return `${startCol} / ${endCol}`;
  };

  // Day Metrics
  const checkedInCount = useMemo(
    () => bookings.filter((b) => b.status === 'checked_in').length,
    [bookings]
  );
  const totalHoursBooked = useMemo(
    () => bookings.reduce((sum, b) => sum + (b.duration_hours || 1), 0),
    [bookings]
  );

  const totalCapacityHours = courts.length * (END_HOUR - START_HOUR); // 2 courts * 18 hrs = 36
  const occupancyPercent = totalCapacityHours > 0
    ? Math.round((totalHoursBooked / totalCapacityHours) * 100)
    : 0;

  // Live Philippine Time Marker calculation
  const nowUtc = currentTime.getTime();
  const currentPhtDate = new Date(nowUtc + 8 * 3600 * 1000);
  const currentPhtHour = currentPhtDate.getUTCHours();
  const currentPhtMinute = currentPhtDate.getUTCMinutes();
  const isLiveOperating = currentPhtHour >= START_HOUR && currentPhtHour < END_HOUR;
  const liveMinuteOffset = (currentPhtHour - START_HOUR) * 60 + currentPhtMinute;
  const totalOperatingMinutes = (END_HOUR - START_HOUR) * 60; // 16 * 60 = 960
  const liveOffsetPercent = Math.min(
    100,
    Math.max(0, (liveMinuteOffset / totalOperatingMinutes) * 100)
  );

  const displayFormattedDate = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${currentDate}T00:00:00.000+08:00`));

  const isTodayActive = currentDate === getTodayStr();

  // Calendar Grid Matrix Generation (7 Days x Weeks)
  const calendarGridDays = useMemo(() => {
    const year = gridMonthDate.getFullYear();
    const month = gridMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = getTodayStr();

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = totalDaysInPrevMonth - i;
      const prevMonth = month === 0 ? 12 : month;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === currentDate,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === currentDate,
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 1 : month + 2;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === currentDate,
      });
    }

    return days;
  }, [gridMonthDate, currentDate]);

  const monthFormattedTitle = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
  }).format(gridMonthDate);

  return (
    <div className="p-6 sm:p-10 max-w-[1440px] mx-auto min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-foreground selection:text-background space-y-6">
      
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 border border-[#007d48]/40 bg-[#f5f5f5] dark:bg-[#121215] text-[#007d48] text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#007d48] shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[#707072] dark:text-[#8a8a93] hover:text-foreground text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 dark:border-white/10 pb-6">
        
        {/* Left Title & Live Pulse */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#bf050b] animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C]">
              Operations
            </span>
            <span className="text-xs text-slate-300 dark:text-white/20">•</span>
            <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 shadow-2xs">
              Live Court Scheduler
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            TIMELINE &amp; RESERVATIONS
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl">
            Real-time court availability matrix, scheduled player check-ins, and walk-in registry.
          </p>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Primary View Switcher: Calendar Grid vs Mobile Day Agenda vs Day Timeline */}
          <div className="flex items-center bg-[#EDF4FC] dark:bg-[#0c1a3b] p-1 border border-[#0B2A67]/20 dark:border-white/10 rounded-none shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('month_grid')}
              className={`px-3 sm:px-4 py-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
                viewMode === 'month_grid'
                  ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Calendar Grid</span>
              <span className="sm:hidden">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day_agenda')}
              className={`px-3 sm:px-4 py-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
                viewMode === 'day_agenda'
                  ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0 text-[#FFD21C] dark:text-[#0B2A67]" />
              <span className="hidden sm:inline">Mobile Day Agenda</span>
              <span className="sm:hidden">Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 sm:px-4 py-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer rounded-none ${
                viewMode === 'timeline'
                  ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2A67] dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Day Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </button>
          </div>

          {/* Client Search Bar */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-8 pr-8 bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-foreground rounded-none text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0B2A67] dark:focus:ring-[#FFD21C] placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchBookingsForDate(currentDate);
              fetchMonthAllBookings(currentMonthStr);
            }}
            disabled={isLoading}
            className="border-slate-300 dark:border-white/15 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none h-10 px-3.5 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin text-[#0B2A67]' : ''}`} />
            Sync
          </Button>

          {/* Live Google Calendar Sync Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsGCalModalOpen(true)}
            className="border-emerald-400 dark:border-emerald-800 text-[#007d48] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-none h-10 px-3.5 text-xs font-bold cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-[#007d48] dark:text-emerald-400" />
            <span className="hidden sm:inline">Google Calendar</span>
            <span className="sm:hidden">GCal</span>
            <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-emerald-400 animate-pulse ml-1.5" />
          </Button>

          {/* Quick Walk-in Modal Trigger (Gold C&J Action Button) */}
          <Dialog
            open={isWalkInOpen}
            onOpenChange={(open) => {
              if (open) setWalkInDate(currentDate);
              setIsWalkInOpen(open);
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center rounded-none text-xs font-black bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] h-10 px-4 shadow-sm transition-all cursor-pointer">
              <Plus className="h-4 w-4 mr-1 stroke-[2.5]" />
              <span>Walk-in Booking</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#071E4B] border border-slate-200 dark:border-white/15 text-foreground rounded-3xl p-6 sm:p-8 shadow-2xl">
              <form onSubmit={handleCreateWalkIn}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-2xl font-black tracking-tight text-[#0B2A67] dark:text-white">
                    Walk-In Court Booking
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                    Immediately reserve a court slot and record counter cash or QR tender.
                  </DialogDescription>
                </DialogHeader>

                {walkInError && (
                  <div className="p-3 my-2 border border-[#d30005]/40 bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-[#d30005] font-medium">
                    {walkInError}
                  </div>
                )}

                <div className="space-y-4 py-4">
                  {/* Select Date */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Reservation Date</Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWalkInDate(getTodayStr())}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            walkInDate === getTodayStr()
                              ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-[#111111] dark:border-white'
                              : 'text-[#707072] dark:text-[#8a8a93] border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c]'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setWalkInDate(getTomorrowStr())}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            walkInDate === getTomorrowStr()
                              ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-[#111111] dark:border-white'
                              : 'text-[#707072] dark:text-[#8a8a93] border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c]'
                          }`}
                        >
                          Tomorrow
                        </button>
                      </div>
                    </div>
                    <Input
                      type="date"
                      value={walkInDate}
                      onChange={(e) => setWalkInDate(e.target.value)}
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[#111111] dark:text-foreground text-xs focus:border-[#111111] dark:focus:border-white"
                    />
                  </div>

                  {/* Select Court */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Select Court</Label>
                    <select
                      value={walkInCourtId}
                      onChange={(e) => setWalkInCourtId(e.target.value)}
                      className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[#111111] dark:text-foreground text-xs font-medium focus:border-[#111111] dark:focus:border-white outline-none"
                    >
                      {courts.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-black dark:text-foreground">
                          {c.name} (₱{Number(c.hourly_rate ?? 300).toFixed(2)}/hr)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Hour & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Start Time</Label>
                      <select
                        value={walkInHour}
                        onChange={(e) => setWalkInHour(parseInt(e.target.value, 10))}
                        className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent dark:border-[#27272a] text-[#111111] dark:text-foreground text-xs font-medium focus:border-[#111111] dark:focus:border-white outline-none"
                      >
                        {OPERATING_SLOTS.map((h) => (
                          <option key={h} value={h} className="dark:bg-[#18181c] dark:text-foreground">
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Duration</Label>
                      <select
                        value={walkInDuration}
                        onChange={(e) => setWalkInDuration(parseInt(e.target.value, 10))}
                        className="w-full h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent dark:border-[#27272a] text-[#111111] dark:text-foreground text-xs font-medium focus:border-[#111111] dark:focus:border-white outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                          const currentRate = Number(courts.find((c) => c.id === walkInCourtId)?.hourly_rate ?? 300);
                          return (
                            <option key={h} value={h} className="dark:bg-[#18181c] dark:text-foreground">
                              {h} Hour{h > 1 ? 's' : ''} (₱{(currentRate * h).toLocaleString()})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Client Name & Contact */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Player Full Name</Label>
                    <Input
                      placeholder="e.g. Alex Santos"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      required
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[#111111] dark:text-foreground text-xs focus:border-[#111111] dark:focus:border-white placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Phone Number (Optional)</Label>
                    <Input
                      placeholder="e.g. 0917 123 4567"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[#111111] dark:text-foreground text-xs focus:border-[#111111] dark:focus:border-white placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa]"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">Tender Collected</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWalkInPaymentMethod('cash')}
                        className={`p-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          walkInPaymentMethod === 'cash'
                            ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-[#111111] dark:border-white'
                            : 'bg-[#f5f5f5] dark:bg-[#18181c] border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground'
                        }`}
                      >
                        <Banknote className="w-4 h-4" /> Cash Counter
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalkInPaymentMethod('counter_qr')}
                        className={`p-3 rounded-full border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          walkInPaymentMethod === 'counter_qr'
                            ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-[#111111] dark:border-white'
                            : 'bg-[#f5f5f5] dark:bg-[#18181c] border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground'
                        }`}
                      >
                        <QrCode className="w-4 h-4" /> Counter QR Ph
                      </button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={walkInLoading}
                    className="w-full bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#ededed] text-white dark:text-[#111111] font-semibold rounded-full h-11 transition-colors"
                  >
                    {walkInLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `Confirm & Collect ₱${(300 * walkInDuration).toFixed(2)}`
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: MONTH CALENDAR GRID */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* VIEW 1: MONTH CALENDAR GRID (TABLE GRID SYSTEM - NON-ROUNDED) */}
      {/* ========================================================================= */}
      {viewMode === 'month_grid' && (
        <div className="space-y-4">
          
          {/* Calendar Grid Controls Bar */}
          <div className="p-3.5 sm:p-4 rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleOffsetMonth(-1)}
                className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white px-2 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#FFD21C]" />
                <span>{monthFormattedTitle}</span>
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleOffsetMonth(1)}
                className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setGridMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  handleDateSelect(getTodayStr());
                }}
                className="h-9 px-3 text-xs font-black bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#0B2A67] hover:text-white dark:hover:bg-[#FFD21C] dark:hover:text-[#0B2A67] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 rounded-none transition-all cursor-pointer"
              >
                Today
              </Button>
            </div>

            {/* Court Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#0B2A67] dark:text-slate-300 font-bold mr-1">Filter Court:</span>
              <button
                type="button"
                onClick={() => setSelectedCourtFilter('all')}
                className={`px-3 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer ${
                  selectedCourtFilter === 'all'
                    ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67] shadow-sm'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-[#EDF4FC] hover:text-[#0B2A67] border border-slate-200 dark:border-white/10'
                }`}
              >
                All Courts
              </button>
              {courts.map((court) => {
                const isCourt1 = court.name.includes('1');
                const isCourt2 = court.name.includes('2');
                const isEvent = court.name.toLowerCase().includes('event') || court.name.toLowerCase().includes('banquet');
                const isView = court.name.toLowerCase().includes('view');

                const activeBg = isEvent
                  ? 'bg-[#7c3aed] text-white shadow-sm'
                  : isView
                  ? 'bg-[#ea580c] text-white shadow-sm'
                  : isCourt2
                  ? 'bg-[#007d48] text-white shadow-sm'
                  : 'bg-[#0B2A67] text-white shadow-sm';

                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setSelectedCourtFilter(court.id)}
                    className={`px-3 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer ${
                      selectedCourtFilter === court.id
                        ? activeBg
                        : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-[#EDF4FC] hover:text-[#0B2A67] border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {court.name.split(' - ')[0]}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Mobile Swiping Hint Banner */}
          <div className="lg:hidden flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 py-0.5">
            <span>⟵ Swipe horizontally to view full 7-day grid ⟶</span>
            <button
              type="button"
              onClick={() => setViewMode('day_agenda')}
              className="text-[#0B2A67] dark:text-[#FFD21C] font-black underline cursor-pointer"
            >
              Switch to Mobile Agenda
            </button>
          </div>

          {/* 7-Column Non-Rounded Calendar Table Grid */}
          <div className="overflow-x-auto pb-2 -mx-2 sm:mx-0 px-2 sm:px-0">
            <div className="min-w-[760px] lg:min-w-0 border border-slate-300 dark:border-white/15 bg-slate-300 dark:bg-zinc-800 rounded-none shadow-xs">
              
              {/* Weekday Header Row */}
              <div className="grid grid-cols-7 bg-[#0B2A67] text-white border-b border-slate-300 dark:border-white/15 rounded-none">
                {[
                  { short: 'Sun', full: 'Sunday' },
                  { short: 'Mon', full: 'Monday' },
                  { short: 'Tue', full: 'Tuesday' },
                  { short: 'Wed', full: 'Wednesday' },
                  { short: 'Thu', full: 'Thursday' },
                  { short: 'Fri', full: 'Friday' },
                  { short: 'Sat', full: 'Saturday' },
                ].map((day) => (
                  <div
                    key={day.short}
                    className="py-2.5 sm:py-3 px-2 text-center border-r border-[#071E4B] last:border-r-0 flex flex-col items-center justify-center rounded-none"
                  >
                    <span className="text-xs font-black uppercase tracking-widest text-white">
                      {day.short}
                    </span>
                    <span className="text-[9px] font-semibold text-white/60 tracking-wider hidden md:inline">
                      {day.full}
                    </span>
                  </div>
                ))}
              </div>

              {/* Month Day Cells Grid (1px dividing grid lines without rounded borders) */}
              <div className="grid grid-cols-7 gap-px bg-slate-300 dark:bg-white/15 rounded-none">
                {calendarGridDays.map((dayObj) => {
                  const rawDayBookings = monthBookings[dayObj.dateStr] || [];
                  const dayBookings = rawDayBookings.filter((b) => {
                    if (b.status === 'expired' || b.status === 'cancelled') {
                      return false;
                    }
                    if (b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at) <= new Date()) {
                      return false;
                    }
                    if (selectedCourtFilter !== 'all' && (b.court_id !== selectedCourtFilter && b.courts?.id !== selectedCourtFilter)) {
                      return false;
                    }
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const name = (b.guest_name || b.profiles?.full_name || '').toLowerCase();
                      return name.includes(q);
                    }
                    return true;
                  });

                  return (
                    <div
                      key={dayObj.dateStr}
                      className={`min-h-[140px] sm:min-h-[190px] p-2 sm:p-2.5 rounded-none flex flex-col justify-between transition-colors relative ${
                        !dayObj.isCurrentMonth
                          ? 'bg-slate-50 dark:bg-black/40 text-slate-400 opacity-60'
                          : dayObj.isToday
                          ? 'bg-[#EDF4FC] dark:bg-[#0c1e48] ring-2 ring-inset ring-[#FFD21C]'
                          : 'bg-white dark:bg-[#071E4B] hover:bg-slate-50/80 dark:hover:bg-[#0a235c]'
                      }`}
                    >
                      {/* Day Header Row */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-sm font-black w-6 h-6 sm:w-7 sm:h-7 rounded-none flex items-center justify-center transition-all ${
                              dayObj.isToday
                                ? 'bg-[#FFD21C] text-[#0B2A67] font-black'
                                : dayObj.isCurrentMonth
                                ? 'bg-slate-100 dark:bg-white/10 text-[#0B2A67] dark:text-white'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {dayObj.dayNumber}
                          </span>
                          {dayObj.isToday && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-none bg-[#0B2A67] text-[#FFD21C] tracking-wider hidden sm:inline">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Booking Count Badge or + Add Walkin Button */}
                        <div className="flex items-center gap-1">
                          {dayBookings.length > 0 ? (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-none bg-[#FFD21C] text-[#0B2A67] font-mono shadow-2xs">
                              {dayBookings.length}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openWalkInForSlot(courts[0]?.id || '', 8, dayObj.dateStr)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#0B2A67] hover:text-white dark:hover:bg-[#FFD21C] dark:hover:text-[#0B2A67] bg-[#EDF4FC] dark:bg-[#0c1a3b] px-1.5 py-0.2 rounded-none border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 cursor-pointer"
                              title="Add Walk-in for this date"
                            >
                              + Book
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Booked Sessions Chips (Non-rounded sharp cards) */}
                      <div className="flex-1 py-1.5 space-y-1 overflow-y-auto max-h-[135px] scrollbar-none">
                        {dayBookings.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-4">
                            <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">
                              {dayObj.isCurrentMonth ? '—' : ''}
                            </span>
                          </div>
                        ) : (
                          dayBookings.slice(0, 4).map((b) => {
                            const courtName = b.courts?.name || (b.court_id?.includes('80d4') ? 'Court 1' : 'Court 2');
                            const isCourt2 = courtName.includes('2');
                            const isEvent = courtName.toLowerCase().includes('event') || courtName.toLowerCase().includes('banquet');
                            const isViewDeck = courtName.toLowerCase().includes('view');

                            const borderLeftColor = isEvent
                              ? 'border-l-[#7c3aed]'
                              : isViewDeck
                              ? 'border-l-[#ea580c]'
                              : isCourt2
                              ? 'border-l-[#007d48]'
                              : 'border-l-[#0B2A67]';

                            const isCheckedIn = b.status === 'checked_in';
                            const isCancelled = b.status === 'cancelled';
                            const clientDisplayName = b.guest_name || b.profiles?.full_name || 'Client';

                            return (
                              <div
                                key={b.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                }}
                                className={`p-1.5 rounded-none border-l-[3.5px] border-t-0 border-r border-b border-slate-200 dark:border-white/10 ${borderLeftColor} text-left cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-[#0d1d45] bg-white dark:bg-[#0a1633] flex flex-col gap-0.5 ${
                                  isCancelled
                                    ? 'opacity-50 line-through'
                                    : ''
                                }`}
                                title={`Click details: ${clientDisplayName} (${formatTimeSlot(b.start_time, b.end_time)})`}
                              >
                                <div className="flex items-center justify-between gap-1 truncate">
                                  <span className="text-[11px] font-black text-[#0B2A67] dark:text-white truncate">
                                    {clientDisplayName}
                                  </span>
                                  <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-400 shrink-0">
                                    {courtName.split(' - ')[0]}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                                    {formatTimeSlot(b.start_time, b.end_time)}
                                  </span>
                                  {isCheckedIn ? (
                                    <span className="px-1 py-0.2 rounded-none bg-emerald-100 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider">
                                      ARRIVED
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="px-1 py-0.2 rounded-none bg-red-100 text-red-700 font-extrabold text-[8px] uppercase">
                                      CANCELLED
                                    </span>
                                  ) : (
                                    <span className="px-1 py-0.2 rounded-none bg-blue-50 dark:bg-blue-950/60 text-[#0B2A67] dark:text-blue-300 font-extrabold text-[8px] uppercase">
                                      {b.status === 'paid' ? 'PAID' : 'BOOKED'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}

                        {dayBookings.length > 4 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDateSelect(dayObj.dateStr);
                              setViewMode('day_agenda');
                            }}
                            className="w-full text-center text-[9px] font-black text-[#0B2A67] dark:text-[#FFD21C] hover:underline bg-[#EDF4FC] dark:bg-[#0c1a3b] py-1 rounded-none border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 block shadow-2xs"
                          >
                            +{dayBookings.length - 4} more • Agenda →
                          </button>
                        )}
                      </div>

                      {/* Footer link to switch to day agenda */}
                      <div className="pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            handleDateSelect(dayObj.dateStr);
                            setViewMode('day_agenda');
                          }}
                          className="text-[10px] text-[#0B2A67] dark:text-[#FFD21C] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#0B2A67] dark:text-[#FFD21C]" />
                          <span>View Day</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MOBILE-REACTIVE DAY AGENDA (OPTIMIZED FOR SCHEDULING COORDINATOR) */}
      {/* ========================================================================= */}
      {viewMode === 'day_agenda' && (
        <div className="space-y-4">
          
          {/* Day Navigation Header Card */}
          <div className="p-4 sm:p-5 rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] shadow-xs flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Date Header with Arrow Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(-1)}
                  className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h2 className="text-base sm:text-xl font-black uppercase text-[#0B2A67] dark:text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-[#FFD21C]" />
                    <span>{displayFormattedDate}</span>
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(1)}
                  className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateSelect(getTodayStr())}
                  className="h-9 px-3 text-xs font-black bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#0B2A67] hover:text-white dark:hover:bg-[#FFD21C] dark:hover:text-[#0B2A67] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 rounded-none transition-all cursor-pointer"
                >
                  Today
                </Button>
              </div>

              {/* Date Input for fast jump */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={currentDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="h-9 px-3 rounded-none bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/20 text-xs font-mono font-bold w-auto"
                />
              </div>
            </div>

            {/* Horizontal Scrollable 14-Day Selector Strip (Reactive on mobile) */}
            <div className="overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-1.5 min-w-max">
                {agendaDateStrip.map((item) => (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => handleDateSelect(item.dateStr)}
                    className={`flex flex-col items-center justify-center min-w-[54px] py-2 px-1 border transition-all cursor-pointer rounded-none ${
                      item.isSelected
                        ? 'bg-[#0B2A67] text-white border-[#0B2A67] dark:bg-[#FFD21C] dark:text-[#0B2A67] dark:border-[#FFD21C] shadow-sm font-black'
                        : item.isToday
                        ? 'bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] border-[#0B2A67]/40 dark:border-[#FFD21C]/40 font-bold'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider">{item.dayOfWeek}</span>
                    <span className="text-base font-black leading-tight">{item.dayNumber}</span>
                    {item.count > 0 ? (
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded-none mt-0.5 ${
                        item.isSelected
                          ? 'bg-[#FFD21C] text-[#0B2A67] dark:bg-[#0B2A67] dark:text-white'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200'
                      }`}>
                        {item.count}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 mt-0.5">—</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Day Occupancy: <span className="font-black text-[#0B2A67] dark:text-[#FFD21C]">{bookings.length} Bookings</span>
                </span>
                <span className="text-slate-300 dark:text-white/20">•</span>
                <span className="font-semibold text-[#007d48] dark:text-emerald-400">
                  {checkedInCount} Checked In
                </span>
              </div>

              {/* Quick Court Filter */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCourtFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-none border cursor-pointer ${
                    selectedCourtFilter === 'all'
                      ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                  }`}
                >
                  All
                </button>
                {courts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourtFilter(c.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-none border cursor-pointer shrink-0 ${
                      selectedCourtFilter === c.id
                        ? 'bg-[#0B2A67] text-white dark:bg-[#FFD21C] dark:text-[#0B2A67]'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {c.name.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Court-by-Court Schedule Feed for Mobile */}
          <div className="space-y-4">
            {courts
              .filter((c) => selectedCourtFilter === 'all' || selectedCourtFilter === c.id)
              .map((court) => {
                const courtBookings = bookings.filter((b) => {
                  const bCourtId = b.courts?.id || b.court_id;
                  if (bCourtId !== court.id) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const name = (b.guest_name || b.profiles?.full_name || '').toLowerCase();
                    return name.includes(q);
                  }
                  return true;
                });

                const isCourt2 = court.name.includes('2');
                const isEvent = court.name.toLowerCase().includes('event') || court.name.toLowerCase().includes('banquet');
                const isViewDeck = court.name.toLowerCase().includes('view');

                const bannerColor = isEvent
                  ? 'border-l-4 border-l-[#7c3aed]'
                  : isViewDeck
                  ? 'border-l-4 border-l-[#ea580c]'
                  : isCourt2
                  ? 'border-l-4 border-l-[#007d48]'
                  : 'border-l-4 border-l-[#0B2A67]';

                return (
                  <div
                    key={court.id}
                    className={`border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] rounded-none shadow-xs overflow-hidden ${bannerColor}`}
                  >
                    {/* Court Header */}
                    <div className="p-3 sm:p-4 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-[#0B2A67] dark:text-white uppercase tracking-tight">
                          {court.name}
                        </h3>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          ₱{Number(court.hourly_rate ?? 300).toFixed(2)}/hr &bull; {courtBookings.length} Bookings Today
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openWalkInForSlot(court.id, 8, currentDate)}
                        className="h-8 px-3 text-xs font-bold bg-[#FFD21C] text-[#0B2A67] hover:bg-[#E8BA00] rounded-none cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Book Slot
                      </Button>
                    </div>

                    {/* Bookings List */}
                    <div className="p-3 sm:p-4 divide-y divide-slate-100 dark:divide-white/10">
                      {courtBookings.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No reservations scheduled for this court on {currentDate}.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Operating hours 6:00 AM – 12:00 AM are open.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openWalkInForSlot(court.id, 8, currentDate)}
                            className="mt-3 text-xs rounded-none border-dashed border-[#0B2A67]/30 text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#EDF4FC] cursor-pointer"
                          >
                            + Add Walk-in on this Court
                          </Button>
                        </div>
                      ) : (
                        courtBookings.map((b) => {
                          const isCheckedIn = b.status === 'checked_in';
                          const isCancelled = b.status === 'cancelled';
                          const clientDisplayName = b.guest_name || b.profiles?.full_name || 'Client';

                          return (
                            <div
                              key={b.id}
                              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-[#0B2A67] dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-none">
                                    {formatTimeSlot(b.start_time, b.end_time)}
                                  </span>
                                  {isCheckedIn ? (
                                    <span className="px-2 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-950 text-[#007d48] dark:text-emerald-400 text-[10px] font-black uppercase">
                                      ARRIVED
                                    </span>
                                  ) : isCancelled ? (
                                    <span className="px-2 py-0.5 rounded-none bg-red-100 text-red-700 text-[10px] font-black uppercase">
                                      CANCELLED
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-none bg-blue-100 text-[#0B2A67] dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black uppercase">
                                      {b.status === 'paid' ? 'PAID' : 'BOOKED'}
                                    </span>
                                  )}
                                  {b.duration_hours && (
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                      ({b.duration_hours} hr{b.duration_hours > 1 ? 's' : ''})
                                    </span>
                                  )}
                                </div>

                                <div className="text-sm font-bold text-foreground">
                                  {clientDisplayName}
                                </div>

                                {(b.guest_phone || b.guest_email) && (
                                  <div className="text-xs text-slate-500 flex items-center gap-3">
                                    {b.guest_phone && (
                                      <span className="flex items-center gap-1 font-mono">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {b.guest_phone}
                                      </span>
                                    )}
                                    {b.guest_email && (
                                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        {b.guest_email}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {!isCheckedIn && !isCancelled && (
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      await checkInBooking(b.id);
                                      fetchBookingsForDate(currentDate);
                                      fetchMonthAllBookings(currentMonthStr);
                                    }}
                                    className="h-8 px-3 text-xs font-bold bg-[#007d48] text-white hover:bg-[#00663a] rounded-none cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Check In
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBooking(b)}
                                  className="h-8 px-3 text-xs font-bold border-slate-300 dark:border-white/20 rounded-none cursor-pointer"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: HOURLY MULTI-COURT DAY TIMELINE */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Day Selector & Occupancy Ribbon */}
          <div className="p-3.5 sm:p-4 rounded-none border border-slate-300 dark:border-white/15 bg-white dark:bg-[#071E4B] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(-1)}
                  className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-black text-sm uppercase text-[#0B2A67] dark:text-white tracking-wide px-1">{displayFormattedDate}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(1)}
                  className="h-9 w-9 text-[#0B2A67] dark:text-white border-slate-300 dark:border-white/20 hover:bg-[#EDF4FC] dark:hover:bg-white/10 rounded-none cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {isTodayActive && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-none bg-[#0B2A67] text-[#FFD21C]">
                    Today
                  </span>
                )}
              </div>

              {/* Facility Occupancy Meter */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-none bg-[#EDF4FC] dark:bg-[#0c1a3b] border border-[#0B2A67]/20 dark:border-[#FFD21C]/30 text-xs shadow-2xs">
                <Activity className="w-3.5 h-3.5 text-[#0B2A67] dark:text-[#FFD21C] shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">Occupancy:</span>
                <span className="font-black text-[#0B2A67] dark:text-[#FFD21C]">
                  {occupancyPercent}% ({totalHoursBooked}/{totalCapacityHours} hrs)
                </span>
                <div className="w-16 h-2 bg-slate-200 dark:bg-black/40 rounded-none overflow-hidden ml-1">
                  <div
                    className="h-full bg-gradient-to-r from-[#0B2A67] to-[#007d48] rounded-none transition-all duration-300"
                    style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span>Active Bookings:</span>
                <span className="font-black text-[#0B2A67] dark:text-white bg-[#EDF4FC] dark:bg-[#0c1a3b] px-2.5 py-0.5 rounded-none">{bookings.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span>Checked In:</span>
                <span className="font-black text-[#007d48] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-none border border-emerald-200 dark:border-emerald-800">{checkedInCount} / {bookings.length}</span>
              </div>
            </div>
          </div>

          {/* TIMELINE GRID CONTAINER */}
          <div className="flex-1 bg-white dark:bg-[#071E4B] rounded-none border border-slate-300 dark:border-white/15 overflow-hidden shadow-sm flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="min-w-[2000px]">
                
                {/* Timeline Header: Fixed Court Column + 16 Hourly Slot Columns */}
                <div className="flex border-b border-[#071E4B] sticky top-0 z-30 bg-[#0B2A67] text-white">
                  <div className="w-[260px] min-w-[260px] p-4 font-black text-xs uppercase tracking-wider text-white border-r border-[#071E4B] bg-[#0B2A67] flex items-center gap-2 sticky left-0 z-40">
                    <Trophy className="w-4 h-4 text-[#FFD21C]" />
                    <span>Arena Courts</span>
                  </div>

                  <div
                    className="flex-1 grid relative"
                    style={{
                      gridTemplateColumns: `repeat(${OPERATING_SLOTS.length}, minmax(110px, 1fr))`,
                    }}
                  >
                    {OPERATING_SLOTS.map((hour, idx) => (
                      <div
                        key={hour}
                        style={{ gridColumn: idx + 1 }}
                        className="p-3 text-center text-xs font-black text-white/90 border-r border-white/10 bg-[#071E4B] flex items-center justify-center font-mono"
                      >
                        {formatHour(hour)}
                      </div>
                    ))}

                    {/* Live Current Time Marker */}
                    {isTodayActive && isLiveOperating && (
                      <div
                        style={{ left: `${liveOffsetPercent}%` }}
                        className="absolute top-0 bottom-0 w-[2.5px] bg-[#bf050b] z-50 pointer-events-none"
                      >
                        <span className="absolute -bottom-2.5 -translate-x-1/2 bg-[#bf050b] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-md">
                          LIVE {formatHour(currentPhtHour)}:{String(currentPhtMinute).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Rows per Court */}
                <div className="relative divide-y divide-slate-200 dark:divide-white/10">
                  {courts.map((court) => {
                    const courtBookings = bookings.filter((b) => {
                      const bCourtId = b.courts?.id || b.court_id;
                      return bCourtId === court.id;
                    });

                    const isCourt2 = court.name.includes('2');
                    const dotColor = isCourt2 ? 'bg-[#007d48]' : 'bg-[#0B2A67]';

                    return (
                      <div
                        key={court.id}
                        className="flex border-b border-slate-200 dark:border-white/10 min-h-[120px] relative group hover:bg-[#EDF4FC]/20 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* Court Info */}
                        <div className="w-[260px] min-w-[260px] p-4 text-xs font-bold text-foreground border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#071E4B] sticky left-0 z-20 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${dotColor} shadow-2xs`} />
                              <span className="font-black text-sm text-[#0B2A67] dark:text-white tracking-tight">{court.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <span>₱{Number(court.hourly_rate ?? 300).toFixed(2)} / hr</span>
                              <span>•</span>
                              <span>Pro Cushion</span>
                            </div>
                          </div>
                        </div>

                        {/* 16 Hourly Slots Track */}
                        <div
                          className="flex-1 grid relative bg-white dark:bg-[#0a1633]"
                          style={{
                            gridTemplateColumns: `repeat(${OPERATING_SLOTS.length}, minmax(110px, 1fr))`,
                          }}
                        >
                          {OPERATING_SLOTS.map((hour, idx) => (
                            <div
                              key={hour}
                              style={{ gridColumn: idx + 1, gridRow: 1 }}
                              className="border-r border-slate-100 dark:border-white/10 h-full relative group/slot flex items-center justify-center p-2"
                            >
                              <button
                                type="button"
                                onClick={() => openWalkInForSlot(court.id, hour)}
                                className="opacity-0 group-hover/slot:opacity-100 transition-all text-[10px] font-black bg-[#FFD21C] text-[#0B2A67] hover:bg-[#E8BA00] px-3 py-1 rounded-full flex items-center gap-1 z-10 cursor-pointer shadow-sm"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" /> Book
                              </button>
                            </div>
                          ))}

                          {/* Scheduled Booking Cards on Timeline */}
                          {courtBookings.map((booking) => {
                            const isCheckedIn = booking.status === 'checked_in';
                            const isCancelled = booking.status === 'cancelled';
                            const clientDisplayName = booking.guest_name || booking.profiles?.full_name || 'Client';

                            const bgStyle = isCancelled
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-60 line-through'
                              : isCheckedIn
                              ? 'bg-[#007d48] border-[#005e36] text-white shadow-md'
                              : isCourt2
                              ? 'bg-[#007d48] border-[#005e36] text-white shadow-md'
                              : 'bg-[#0B2A67] border-[#071E4B] text-white shadow-md';

                            return (
                              <div
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                className={`absolute inset-y-2 inset-x-1 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 z-10 border hover:scale-[1.01] ${bgStyle}`}
                                style={{
                                  gridColumn: getGridColumn(booking.start_time, booking.end_time),
                                  gridRow: 1,
                                }}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-black text-xs truncate drop-shadow-xs">
                                    {clientDisplayName}
                                  </span>
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                                    {isCheckedIn ? 'ARRIVED' : booking.status}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/20 font-mono font-bold">
                                  <span>{formatTimeSlot(booking.start_time, booking.end_time)}</span>
                                  <span>#{booking.id.slice(0, 6)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED BOOKING MODAL WITH CLIENT DETAILS & 1-CLICK CHECK-IN */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBooking(null);
            setDpFeedback(null);
            setDownPaymentAmountInput('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#071E4B] border border-slate-200 dark:border-white/15 text-foreground rounded-3xl p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2">
              <DialogTitle className="text-2xl font-black tracking-tight text-[#0B2A67] dark:text-white">
                Reservation Details
              </DialogTitle>
              <span
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-2xs ${
                  selectedBooking?.status === 'checked_in'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#007d48] dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                    : selectedBooking?.status === 'cancelled'
                    ? 'bg-red-50 dark:bg-red-950/60 text-[#bf050b] border-red-300 dark:border-red-800'
                    : 'bg-[#EDF4FC] dark:bg-[#0c1a3b] text-[#0B2A67] dark:text-[#FFD21C] border-[#0B2A67]/20 dark:border-[#FFD21C]/30'
                }`}
              >
                {selectedBooking?.status?.toUpperCase()}
              </span>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-300 font-medium">
              Booking Identifier: <strong className="font-mono text-[#0B2A67] dark:text-[#FFD21C]">#{selectedBooking?.id}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              
              {/* Client Identity Card */}
              <div className="p-4 rounded-2xl border border-[#d2e4f7] dark:border-white/10 bg-[#EDF4FC] dark:bg-[#0c1a3b] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0B2A67] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {(selectedBooking.guest_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-black text-sm text-[#0B2A67] dark:text-white block">
                        {selectedBooking.guest_name || 'Walk-in Client'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Registered Player
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#0B2A67] dark:text-[#FFD21C] bg-white dark:bg-[#071E4B] px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 shadow-2xs">
                    ₱{Number(selectedBooking.total_price || 300).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#d2e4f7] dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                  {selectedBooking.guest_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#0B2A67] dark:text-[#FFD21C]" />
                      <span className="font-semibold">{selectedBooking.guest_phone}</span>
                    </div>
                  )}
                  {selectedBooking.guest_email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-[#0B2A67] dark:text-[#FFD21C]" />
                      <span className="truncate font-semibold">{selectedBooking.guest_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a1633] rounded-2xl p-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5 uppercase tracking-wider text-[10px]">Assigned Court</p>
                  <p className="font-black text-[#0B2A67] dark:text-white text-sm">
                    {selectedBooking.courts?.name || 'Court 1 - Indoor'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5 uppercase tracking-wider text-[10px]">Payment Tender</p>
                  <p className="font-black text-[#0B2A67] dark:text-white text-sm capitalize">
                    {selectedBooking.payment_method === 'counter_qr'
                      ? 'Counter QR Ph'
                      : selectedBooking.payment_method || 'Online Gateway'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5 uppercase tracking-wider text-[10px]">Session Time</p>
                  <p className="font-black text-[#0B2A67] dark:text-white font-mono">
                    {formatTimeSlot(selectedBooking.start_time, selectedBooking.end_time)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-0.5 uppercase tracking-wider text-[10px]">Duration</p>
                  <p className="font-black text-[#0B2A67] dark:text-white">
                    {selectedBooking.duration_hours || 1} Hour Session
                  </p>
                </div>
              </div>

              {/* Down Payment & Google Calendar Direct Sync Card */}
              {(() => {
                const totalPrice = Number(selectedBooking.total_price || 0);
                const downPaymentPaid = Number(
                  selectedBooking.down_payment_amount ||
                    (['paid', 'checked_in'].includes(selectedBooking.status) ? totalPrice : 0)
                );
                const remainingBalance = Math.max(0, totalPrice - downPaymentPaid);
                const isSynced = !!selectedBooking.google_calendar_event_id;

                return (
                  <div className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1a3b] rounded-2xl space-y-3 shadow-xs">
                    {/* Status row */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
                          Payment &amp; Google Calendar
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Paid: <strong className="text-[#007d48] dark:text-emerald-400 font-black">₱{downPaymentPaid.toFixed(2)}</strong>
                          </span>
                          {remainingBalance > 0 && (
                            <span className="text-xs font-semibold text-[#bf050b]">
                              Due: <strong className="font-black">₱{remainingBalance.toFixed(2)}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Google Calendar Direct Push Badge / Trigger */}
                      <div className="flex items-center gap-1.5">
                        {isSynced ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#007d48] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>G-Cal Synced</span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleManualGCalSync}
                            disabled={isSyncingGCal}
                            className="h-7 px-2.5 text-[10px] font-bold rounded-full border-emerald-300 dark:border-emerald-800 text-[#007d48] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            {isSyncingGCal ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 mr-1" />
                                Push to G-Cal
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Feedback message if any */}
                    {dpFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 ${
                          dpFeedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#007d48] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                            : 'bg-red-50 dark:bg-red-950/40 text-[#bf050b] border border-red-200 dark:border-red-900'
                        }`}
                      >
                        {dpFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{dpFeedback.message}</span>
                      </div>
                    )}

                    {/* Record Down Payment Form if balance due */}
                    {remainingBalance > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#0B2A67] dark:text-white">
                            Record Down Payment / Deposit
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDownPaymentAmountInput((remainingBalance * 0.5).toFixed(0))}
                              className="px-2.5 py-0.5 rounded-lg bg-[#EDF4FC] dark:bg-white/10 text-[10px] font-black text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#d2e4f7] cursor-pointer"
                            >
                              50% (₱{(remainingBalance * 0.5).toFixed(0)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setDownPaymentAmountInput(remainingBalance.toFixed(0))}
                              className="px-2.5 py-0.5 rounded-lg bg-[#EDF4FC] dark:bg-white/10 text-[10px] font-black text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#d2e4f7] cursor-pointer"
                            >
                              Full (₱{remainingBalance.toFixed(0)})
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                              ₱
                            </span>
                            <Input
                              type="number"
                              min="1"
                              max={remainingBalance}
                              placeholder="Amount"
                              value={downPaymentAmountInput}
                              onChange={(e) => setDownPaymentAmountInput(e.target.value)}
                              className="h-9 pl-7 pr-2 rounded-xl text-xs bg-slate-50 dark:bg-black/40 font-bold"
                            />
                          </div>

                          <select
                            value={downPaymentMethodInput}
                            onChange={(e) => setDownPaymentMethodInput(e.target.value as any)}
                            className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-bold bg-white dark:bg-black/40 text-foreground outline-none cursor-pointer"
                          >
                            <option value="cash">Cash</option>
                            <option value="gcash">GCash</option>
                            <option value="counter_qr">QR Ph</option>
                          </select>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isRecordingDP || !downPaymentAmountInput}
                            onClick={handleRecordDownPayment}
                            className="h-9 px-3 rounded-xl text-xs font-black bg-[#007d48] hover:bg-[#006037] text-white shrink-0 cursor-pointer shadow-2xs"
                          >
                            {isRecordingDP ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 mr-1" />
                                Record &amp; Sync
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedBooking.notes && (
                <div className="p-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a1633] text-xs text-slate-700 dark:text-slate-300 rounded-xl">
                  <strong className="text-[#0B2A67] dark:text-[#FFD21C]">Special Note:</strong> {selectedBooking.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setSelectedBooking(null)}
                className="border-slate-200 dark:border-white/15 text-foreground hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"
              >
                Close
              </Button>
              {selectedBooking && (
                <a
                  href={getGoogleCalendarOneClickAddUrl({
                    id: selectedBooking.id,
                    courtId: selectedBooking.court_id || selectedBooking.courts?.id || '',
                    courtName: selectedBooking.courts?.name || 'C&J Arena Venue',
                    guestName: selectedBooking.guest_name || selectedBooking.profiles?.full_name || 'Guest',
                    guestPhone: selectedBooking.guest_phone,
                    guestEmail: selectedBooking.guest_email,
                    startTime: selectedBooking.start_time,
                    endTime: selectedBooking.end_time,
                    durationHours: selectedBooking.duration_hours || 1,
                    totalPrice: Number(selectedBooking.total_price || 0),
                    status: selectedBooking.status || 'confirmed',
                    paymentMethod: selectedBooking.payment_method || 'cash',
                    notes: selectedBooking.notes,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-full border border-emerald-300 dark:border-emerald-800 text-[#007d48] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold cursor-pointer shadow-2xs"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-[#007d48] dark:text-emerald-400" />
                  <span>Add to Google Calendar</span>
                </a>
              )}
            </div>
            {selectedBooking?.status !== 'checked_in' && selectedBooking?.status !== 'cancelled' && (
              <Button
                onClick={handleCheckIn}
                disabled={isPending}
                className="bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black rounded-full px-6 h-10 shadow-sm cursor-pointer active:scale-[0.98]"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                )}
                Confirm Player Arrival
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Calendar Live Sync Modal */}
      <GoogleCalendarSyncModal
        isOpen={isGCalModalOpen}
        onClose={() => setIsGCalModalOpen(false)}
      />

    </div>
  );
}