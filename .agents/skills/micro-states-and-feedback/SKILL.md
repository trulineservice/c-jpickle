---
name: micro-states-and-feedback
description: Use this skill when implementing skeleton loaders, zero-data empty states, optimistic updates, and Web Audio API auditory feedback for POS and court reservation actions.
---

# Micro-States & Feedback UX Skill

This skill ensures zero layout shifts (CLS = 0), graceful empty states, and sensory feedback across the C&J Pickleball application.

## 1. Zero-CLS Skeleton Loaders
Never use a generic spinner that causes content jumping. Skeletons must mirror the exact dimensions of final loaded components.

```tsx
export function CourtCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-zinc-800 rounded-md" />
        <div className="h-5 w-16 bg-zinc-800 rounded-full" />
      </div>
      <div className="h-28 w-full bg-zinc-900 rounded-xl mb-3" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-4 w-20 bg-zinc-800 rounded" />
        <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}
```

## 2. Branded Empty States
Never show a blank white or empty black screen with "No data found".

```tsx
import { CalendarX, ShoppingBag, ShieldAlert } from "lucide-react";

export function EmptyBookingState({ onAction }: { onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50">
      <div className="p-3 rounded-2xl bg-zinc-900/80 text-emerald-400 border border-zinc-800 mb-3">
        <CalendarX className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">No Reservations Scheduled</h3>
      <p className="text-xs text-zinc-400 max-w-xs mt-1 mb-4">
        All courts are currently open for booking. Pick a court or check walk-in availability.
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
        >
          Book Court Now
        </button>
      )}
    </div>
  );
}
```

## 3. Auditory Feedback (Web Audio API)
Hardware registers and scanners provide acoustic confirmation. Using the Web Audio API avoids loading external `.mp3` files:

```tsx
// Synthesized audio feedback (no asset downloads needed)
export function playHapticSound(type: "scan" | "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "scan") {
      // Short 1200Hz high beep (pos scanner beep)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      // Warm chime (two-tone chord)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "error") {
      // Low buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}
```
