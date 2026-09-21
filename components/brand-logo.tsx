import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withSubtitle?: boolean;
  inverted?: boolean;
  variant?: "default" | "badge" | "inverted";
}

export function BrandLogo({
  className = "",
  size = "md",
  inverted = false,
  variant,
}: BrandLogoProps) {
  // Size mapping with height constraints
  const sizeMap = {
    sm: { heightClass: "h-7 sm:h-8" },
    md: { heightClass: "h-9 sm:h-10" },
    lg: { heightClass: "h-11 sm:h-12" },
    xl: { heightClass: "h-14 sm:h-16" },
  };

  const { heightClass } = sizeMap[size];

  // If variant="badge", render white pill card with the red C&J logotype
  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 shadow-sm border border-white/80 hover:shadow-md transition-all duration-200 select-none ${className}`}
      >
        <img
          src="/cj-logo.png"
          alt="C&J Pickleball & Events Place"
          className="h-7 sm:h-9 w-auto object-contain block"
        />
      </div>
    );
  }

  if (inverted || variant === "inverted") {
    return (
      <div className={`inline-flex items-center justify-center bg-white rounded-xl px-3 py-1 shadow-sm select-none ${className}`}>
        <img
          src="/logo-dark.png"
          alt="C&J Pickleball & Events Place"
          className={`${heightClass} w-auto object-contain transition-transform duration-200 hover:scale-105 block`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Light & Dark Mode C&J Logo Badge */}
      <div className="bg-white rounded-xl px-2.5 py-1 shadow-xs border border-slate-100 dark:border-white/20 inline-flex items-center">
        <img
          src="/logo-light.png"
          alt="C&J Pickleball & Events Place"
          className={`${heightClass} w-auto object-contain transition-transform duration-200 hover:scale-105 block`}
        />
      </div>
    </div>
  );
}



