import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withSubtitle?: boolean;
  inverted?: boolean;
}

export function BrandLogo({
  className = "",
  size = "md",
  withSubtitle = false,
  inverted = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { scale: 0.75, height: 28, textClass: "text-lg", subClass: "text-[8px]" },
    md: { scale: 1, height: 36, textClass: "text-2xl", subClass: "text-[9px]" },
    lg: { scale: 1.25, height: 48, textClass: "text-3xl", subClass: "text-[11px]" },
    xl: { scale: 1.6, height: 60, textClass: "text-4xl", subClass: "text-xs" },
  };

  const current = sizeMap[size];
  const primaryStroke = inverted ? "#ffffff" : "currentColor";
  const secondaryColor = inverted ? "#cacacb" : undefined;

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none font-sans group ${
        inverted ? "text-white" : "text-[#111111] dark:text-[#f4f4f5]"
      } ${className}`}
      role="img"
      aria-label="C&J Pickleball Logo"
    >
      {/* Athletic Geometric Monogram Badge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={current.height}
          height={current.height}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-200 group-hover:scale-105"
        >
          {/* Outer Court Boundary */}
          <rect
            x="2"
            y="2"
            width="40"
            height="40"
            stroke={primaryStroke}
            strokeWidth="3.5"
            fill="none"
          />
          {/* Net Line */}
          <line
            x1="2"
            y1="22"
            x2="42"
            y2="22"
            stroke={primaryStroke}
            strokeWidth="2.5"
          />
          {/* Kitchen / Non-Volley Boundary Lines */}
          <line
            x1="2"
            y1="15"
            x2="42"
            y2="15"
            stroke={primaryStroke}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <line
            x1="2"
            y1="29"
            x2="42"
            y2="29"
            stroke={primaryStroke}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          {/* Dynamic Strike Slash / Ball Contact Vector */}
          <path
            d="M 12 34 L 32 10"
            stroke={primaryStroke}
            strokeWidth="4"
            strokeLinecap="square"
          />
          {/* Center Sweetspot Dot */}
          <circle
            cx="22"
            cy="22"
            r="3.5"
            fill={primaryStroke}
          />
        </svg>
      </div>

      {/* Modern High-Impact Athletic Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-black tracking-tighter uppercase font-display ${current.textClass}`}
            style={{ letterSpacing: "-0.03em" }}
          >
            C&amp;J
          </span>
          <span
            className={`font-black tracking-tight uppercase ${current.textClass}`}
            style={{ letterSpacing: "0.02em" }}
          >
            COURTS
          </span>
        </div>

        {withSubtitle && (
          <span
            className={`font-bold tracking-[0.25em] uppercase mt-0.5 ${
              inverted
                ? "text-[#cacacb]"
                : "text-[#707072] dark:text-[#8a8a93]"
            } ${current.subClass}`}
          >
            PICKLEBALL ARENA
          </span>
        )}
      </div>
    </div>
  );
}
