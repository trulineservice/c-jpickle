---
name: motion-microinteractions
description: Use this skill when implementing UI animations, spring transitions, micro-interactions, animated number counters, court slot select feedback, and celebratory confetti in React 19 and Tailwind CSS.
---

# Motion & Micro-Interactions Skill

This skill provides production-grade animation patterns for the C&J Pickleball web and POS application, prioritizing 60fps performance, spring physics, and accessibility.

## 1. Principles
- **Subtle & Fast**: Micro-interactions must complete in 120ms–250ms. Never make users wait for an animation to finish before they can click.
- **Hardware Acceleration**: Only animate `transform` and `opacity`. Never animate `width`, `height`, `margin`, or `left`/`top`.
- **Reduced Motion**: Always honor `prefers-reduced-motion: reduce`.

## 2. Common Patterns

### A. Number Ticker (Live Cart Total / Revenue Counter)
When totals change, numbers should smoothly roll rather than abruptly jumping.
```tsx
import { useEffect, useState } from "react";

export function AnimatedNumber({ value, currency = "₱" }: { value: number; currency?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 250; // ms
    const startTime = performance.now();

    function update(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Fast ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }, [value]);

  return (
    <span className="font-mono tabular-nums tracking-tight">
      {currency}{displayValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
```

### B. Interactive Slot / Button Press Feedback
Give buttons a tactile, physical feel:
```tsx
// Tailwind classes for tactile button press
const tactileButton = "active:scale-[0.97] transition-all duration-150 ease-out active:brightness-95";
const courtSlotCard = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98]";
```

### C. Confetti Celebration
For successful booking reservations and checkout completion:
```tsx
import confetti from "canvas-confetti";

export function fireCourtBookingCelebration() {
  if (typeof window === "undefined") return;
  
  // Arena brand colors: Electric emerald, bright gold, white
  const colors = ["#007d48", "#10b981", "#f59e0b", "#ffffff"];

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors,
    disableForReducedMotion: true,
  });
}
```

### D. Layout Transitions with Pure CSS & Tailwind
For tabs and segmented controls without bulky animation libraries:
```tsx
<div className="relative flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActive(tab.id)}
      className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
        active === tab.id ? "text-white" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {active === tab.id && (
        <span className="absolute inset-0 z-[-1] rounded-lg bg-emerald-600 shadow-sm transition-all duration-200" />
      )}
      {tab.label}
    </button>
  ))}
</div>
```
