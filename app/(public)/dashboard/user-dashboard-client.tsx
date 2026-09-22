'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Printer,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  Award,
  Lock,
  ShieldCheck,
  Trophy,
  Flame,
  QrCode,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Check,
  X,
  CreditCard,
  Building,
  RotateCcw,
} from 'lucide-react';
import { cancelBooking, updateUserPassword } from '@/app/actions';
import { RefundRequestModal } from '@/components/refund-request-modal';
import { RescheduleModal } from '@/components/reschedule-modal';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { playHapticSound } from '@/lib/motion-feedback';

export interface UserBookingItem {
  id: string;
  court_id?: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  currency: string;
  status: string;
  payment_method: string;
  court_name: string;
  created_at: string;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
}

export default function UserDashboardClient({
  profile,
  email,
  bookings,
}: {
  profile: { full_name: string | null; created_at: string };
  email: string;
  bookings: UserBookingItem[];
}) {
  const [activeBookings, setActiveBookings] = useState<UserBookingItem[]>(bookings);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refundModalBooking, setRefundModalBooking] = useState<UserBookingItem | null>(null);
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<UserBookingItem | null>(null);
  const [passModalBooking, setPassModalBooking] = useState<UserBookingItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'settings'>('upcoming');
  const [isPending, startTransition] = useTransition();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordState(null);

    if (newPassword.length < 6) {
      playHapticSound('error');
      setPasswordState({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      playHapticSound('error');
      setPasswordState({ type: 'error', text: 'Passwords do not match. Please verify.' });
      return;
    }

    setIsUpdatingPassword(true);
    const formData = new FormData();
    formData.append('password', newPassword);

    const result = await updateUserPassword(formData);
    if (result.error) {
      playHapticSound('error');
      setPasswordState({ type: 'error', text: result.error });
    } else {
      playHapticSound('success');
      setPasswordState({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  };

  const now = new Date();
  const upcomingBookings = activeBookings.filter(
    (b) => new Date(b.start_time) > now && !['cancelled', 'expired'].includes(b.status)
  );
  const pastBookings = activeBookings.filter(
    (b) => new Date(b.start_time) <= now || ['cancelled', 'expired'].includes(b.status)
  );

  const firstName = profile?.full_name?.split(' ')[0] || 'Player';
  const totalHoursPlayed = pastBookings.reduce((acc, curr) => acc + (curr.duration_hours || 1), 0);

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));

  const formatTime = (dateStr: string) =>
    new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(dateStr)
    );

  const formatMemberSince = (dateStr: string) =>
    new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(
      new Date(dateStr)
    );

  const getCancellationInfo = (startTimeStr: string) => {
    const bookingDate = new Date(startTimeStr);
    const msDiff = bookingDate.getTime() - Date.now();
    const hoursRemaining = msDiff / (1000 * 60 * 60);

    return {
      isEligible: hoursRemaining >= 48,
      hoursRemaining: Math.max(0, Math.floor(hoursRemaining)),
      hoursTotal: hoursRemaining,
    };
  };

  const handleCancelClick = (booking: UserBookingItem) => {
    playHapticSound('tap');
    const info = getCancellationInfo(booking.start_time);
    if (!info.isEligible) {
      playHapticSound('error');
      setFeedbackMessage({
        type: 'error',
        text: 'Cancellations with refund must be requested at least 2 days (48 hours) in advance. You can reschedule your booking instead!',
      });
      return;
    }
    setRefundModalBooking(booking);
  };

  const handleRescheduleClick = (booking: UserBookingItem) => {
    playHapticSound('tap');
    setRescheduleModalBooking(booking);
  };

  const handleRescheduleSuccess = (
    message: string,
    newStartTime: string,
    newCourtName: string
  ) => {
    if (rescheduleModalBooking) {
      const bId = rescheduleModalBooking.id;
      const duration = rescheduleModalBooking.duration_hours || 1;
      const newEndTime = new Date(new Date(newStartTime).getTime() + duration * 3600 * 1000).toISOString();

      setActiveBookings((prev) =>
        prev.map((b) =>
          b.id === bId
            ? {
                ...b,
                court_name: newCourtName,
                start_time: newStartTime,
                end_time: newEndTime,
              }
            : b
        )
      );
    }
    setRescheduleModalBooking(null);
    playHapticSound('success');
    setFeedbackMessage({
      type: 'success',
      text: message,
    });
  };

  const handleRefundConfirmed = (bookingId: string) => {
    setRefundModalBooking(null);
    playHapticSound('success');
    setFeedbackMessage({
      type: 'success',
      text: 'Booking cancelled. Refund request submitted for processing within 24-48 hours.',
    });
    startTransition(async () => {
      setCancellingId(bookingId);
      const res = await cancelBooking(bookingId);
      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error });
      } else {
        setActiveBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled', refund_status: 'pending' } : b
          )
        );
      }
      setCancellingId(null);
    });
  };

  const handleTabChange = (tab: 'upcoming' | 'history' | 'settings') => {
    playHapticSound('tap');
    setActiveTab(tab);
  };

  const openPassModal = (booking?: UserBookingItem) => {
    playHapticSound('scan');
    if (booking) {
      setPassModalBooking(booking);
    } else if (upcomingBookings.length > 0) {
      setPassModalBooking(upcomingBookings[0]);
    } else {
      setPassModalBooking({
        id: 'CJ-MEMBERSHIP-PASS',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        duration_hours: 1,
        total_price: 300,
        currency: 'PHP',
        status: 'active',
        payment_method: 'Member Card',
        court_name: 'Court 1 — Indoor Cushion',
        created_at: profile?.created_at || new Date().toISOString(),
      });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-8 md:py-12 font-sans space-y-8">
      
      {/* ========================================================
          1. ATHLETIC DIGITAL MEMBER PASS HERO CARD
          ======================================================== */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0B2A67] via-[#071E4B] to-[#041233] text-white p-6 sm:p-10 border border-[#FFD21C]/30 shadow-2xl overflow-hidden">
        {/* Decorative Gold & Crimson Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD21C]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#bf050b]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Member Details */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-1 bg-[#bf050b] rounded-full" />
              <span className="text-xs font-black uppercase tracking-widest text-[#FFD21C]">
                C&amp;J Athlete Portal
              </span>
              <span className="text-white/30">•</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#007d48]/25 border border-[#007d48]/50 text-[#52d694] text-[11px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#52d694] animate-pulse" />
                Active Member
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight">
              {firstName}&apos;S <span className="text-[#FFD21C]">PLAYER PASS</span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-white/80 font-medium">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#FFD21C]" />
                <span>Taytay, Rizal Arena</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#52d694]" />
                <span>{email}</span>
              </div>
              <span className="text-white/30">•</span>
              <span>Member since {profile?.created_at ? formatMemberSince(profile.created_at) : '2026'}</span>
            </div>
          </div>

          {/* Right Action Block: Digital QR Badge & CTA */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-4 shrink-0">
            
            {/* Scannable Digital Pass Badge */}
            <button
              onClick={() => openPassModal()}
              type="button"
              className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-[#FFD21C] transition-all text-left group cursor-pointer flex items-center gap-3.5 shadow-lg active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-white text-[#0B2A67] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#FFD21C] transition-colors">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#FFD21C] uppercase tracking-wider">
                    Digital QR Pass
                  </span>
                  <Sparkles className="w-3 h-3 text-[#FFD21C]" />
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#FFD21C] transition-colors">
                  Tap to View Counter Pass
                </h4>
                <p className="text-[10px] text-white/60">Fast check-in at Taytay Arena</p>
              </div>
            </button>

            {/* Book Court CTA */}
            <Link href="/book" className="w-full sm:w-auto">
              <Button
                size="lg"
                onClick={() => playHapticSound('tap')}
                className="w-full sm:w-auto bg-[#FFD21C] text-[#0B2A67] hover:bg-[#ffe052] text-xs sm:text-sm font-black uppercase tracking-wider h-13 px-8 rounded-2xl shadow-xl shadow-[#FFD21C]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Book a Court (₱300/hr)</span>
              </Button>
            </Link>
          </div>

        </div>
      </div>

      {/* ========================================================
          2. ATHLETIC METRICS BAR (4 HIGH-IMPACT METRIC CARDS)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Upcoming Bookings */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#071E4B]/40 border border-[#E2E8F0] dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
              Upcoming Sessions
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#bf050b]/10 text-[#bf050b] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={upcomingBookings.length}
              currency=""
              decimals={0}
              className="text-3xl sm:text-4xl font-black text-[#0B2A67] dark:text-white"
            />
            <span className="text-xs text-[#64748B] dark:text-white/60 font-semibold">booked</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-white/60">Scheduled match play</p>
        </div>

        {/* Metric 2: Lifetime Court Hours */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#071E4B]/40 border border-[#E2E8F0] dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
              Lifetime Play
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFD21C]/20 text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={totalHoursPlayed}
              currency=""
              decimals={0}
              className="text-3xl sm:text-4xl font-black text-[#0B2A67] dark:text-white"
            />
            <span className="text-xs font-bold text-[#0B2A67] dark:text-[#FFD21C]">hrs</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-white/60">Total time on court</p>
        </div>

        {/* Metric 3: Court Surface Spec */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#071E4B]/40 border border-[#E2E8F0] dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
              Court Surface
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#007d48]/10 text-[#007d48] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-[#0B2A67] dark:text-white pt-1">
            Cushioned
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-white/60">Shock-Absorbing Sports Floor</p>
        </div>

        {/* Metric 4: Court Dimensions */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#071E4B]/40 border border-[#E2E8F0] dark:border-white/10 shadow-sm hover:shadow-md transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C]">
              Court Geometry
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFD21C]/20 text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-[#0B2A67] dark:text-white pt-1">
            20&apos; × 44&apos;
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-white/60">Standard Regulation Dimensions</p>
        </div>

      </div>

      {/* ========================================================
          3. FEEDBACK TOAST ALERTS
          ======================================================== */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'border-[#007d48]/30 bg-[#007d48]/10 text-[#007d48] dark:text-[#52d694]'
              : 'border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b] dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#007d48] dark:text-[#52d694] shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-[#bf050b] shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          4. MAIN TABS & CONTENT
          ======================================================== */}
      <div className="space-y-6">
        
        {/* Custom Styled Tab Controls */}
        <div className="flex items-center gap-2 p-1.5 bg-[#F1F5F9] dark:bg-[#071E4B]/60 rounded-2xl border border-[#E2E8F0] dark:border-white/10 w-fit">
          <button
            type="button"
            onClick={() => handleTabChange('upcoming')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-[#0B2A67] text-white shadow-md'
                : 'text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#FFD21C]" />
            <span>Upcoming Sessions ({upcomingBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[#0B2A67] text-white shadow-md'
                : 'text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#FFD21C]" />
            <span>Booking History ({pastBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-[#0B2A67] text-white shadow-md'
                : 'text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-[#FFD21C]" />
            <span>Account &amp; Security</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: UPCOMING SESSIONS
            ======================================================== */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {upcomingBookings.length === 0 ? (
              <div className="rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-10 sm:p-14 text-center bg-white dark:bg-[#071E4B]/40 space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center mx-auto shadow-inner">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#0B2A67] dark:text-white">
                    No Scheduled Court Rallies
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-white/70 max-w-md mx-auto leading-relaxed">
                    Ready for your next match? Reserve single or multi-hour slots on Courts 1 &amp; 2 in Taytay, Rizal.
                  </p>
                </div>
                <Link href="/book">
                  <Button
                    size="lg"
                    onClick={() => playHapticSound('tap')}
                    className="bg-[#0B2A67] hover:bg-[#123A82] text-white text-xs font-bold h-12 px-7 rounded-xl shadow-md cursor-pointer mt-2"
                  >
                    <span>Book a Court Now (₱300/hr)</span>
                    <ArrowRight className="w-4 h-4 text-[#FFD21C] ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              upcomingBookings.map((b) => {
                const cancelInfo = getCancellationInfo(b.start_time);
                return (
                  <div
                    key={b.id}
                    className="p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#071E4B]/40 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
                          {b.court_name}
                        </span>
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-[#007d48]/10 text-[#007d48] dark:text-[#52d694] border border-[#007d48]/25 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed
                        </span>
                        {cancelInfo.isEligible ? (
                          <span className="text-[10px] font-semibold text-[#007d48] bg-[#007d48]/10 px-2.5 py-0.5 rounded-full border border-[#007d48]/20">
                            100% Refund Eligible ({cancelInfo.hoursRemaining}h left)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                            Non-refundable (&lt;2 days) • Reschedule Available
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#64748B] dark:text-white/80">
                        <div className="flex items-center gap-1.5 text-[#0B2A67] dark:text-white font-extrabold">
                          <CalendarDays className="w-4 h-4 text-[#FFD21C]" />
                          <span>{formatDate(b.start_time)}</span>
                        </div>
                        <span className="text-white/30">•</span>
                        <div className="flex items-center gap-1.5 text-[#0B2A67] dark:text-white font-extrabold">
                          <Clock className="w-4 h-4 text-[#FFD21C]" />
                          <span>{formatTime(b.start_time)} – {formatTime(b.end_time)} ({b.duration_hours} hr)</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-white/60">
                        <span>Taytay, Rizal Arena</span>
                        <span>•</span>
                        <span>Payment: {b.payment_method}</span>
                        <span>•</span>
                        <span className="font-bold text-[#0B2A67] dark:text-[#FFD21C]">Total Paid: ₱{b.total_price.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPassModal(b)}
                        className="text-xs border-[#0B2A67]/30 text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#FFD21C]" />
                        <span>Pass</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRescheduleClick(b)}
                        className="text-xs border-[#FFD21C]/60 text-[#0B2A67] dark:text-[#FFD21C] hover:bg-[#FFD21C]/15 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#FFD21C]" />
                        <span>Reschedule</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending && cancellingId === b.id}
                        onClick={() => handleCancelClick(b)}
                        className={`text-xs font-bold rounded-xl cursor-pointer ${
                          cancelInfo.isEligible
                            ? 'border-[#bf050b]/30 text-[#bf050b] hover:bg-[#bf050b]/10'
                            : 'border-slate-300 dark:border-white/15 text-slate-400 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                        title={
                          cancelInfo.isEligible
                            ? 'Cancel reservation and request refund'
                            : 'Refund unavailable within 2 days. Click Reschedule to move your session.'
                        }
                      >
                        {isPending && cancellingId === b.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Cancel & Refund'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: BOOKING HISTORY
            ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {pastBookings.length === 0 ? (
              <div className="rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-12 text-center bg-white dark:bg-[#071E4B]/40 text-xs text-[#64748B] dark:text-white/60 font-semibold">
                No past sessions or cancelled bookings on record.
              </div>
            ) : (
              pastBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#071E4B]/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm text-[#0B2A67] dark:text-white">{b.court_name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          b.status === 'cancelled'
                            ? 'bg-[#bf050b]/10 text-[#bf050b] border border-[#bf050b]/25'
                            : 'bg-[#F1F5F9] dark:bg-white/10 text-[#64748B] dark:text-white/80'
                        }`}
                      >
                        {b.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                      </span>
                    </div>
                    <p className="text-[#64748B] dark:text-white/70">
                      {formatDate(b.start_time)} • {formatTime(b.start_time)} – {formatTime(b.end_time)} ({b.duration_hours} hr) • ₱{b.total_price.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-[#64748B] dark:text-white/50 font-mono text-[11px] bg-[#F1F5F9] dark:bg-white/5 px-3 py-1 rounded-lg w-fit">
                    ID: {b.id.slice(0, 8)}...
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: PLAYER SETTINGS & SECURITY
            ======================================================== */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-200">
            <div className="p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#071E4B]/40 max-w-2xl shadow-sm space-y-6">
              <div className="border-b border-[#E2E8F0] dark:border-white/10 pb-4">
                <h3 className="text-lg font-extrabold tracking-tight text-[#0B2A67] dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#FFD21C]" />
                  <span>Password &amp; Security Settings</span>
                </h3>
                <p className="text-xs text-[#64748B] dark:text-white/60 mt-1">
                  Update your authentication credentials for C&amp;J Player Portal.
                </p>
              </div>

              {passwordState && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                    passwordState.type === 'success'
                      ? 'border-[#007d48]/30 bg-[#007d48]/10 text-[#007d48] dark:text-[#52d694]'
                      : 'border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b] dark:text-red-400'
                  }`}
                >
                  {passwordState.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#007d48] shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#bf050b] shrink-0" />
                  )}
                  <span>{passwordState.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                
                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="h-12 w-full pl-4 pr-12 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-[#F8FAFC] dark:bg-[#030F28] text-sm text-[#0B2A67] dark:text-white focus:outline-none focus:border-[#0B2A67] dark:focus:border-[#FFD21C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-12 w-full pl-4 pr-12 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-[#F8FAFC] dark:bg-[#030F28] text-sm text-[#0B2A67] dark:text-white focus:outline-none focus:border-[#0B2A67] dark:focus:border-[#FFD21C] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0B2A67] dark:hover:text-white cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B] dark:text-white/60">Must be at least 6 characters long.</p>
                </div>

                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  onClick={() => playHapticSound('tap')}
                  className="bg-[#0B2A67] hover:bg-[#123A82] text-white text-xs font-black uppercase tracking-wider h-12 px-7 rounded-xl cursor-pointer mt-2 shadow-md flex items-center gap-2"
                >
                  {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-[#FFD21C]" />}
                  <span>Update Password</span>
                </Button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          5. DIGITAL QR PASS MODAL
          ======================================================== */}
      {passModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#FFD21C]/40 text-[#0B2A67] space-y-0">
            
            {/* Modal Header Strip */}
            <div className="p-6 bg-[#0B2A67] text-white flex items-center justify-between border-b border-white/15">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FFD21C]" />
                <span className="font-extrabold uppercase tracking-widest text-xs text-[#FFD21C]">
                  C&amp;J Official Digital Pass
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPassModalBooking(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pass Body (Printable Area) */}
            <div className="p-6 sm:p-8 space-y-6 text-center bg-gradient-to-b from-[#F8FAFC] to-white">
              
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#bf050b] uppercase tracking-wider block">
                  Taytay, Rizal Arena Pass
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-[#0B2A67]">
                  {firstName}&apos;S MATCH PASS
                </h3>
                <p className="text-xs text-[#64748B] font-semibold">{email}</p>
              </div>

              {/* QR Code graphic box */}
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded-2xl border-2 border-[#0B2A67] shadow-md flex flex-col items-center justify-center space-y-2 relative">
                <QrCode className="w-32 h-32 text-[#0B2A67]" />
                <span className="font-mono text-[10px] font-bold text-[#0B2A67] tracking-widest">
                  ID: {passModalBooking.id.slice(0, 10).toUpperCase()}
                </span>
              </div>

              {/* Match / Booking Info */}
              <div className="p-4 rounded-2xl bg-[#EDF4FC] border border-[#E2E8F0] space-y-2 text-left text-xs font-semibold text-[#0B2A67]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Court:</span>
                  <span className="font-extrabold text-[#0B2A67]">{passModalBooking.court_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Date &amp; Time:</span>
                  <span className="font-extrabold text-[#0B2A67]">
                    {formatDate(passModalBooking.start_time)} ({formatTime(passModalBooking.start_time)})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Status:</span>
                  <span className="font-bold text-[#007d48] uppercase">Confirmed &bull; Paid</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    playHapticSound('scan');
                    window.print();
                  }}
                  className="bg-[#0B2A67] hover:bg-[#123A82] text-white text-xs font-bold h-11 px-6 rounded-xl cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-[#FFD21C]" />
                  <span>Print Ticket</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPassModalBooking(null)}
                  className="text-xs border-[#E2E8F0] text-[#64748B] hover:text-[#0B2A67] h-11 px-5 rounded-xl cursor-pointer"
                >
                  Close Pass
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Refund Request Modal Component */}
      {refundModalBooking && (
        <RefundRequestModal
          isOpen={!!refundModalBooking}
          booking={refundModalBooking}
          onClose={() => setRefundModalBooking(null)}
          onSuccess={(msg) => handleRefundConfirmed(refundModalBooking.id)}
        />
      )}

      {/* Reschedule Match Modal Component */}
      {rescheduleModalBooking && (
        <RescheduleModal
          isOpen={!!rescheduleModalBooking}
          booking={rescheduleModalBooking}
          onClose={() => setRescheduleModalBooking(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
}
