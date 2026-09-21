import { create } from 'zustand';
import type { Court, AvailabilitySlot } from '@/types/database';

export const DEFAULT_COURTS: Court[] = [
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
    name: 'Court 2 — Indoor (Pickleball / Basketball)',
    type: 'indoor',
    hourly_rate: 300,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

interface BookingState {
  courts: Court[];
  selectedCourt: Court;
  selectedDate: string; // YYYY-MM-DD
  selectedSlots: AvailabilitySlot[];
  paddleCount: number;
  ballThrowerRental: boolean;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  timeFilter: 'all' | 'morning' | 'afternoon' | 'night';

  // Actions
  setCourts: (courts: Court[]) => void;
  setSelectedCourt: (court: Court) => void;
  setSelectedDate: (dateStr: string) => void;
  setSelectedSlots: (slots: AvailabilitySlot[]) => void;
  toggleSlot: (slot: AvailabilitySlot) => void;
  clearSlots: () => void;
  setPaddleCount: (count: number) => void;
  setBallThrowerRental: (enabled: boolean) => void;
  setGuestName: (name: string) => void;
  setGuestEmail: (email: string) => void;
  setGuestPhone: (phone: string) => void;
  setTimeFilter: (filter: 'all' | 'morning' | 'afternoon' | 'night') => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  courts: DEFAULT_COURTS,
  selectedCourt: DEFAULT_COURTS[0],
  selectedDate: new Date().toISOString().split('T')[0],
  selectedSlots: [],
  paddleCount: 0,
  ballThrowerRental: false,
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  timeFilter: 'all',

  setCourts: (courts) => set({ courts }),
  setSelectedCourt: (selectedCourt) => set({ selectedCourt, selectedSlots: [] }),
  setSelectedDate: (selectedDate) => set({ selectedDate, selectedSlots: [] }),
  setSelectedSlots: (selectedSlots) => set({ selectedSlots }),

  toggleSlot: (slot) =>
    set((state) => {
      const exists = state.selectedSlots.some((s) => s.isoString === slot.isoString);
      if (exists) {
        return { selectedSlots: state.selectedSlots.filter((s) => s.isoString !== slot.isoString) };
      }
      return { selectedSlots: [...state.selectedSlots, slot].sort((a, b) => a.isoString.localeCompare(b.isoString)) };
    }),

  clearSlots: () => set({ selectedSlots: [] }),
  setPaddleCount: (paddleCount) => set({ paddleCount: Math.max(0, paddleCount) }),
  setBallThrowerRental: (ballThrowerRental) => set({ ballThrowerRental }),
  setGuestName: (guestName) => set({ guestName }),
  setGuestEmail: (guestEmail) => set({ guestEmail }),
  setGuestPhone: (guestPhone) => set({ guestPhone }),
  setTimeFilter: (timeFilter) => set({ timeFilter }),

  resetBooking: () =>
    set({
      selectedSlots: [],
      paddleCount: 0,
      ballThrowerRental: false,
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      timeFilter: 'all',
    }),
}));
