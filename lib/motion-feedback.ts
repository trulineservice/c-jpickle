// Web Audio API Synthesizer & Tactile Motion Feedback
// Zero-dependency auditory and celebratory triggers for C&J Pickleball

import confetti from "canvas-confetti";

// Singleton AudioContext to prevent exceeding browser hardware context quota
let sharedAudioContext: AudioContext | null = null;
const sharedAudioCtx = () => sharedAudioContext;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Synthesizes acoustic hardware feedback via Web Audio API without asset downloads.
 */
export function playHapticSound(type: "scan" | "success" | "tap" | "error" = "tap") {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "tap") {
      // Very soft low-frequency click
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === "scan") {
      // Short 1200Hz high-frequency POS/court pass scanner chirp
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      // Warm uplifting two-tone chime (D5 -> A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
    } else if (type === "error") {
      // Low dual buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch {
    // Graceful fallback if audio context blocked
  }
}

/**
 * Fires brand-colored celebratory confetti when a court or event reservation succeeds.
 */
export function fireCourtBookingCelebration() {
  if (typeof window === "undefined") return;

  try {
    // Brand colors: C&J Gold (#FFD21C), Navy (#0B2A67), Emerald (#007d48), White, Crimson (#bf050b)
    const colors = ["#FFD21C", "#0B2A67", "#007d48", "#ffffff", "#bf050b"];

    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.75 },
      colors,
      disableForReducedMotion: true,
    });
  } catch {
    // Fallback if canvas-confetti fails
  }
}

/**
 * Auto-formats Philippine mobile phone numbers as `09XX XXX XXXX`
 */
export function formatPHPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

/**
 * Validates Philippine mobile phone numbers.
 * Supports:
 * - Local standard: 11 digits starting with 09 (e.g. 0917 123 4567 or 09171234567)
 * - International standard: 12 digits starting with 639 (e.g. +639171234567 or 639171234567)
 */
export function validatePHPhone(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");

  // Local 11-digit format starting with 09
  if (digits.length === 11 && /^09\d{9}$/.test(digits)) {
    return true;
  }

  // International 12-digit format starting with 639
  if (digits.length === 12 && /^639\d{9}$/.test(digits)) {
    return true;
  }

  return false;
}
