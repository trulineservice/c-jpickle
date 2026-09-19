import React from "react";
import Image from "next/image";

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
  // If variant="badge", render white pill card with the red C&J's logo
  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white rounded-xl sm:rounded-2xl px-3 sm:px-4 py-1.5 shadow-sm border border-white/80 hover:shadow-md transition-all duration-200 select-none ${className}`}
      >
        <Image
          src="/cj-logo.png"
          alt="C&J's Events Place Rentals"
          width={size === "sm" ? 95 : size === "lg" ? 140 : 115}
          height={size === "sm" ? 38 : size === "lg" ? 56 : 46}
          className="h-7 sm:h-9 w-auto object-contain"
          priority
        />
      </div>
    );
  }

  // Aspect ratio is 726/314 ~ 2.31
  const sizeMap = {
    sm: { width: 92, height: 40 },
    md: { width: 125, height: 54 },
    lg: { width: 160, height: 69 },
    xl: { width: 195, height: 84 },
  };

  const { width, height } = sizeMap[size];

  if (inverted || variant === "inverted") {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <Image
          src="/logo-dark.png"
          alt="C&J's Events Place Rentals"
          width={width}
          height={height}
          className="h-auto w-auto object-contain transition-transform duration-200 hover:scale-105"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Light Mode Logo */}
      <Image
        src="/logo-light.png"
        alt="C&J's Events Place Rentals"
        width={width}
        height={height}
        className="h-auto w-auto object-contain block dark:hidden transition-transform duration-200 hover:scale-105"
        priority
      />
      {/* Dark Mode Logo */}
      <Image
        src="/logo-dark.png"
        alt="C&J's Events Place Rentals"
        width={width}
        height={height}
        className="h-auto w-auto object-contain hidden dark:block transition-transform duration-200 hover:scale-105"
      />
    </div>
  );
}

