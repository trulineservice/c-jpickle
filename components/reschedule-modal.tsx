"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { 
  CalendarDays, 
  Clock, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { rescheduleBooking } from "@/app/actions";
import { playHapticSound } from "@/lib/motion-feedback";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

interface AvailabilitySlot {
  hour24: number;
  timeLabel: string;
  available: boolean;
  status: 'available' | 'occupied' | 'past' | 'maintenance';
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    court_id?: string;
    court_name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    total_price: number;
  };
  onSuccess: (message: string, newStartTime: string, newCourtName: string) => void;
}

interface CourtOption {
  id: string;
  name: string;
  type?: string;
}

export function RescheduleModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: RescheduleModalProps) {
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(booking.court_id || "");
  
  // Format initial default date to tomorrow or the day after
  const getInitialDateStr = () => {
    const orig = new Date(booking.start_time);
    const target = new Date();
    target.setDate(target.getDate() + 1);
    // If original is in future and after tomorrow, keep date or default tomorrow
    const d = orig > target ? orig : target;
    return d.toISOString().slice(0, 10);
  };

  const [selectedDateStr, setSelectedDateStr] = useState<string>(getInitialDateStr);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [reason, setReason] = useState<string>("Schedule Conflict");
  const [customReason, setCustomReason] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load available courts on open
  useEffect(() => {
    if (!isOpen) return;

    async function loadCourts() {
      try {
        const supabase = createBrowserClient();
        const { data } = await supabase
          .from("courts")
          .select("id, name, type, is_active")
          .order("name", { ascending: true });

        if (data && data.length > 0) {
          const active = data
            .filter((c: any) => {
              if (c.is_active === false) return false;
              const nameLower = (c.name || "").toLowerCase();
              if (
                nameLower.includes("events place") ||
                nameLower.includes("view deck") ||
                nameLower.includes("banquet") ||
                nameLower.includes("lounge")
              ) {
                return false;
              }
              return true;
            })
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type || "indoor",
            }));

          setCourts(active);
          if (!selectedCourtId || !active.some(c => c.id === selectedCourtId)) {
            const matched = active.find(c => c.name === booking.court_name);
            setSelectedCourtId(matched ? matched.id : active[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load court list:", err);
      }
    }

    loadCourts();
  }, [isOpen, booking.court_name, selectedCourtId]);

  // Fetch slot availability whenever court or date changes
  const fetchSlots = useCallback(async () => {
    if (!selectedCourtId || !selectedDateStr) return;

    setIsLoadingSlots(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/availability?courtId=${selectedCourtId}&date=${selectedDateStr}&durationHours=${booking.duration_hours}&excludeBookingId=${booking.id}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Unable to check court availability.");
      }

      const data = await res.json();
      const loadedSlots: AvailabilitySlot[] = data.slots || [];
      setSlots(loadedSlots);

      // Deselect hour if no longer available
      if (selectedHour !== null) {
        const stillAvail = loadedSlots.some(
          s => s.hour24 === selectedHour && s.available
        );
        if (!stillAvail) setSelectedHour(null);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading slots.");
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedCourtId, selectedDateStr, booking.duration_hours, booking.id, selectedHour]);

  useEffect(() => {
    if (isOpen && selectedCourtId && selectedDateStr) {
      fetchSlots();
    }
  }, [isOpen, selectedCourtId, selectedDateStr, fetchSlots]);

  if (!isOpen) return null;

  // Format existing booking time
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    if (!slot.available) {
      playHapticSound("error");
      return;
    }
    playHapticSound("tap");
    setSelectedHour(slot.hour24);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedHour === null) {
      playHapticSound("error");
      setErrorMsg("Please select an available start time slot.");
      return;
    }

    // Build ISO timestamp in Asia/Manila (+08:00)
    const hourStr = String(selectedHour).padStart(2, "0");
    const newStartTimeIso = `${selectedDateStr}T${hourStr}:00:00+08:00`;
    const finalReason = reason === "Other" ? (customReason.trim() || "Other reason") : reason;

    const chosenCourt = courts.find(c => c.id === selectedCourtId);
    const chosenCourtName = chosenCourt ? chosenCourt.name : booking.court_name;

    startTransition(async () => {
      const res = await rescheduleBooking({
        bookingId: booking.id,
        newCourtId: selectedCourtId,
        newStartTime: newStartTimeIso,
        reason: finalReason,
      });

      if (res.error) {
        playHapticSound("error");
        setErrorMsg(res.error);
      } else {
        playHapticSound("success");
        onSuccess(
          res.message || "Reservation rescheduled successfully!",
          newStartTimeIso,
          chosenCourtName
        );
        onClose();
      }
    });
  };

  // Min date is today in Manila time
  const todayManilaStr = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 45);
  const maxDateStr = maxDate.toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#071E4B] border border-[#0B2A67]/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 z-10 text-[#0B2A67] dark:text-white shadow-2xl animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
          disabled={isPending}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFD21C]/20 text-[#B8860B] dark:text-[#FFD21C] border border-[#FFD21C]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFD21C]" />
              Court Reschedule Policy
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            Reschedule Match Session
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/70">
            Pick a new date, court, and available time slot without cancellation fees.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 -mr-1 space-y-5 py-4 flex-1">
          
          {/* Current Booking Strip */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/50 block">
                Current Booking
              </span>
              <span className="text-sm font-extrabold text-[#0B2A67] dark:text-white">
                {booking.court_name}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/80 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>{formatDateTime(booking.start_time)} ({booking.duration_hours} hr)</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/50 block">
                Session Fee
              </span>
              <span className="text-sm font-bold text-[#0B2A67] dark:text-[#FFD21C]">
                ₱{Number(booking.total_price).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="leading-relaxed font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Form */}
          <form id="reschedule-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Court Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/90 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFD21C]" />
                Select Arena Court
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {courts.map((court) => {
                  const isSelected = selectedCourtId === court.id;
                  return (
                    <button
                      key={court.id}
                      type="button"
                      onClick={() => {
                        playHapticSound("tap");
                        setSelectedCourtId(court.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0B2A67] text-white border-[#0B2A67] dark:bg-white dark:text-[#0B2A67] shadow-sm font-bold"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:border-[#0B2A67]/50"
                      }`}
                    >
                      <span className="text-xs font-bold block">{court.name}</span>
                      <span className={`text-[10px] uppercase font-semibold ${isSelected ? "text-white/70 dark:text-[#0B2A67]/70" : "text-slate-400 dark:text-white/50"}`}>
                        {court.type || "Indoor"} Arena
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="rescheduleDate" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/90 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-[#FFD21C]" />
                Choose New Date
              </Label>
              <Input
                id="rescheduleDate"
                type="date"
                min={todayManilaStr}
                max={maxDateStr}
                value={selectedDateStr}
                onChange={(e) => {
                  setSelectedDateStr(e.target.value);
                  setSelectedHour(null);
                }}
                required
                className="h-10 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-[#0B2A67] dark:text-white"
              />
            </div>

            {/* Slot Availability Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/90 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
                  Select Start Time ({booking.duration_hours} hr session)
                </Label>
                {isLoadingSlots && (
                  <span className="text-[11px] text-slate-400 dark:text-white/50 flex items-center gap-1 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking slots...
                  </span>
                )}
              </div>

              {isLoadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-white/50 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFD21C]" />
                  Loading available court hours...
                </div>
              ) : slots.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-white/60">
                  No slots found for this date. Please select another date or court.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                  {slots.map((s) => {
                    const isSelected = selectedHour === s.hour24;
                    const isAvail = s.available;

                    return (
                      <button
                        key={s.hour24}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => handleSlotSelect(s)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] border-[#0B2A67] dark:border-[#FFD21C] shadow-md ring-2 ring-[#FFD21C]"
                            : isAvail
                            ? "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:border-[#0B2A67] dark:hover:border-white cursor-pointer"
                            : "bg-slate-100 dark:bg-white/5 border-transparent text-slate-300 dark:text-white/20 cursor-not-allowed line-through"
                        }`}
                      >
                        <span>{s.timeLabel}</span>
                        <span className={`text-[9px] font-medium tracking-tight ${isSelected ? "text-white/80 dark:text-[#0B2A67]/80" : isAvail ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/20"}`}>
                          {isSelected ? "Selected" : isAvail ? "Open" : "Occupied"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="rescheduleReason" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/90">
                Reason for Rescheduling
              </Label>
              <select
                id="rescheduleReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#071E4B] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs h-10 px-3 rounded-xl focus:border-[#0B2A67] dark:focus:border-white outline-none cursor-pointer font-medium"
              >
                <option value="Schedule Conflict">Schedule Conflict</option>
                <option value="Weather / Travel Issues">Weather / Travel Issues</option>
                <option value="Emergency / Illness">Emergency / Illness</option>
                <option value="Preferred Different Court or Time">Preferred Different Court or Time</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            {reason === "Other" && (
              <div className="space-y-1">
                <Input
                  placeholder="Please state briefly why you are rescheduling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="w-1/3 h-11 text-xs font-bold border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl cursor-pointer"
          >
            Keep Original
          </Button>

          <Button
            type="submit"
            form="reschedule-form"
            disabled={isPending || selectedHour === null}
            className="w-2/3 h-11 bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] hover:bg-[#071E4B] dark:hover:bg-[#f0c410] font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rescheduling...</span>
              </>
            ) : (
              <>
                <span>Confirm Reschedule</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
