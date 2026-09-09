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
import { checkInBooking } from '@/app/actions';
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
  Eye,
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
  profiles?: { full_name?: string | null } | null;
  courts?: { id?: string; name?: string } | null;
}

export interface ScheduleCourt {
  id: string;
  name: string;
  type?: string;
  hourly_rate?: number;
}

// C&J Court Operational Hours: 6:00 AM (6) to 10:00 PM (22) -> 16 intervals
const START_HOUR = 6;
const END_HOUR = 22;
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
  const [viewMode, setViewMode] = useState<'month_grid' | 'timeline'>('month_grid');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  
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
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
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
    const endHour = new Date(endDate.getTime() + 8 * 3600 * 1000).getUTCHours();

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

  const totalCapacityHours = courts.length * (END_HOUR - START_HOUR); // 2 courts * 16 hrs = 32
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#cacacb] dark:border-[#222226] pb-6">
        
        {/* Left Title & Live Pulse */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              Operations
            </span>
            <span className="text-xs text-[#cacacb] dark:text-[#333338]">•</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-[#111111] dark:text-foreground border border-[#cacacb] dark:border-[#27272a]">
              Live Court Scheduler
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display uppercase tracking-tight text-[#111111] dark:text-foreground">
            TIMELINE &amp; RESERVATIONS
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Real-time court availability matrix, scheduled player check-ins, and walk-in registry.
          </p>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Primary View Switcher: Calendar Grid vs Day Timeline */}
          <div className="flex items-center bg-[#f5f5f5] dark:bg-[#18181c] p-1 rounded-full border border-[#cacacb] dark:border-[#27272a]">
            <button
              type="button"
              onClick={() => setViewMode('month_grid')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'month_grid'
                  ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Calendar Grid</span>
              <span className="sm:hidden">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'timeline'
                  ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                  : 'text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Day Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </button>
          </div>

          {/* Client Search Bar */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-[#707072] dark:text-[#8a8a93] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-[#111111] dark:text-foreground rounded-full text-xs font-medium focus:outline-none focus:border-[#111111] dark:focus:border-white placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground text-xs"
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
            className="border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full h-10 px-4 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync
          </Button>

          {/* Quick Walk-in Modal Trigger */}
          <Dialog
            open={isWalkInOpen}
            onOpenChange={(open) => {
              if (open) setWalkInDate(currentDate);
              setIsWalkInOpen(open);
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#ededed] text-white dark:text-[#111111] h-10 px-5 cursor-pointer">
              <Plus className="h-4 w-4 mr-1" /> + Walk-in
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground rounded-none p-6 sm:p-8 shadow-2xl">
              <form onSubmit={handleCreateWalkIn}>
                <DialogHeader className="space-y-1 pb-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-[#111111] dark:text-foreground">
                    Walk-In Court Booking
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#707072] dark:text-[#8a8a93]">
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
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                          <option key={h} value={h} className="dark:bg-[#18181c] dark:text-foreground">
                            {h} Hour{h > 1 ? 's' : ''} (₱{(300 * h).toLocaleString()})
                          </option>
                        ))}
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
      {viewMode === 'month_grid' && (
        <div className="space-y-4">
          
          {/* Calendar Grid Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleOffsetMonth(-1)}
                className="h-8 w-8 text-[#111111] dark:text-foreground border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-xl font-display uppercase tracking-tight text-[#111111] dark:text-foreground px-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#111111] dark:text-foreground" />
                <span>{monthFormattedTitle}</span>
              </h2>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleOffsetMonth(1)}
                className="h-8 w-8 text-[#111111] dark:text-foreground border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
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
                className="h-8 px-3 text-xs font-semibold text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
              >
                Today
              </Button>
            </div>

            {/* Court Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#707072] dark:text-[#8a8a93] font-semibold mr-1">Filter Court:</span>
              <button
                type="button"
                onClick={() => setSelectedCourtFilter('all')}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedCourtFilter === 'all'
                    ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                    : 'bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground hover:bg-[#e5e5e5] dark:hover:bg-[#222226]'
                }`}
              >
                All Courts
              </button>
              {courts.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => setSelectedCourtFilter(court.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    selectedCourtFilter === court.id
                      ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                      : 'bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground hover:bg-[#e5e5e5] dark:hover:bg-[#222226]'
                  }`}
                >
                  {court.name.split(' - ')[0]}
                </button>
              ))}
            </div>

          </div>

          {/* 7-Column Calendar Grid Matrix */}
          <div className="border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] overflow-hidden">
            
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Day Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#cacacb] dark:divide-[#27272a] bg-white dark:bg-[#121215]">
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
                    className={`min-h-[150px] sm:min-h-[190px] p-2.5 flex flex-col justify-between transition-colors group relative ${
                      !dayObj.isCurrentMonth
                        ? 'bg-[#f5f5f5]/50 dark:bg-[#18181c]/30 text-[#707072] dark:text-[#66666e] opacity-50'
                        : dayObj.isToday
                        ? 'bg-[#f5f5f5] dark:bg-[#18181c] ring-1 ring-inset ring-[#111111] dark:ring-white/40'
                        : 'hover:bg-[#f5f5f5]/40 dark:hover:bg-[#18181c]/40'
                    }`}
                  >
                    
                    {/* Day Cell Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-[#222226]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            dayObj.isToday
                              ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                              : dayObj.isCurrentMonth
                              ? 'text-[#111111] dark:text-foreground'
                              : 'text-[#707072] dark:text-[#66666e]'
                          }`}
                        >
                          {dayObj.dayNumber}
                        </span>
                        {dayObj.isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#111111] dark:text-foreground hidden sm:inline">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Booking Count Badge or + Add Walkin Button */}
                      <div className="flex items-center gap-1">
                        {dayBookings.length > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-[#111111] dark:text-foreground border border-[#cacacb] dark:border-[#27272a]">
                            {dayBookings.length}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openWalkInForSlot(courts[0]?.id || '', 8, dayObj.dateStr)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-[#111111] dark:text-foreground hover:bg-[#111111] dark:hover:bg-white hover:text-white dark:hover:text-[#111111] bg-[#f5f5f5] dark:bg-[#18181c] px-2 py-0.5 rounded-full border border-[#cacacb] dark:border-[#27272a] cursor-pointer"
                            title="Add Walk-in for this date"
                          >
                            + Book
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Booked Sessions Chips */}
                    <div className="flex-1 py-1.5 space-y-1 overflow-y-auto max-h-[135px] scrollbar-none">
                      {dayBookings.length === 0 ? (
                        <div className="h-full flex items-center justify-center py-4">
                          <span className="text-[10px] text-[#707072] dark:text-[#66666e] font-medium">
                            {dayObj.isCurrentMonth ? 'Available' : ''}
                          </span>
                        </div>
                      ) : (
                        dayBookings.slice(0, 4).map((b) => {
                          const courtName = b.courts?.name || (b.court_id?.includes('80d4') ? 'Court 1' : 'Court 2');
                          const courtLabel = courtName.includes('2') ? 'Court 2' : 'Court 1';
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
                              className={`p-1.5 rounded-md border text-left cursor-pointer transition-all hover:border-[#111111] dark:hover:border-white/50 flex flex-col gap-0.5 ${
                                isCancelled
                                  ? 'bg-[#f5f5f5] dark:bg-[#18181c] border-[#cacacb] dark:border-[#27272a] text-[#707072] dark:text-[#66666e] line-through opacity-60'
                                  : isCheckedIn
                                  ? 'bg-[#f5f5f5] dark:bg-[#007d48]/10 border-[#007d48]/50 text-[#007d48]'
                                  : 'bg-[#f5f5f5] dark:bg-[#1a1a1f] border-[#cacacb] dark:border-[#2a2a30] text-[#111111] dark:text-foreground'
                              }`}
                              title={`Click to check in: ${clientDisplayName} (${formatTimeSlot(b.start_time, b.end_time)})`}
                            >
                              {/* Client Full Name */}
                              <div className="flex items-center justify-between gap-1 truncate">
                                <span className="text-[11px] font-bold text-[#111111] dark:text-foreground truncate">
                                  {clientDisplayName}
                                </span>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93] shrink-0">
                                  {courtLabel}
                                </span>
                              </div>

                              {/* Time Range */}
                              <div className="flex items-center justify-between text-[9px] text-[#707072] dark:text-[#8a8a93] font-mono">
                                <span>{formatTimeSlot(b.start_time, b.end_time)}</span>
                                {isCheckedIn && (
                                  <span className="text-[8px] font-bold text-[#007d48]">ARRIVED</span>
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
                            setViewMode('timeline');
                          }}
                          className="w-full text-center text-[9px] font-bold text-[#111111] dark:text-foreground hover:underline bg-[#f5f5f5] dark:bg-[#18181c] py-1 rounded border border-[#cacacb] dark:border-[#27272a] block"
                        >
                          +{dayBookings.length - 4} more • Timeline →
                        </button>
                      )}
                    </div>

                    {/* Footer link to switch to single day timeline */}
                    <div className="pt-1 border-t border-[#e5e5e5] dark:border-[#222226] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          handleDateSelect(dayObj.dateStr);
                          setViewMode('timeline');
                        }}
                        className="text-[9px] text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Day Timeline
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: HOURLY MULTI-COURT DAY TIMELINE */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Day Selector & Occupancy Ribbon */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(-1)}
                  className="h-8 w-8 text-[#111111] dark:text-foreground border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-bold text-sm uppercase text-[#111111] dark:text-foreground tracking-wide">{displayFormattedDate}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleOffsetDay(1)}
                  className="h-8 w-8 text-[#111111] dark:text-foreground border-[#cacacb] dark:border-[#27272a] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {isTodayActive && (
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111]">
                    Today
                  </span>
                )}
              </div>

              {/* Facility Occupancy Meter */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-xs">
                <Activity className="w-3.5 h-3.5 text-[#111111] dark:text-foreground shrink-0" />
                <span className="text-[#707072] dark:text-[#8a8a93] font-medium">Occupancy:</span>
                <span className="font-bold text-[#111111] dark:text-foreground">
                  {occupancyPercent}% ({totalHoursBooked}/{totalCapacityHours} hrs)
                </span>
                <div className="w-16 h-1.5 bg-[#cacacb] dark:bg-[#333338] rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full bg-[#111111] dark:bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-[#707072] dark:text-[#8a8a93]">
                <span>Active Bookings:</span>
                <span className="font-bold text-[#111111] dark:text-foreground">{bookings.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#707072] dark:text-[#8a8a93]">
                <span>Checked In:</span>
                <span className="font-bold text-[#007d48]">{checkedInCount} / {bookings.length}</span>
              </div>
            </div>
          </div>

          {/* TIMELINE GRID CONTAINER */}
          <div className="flex-1 bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] overflow-hidden flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="min-w-[2000px]">
                
                {/* Timeline Header: Fixed Court Column + 16 Hourly Slot Columns */}
                <div className="flex border-b border-[#cacacb] dark:border-[#27272a] sticky top-0 z-30 bg-[#f5f5f5] dark:bg-[#18181c]">
                  <div className="w-[260px] min-w-[260px] p-4 font-bold text-xs uppercase tracking-wider text-[#707072] dark:text-[#8a8a93] border-r border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] flex items-center gap-2 sticky left-0 z-40">
                    <Trophy className="w-4 h-4 text-[#111111] dark:text-foreground" />
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
                        className="p-3 text-center text-xs font-bold text-[#707072] dark:text-[#8a8a93] border-r border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] flex items-center justify-center font-mono"
                      >
                        {formatHour(hour)}
                      </div>
                    ))}

                    {/* Live Current Time Marker */}
                    {isTodayActive && isLiveOperating && (
                      <div
                        style={{ left: `${liveOffsetPercent}%` }}
                        className="absolute top-0 bottom-0 w-[2px] bg-[#d30005] z-50 pointer-events-none"
                      >
                        <span className="absolute -bottom-2 -translate-x-1/2 bg-[#d30005] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                          LIVE {formatHour(currentPhtHour)}:{String(currentPhtMinute).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Rows per Court */}
                <div className="relative divide-y divide-[#cacacb] dark:divide-[#27272a]">
                  {courts.map((court) => {
                    const courtBookings = bookings.filter((b) => {
                      const bCourtId = b.courts?.id || b.court_id;
                      return bCourtId === court.id;
                    });

                    return (
                      <div
                        key={court.id}
                        className="flex border-b border-[#cacacb] dark:border-[#27272a] min-h-[115px] relative group hover:bg-[#f5f5f5]/30 dark:hover:bg-[#18181c]/30 transition-colors"
                      >
                        {/* Court Info */}
                        <div className="w-[260px] min-w-[260px] p-4 text-xs font-bold text-[#111111] dark:text-foreground border-r border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] sticky left-0 z-20 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#007d48]" />
                              <span className="font-bold text-sm text-[#111111] dark:text-foreground tracking-tight">{court.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-4.5 text-[11px] font-medium text-[#707072] dark:text-[#8a8a93]">
                              <span>₱{Number(court.hourly_rate ?? 300).toFixed(2)} / hr</span>
                              <span>•</span>
                              <span>Pro Cushion</span>
                            </div>
                          </div>
                        </div>

                        {/* 16 Hourly Slots Track */}
                        <div
                          className="flex-1 grid relative bg-white dark:bg-[#121215]"
                          style={{
                            gridTemplateColumns: `repeat(${OPERATING_SLOTS.length}, minmax(110px, 1fr))`,
                          }}
                        >
                          {OPERATING_SLOTS.map((hour, idx) => (
                            <div
                              key={hour}
                              style={{ gridColumn: idx + 1, gridRow: 1 }}
                              className="border-r border-[#e5e5e5] dark:border-[#222226] h-full relative group/slot flex items-center justify-center p-2"
                            >
                              <button
                                type="button"
                                onClick={() => openWalkInForSlot(court.id, hour)}
                                className="opacity-0 group-hover/slot:opacity-100 transition-all text-[10px] font-semibold bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-[#ededed] px-2.5 py-1 rounded-full flex items-center gap-1 z-10 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Book
                              </button>
                            </div>
                          ))}

                          {/* Scheduled Booking Cards on Timeline */}
                          {courtBookings.map((booking) => {
                            const isCheckedIn = booking.status === 'checked_in';
                            const isCancelled = booking.status === 'cancelled';
                            const clientDisplayName = booking.guest_name || booking.profiles?.full_name || 'Client';

                            return (
                              <div
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                className={`absolute inset-y-2 rounded-none p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 z-10 border ${
                                  isCancelled
                                    ? 'bg-[#f5f5f5] dark:bg-[#18181c] border-[#cacacb] dark:border-[#27272a] text-[#707072] dark:text-[#8a8a93] opacity-60 line-through'
                                    : isCheckedIn
                                    ? 'bg-[#007d48] border-[#007d48] text-white'
                                    : 'bg-[#111111] dark:bg-[#222228] border-[#111111] dark:border-[#33333a] text-white'
                                }`}
                                style={{
                                  gridColumn: getGridColumn(booking.start_time, booking.end_time),
                                  gridRow: 1,
                                }}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-xs truncate">
                                    {clientDisplayName}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                                    {booking.status}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/20 font-mono">
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
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground rounded-none p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2">
              <DialogTitle className="text-2xl font-bold tracking-tight text-[#111111] dark:text-foreground">
                Reservation Details
              </DialogTitle>
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                  selectedBooking?.status === 'checked_in'
                    ? 'bg-[#f5f5f5] dark:bg-[#007d48]/10 text-[#007d48] border-[#007d48]/40'
                    : selectedBooking?.status === 'cancelled'
                    ? 'bg-[#f5f5f5] dark:bg-[#d30005]/10 text-[#d30005] border-[#d30005]/40'
                    : 'bg-[#f5f5f5] dark:bg-[#18181c] text-[#111111] dark:text-foreground border-[#cacacb] dark:border-[#27272a]'
                }`}
              >
                {selectedBooking?.status?.toUpperCase()}
              </span>
            </div>
            <DialogDescription className="text-xs text-[#707072] dark:text-[#8a8a93]">
              Booking Identifier: <strong className="font-mono text-[#111111] dark:text-foreground">#{selectedBooking?.id}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              
              {/* Client Identity Card */}
              <div className="p-4 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#111111] dark:text-foreground" />
                    <span className="font-bold text-sm text-[#111111] dark:text-foreground">
                      {selectedBooking.guest_name || 'Walk-in Client'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#111111] dark:text-foreground bg-white dark:bg-[#121215] px-2.5 py-0.5 rounded-full border border-[#cacacb] dark:border-[#27272a]">
                    ₱{Number(selectedBooking.total_price || 300).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#cacacb] dark:border-[#27272a] text-xs text-[#707072] dark:text-[#8a8a93]">
                  {selectedBooking.guest_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedBooking.guest_phone}</span>
                    </div>
                  )}
                  {selectedBooking.guest_email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{selectedBooking.guest_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#121215] p-4">
                <div>
                  <p className="text-[#707072] dark:text-[#8a8a93] font-semibold mb-0.5">Assigned Court</p>
                  <p className="font-bold text-[#111111] dark:text-foreground">
                    {selectedBooking.courts?.name || 'Court 1 - Indoor'}
                  </p>
                </div>

                <div>
                  <p className="text-[#707072] dark:text-[#8a8a93] font-semibold mb-0.5">Payment Tender</p>
                  <p className="font-bold text-[#111111] dark:text-foreground capitalize">
                    {selectedBooking.payment_method === 'counter_qr'
                      ? 'Counter QR Ph'
                      : selectedBooking.payment_method || 'Online Gateway'}
                  </p>
                </div>

                <div>
                  <p className="text-[#707072] dark:text-[#8a8a93] font-semibold mb-0.5">Session Time</p>
                  <p className="font-bold text-[#111111] dark:text-foreground">
                    {formatTimeSlot(selectedBooking.start_time, selectedBooking.end_time)}
                  </p>
                </div>

                <div>
                  <p className="text-[#707072] dark:text-[#8a8a93] font-semibold mb-0.5">Duration</p>
                  <p className="font-bold text-[#111111] dark:text-foreground">
                    {selectedBooking.duration_hours || 1} Hour Session
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="p-3 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-[#111111] dark:text-foreground">
                  <strong>Special Note:</strong> {selectedBooking.notes}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedBooking(null)}
              className="border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] rounded-full"
            >
              Close
            </Button>
            {selectedBooking?.status !== 'checked_in' && selectedBooking?.status !== 'cancelled' && (
              <Button
                onClick={handleCheckIn}
                disabled={isPending}
                className="bg-[#111111] dark:bg-white hover:bg-[#222222] dark:hover:bg-[#ededed] text-white dark:text-[#111111] font-semibold rounded-full px-6"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                )}
                Confirm Player Arrival
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}