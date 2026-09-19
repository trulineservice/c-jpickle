"use client";

import React, { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  decimals?: number;
  className?: string;
}

/**
 * Smooth 60fps rolling price counter with cubic ease-out.
 * Uses prevValueRef to avoid effect re-triggering while animating.
 */
export function AnimatedNumber({
  value,
  currency = "₱",
  decimals = 2,
  className = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;

    // Update ref immediately so subsequent adjustments interpolate from this target
    prevValueRef.current = value;

    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 280; // ms
    const startTime = performance.now();
    let animFrameId: number;

    function update(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Fast ease-out cubic curve: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameId = requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    }

    animFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [value]); // Strictly depend only on target `value`

  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {currency}
      {displayValue.toLocaleString("en-PH", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
