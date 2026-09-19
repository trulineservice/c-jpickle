"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { playHapticSound } from "@/lib/motion-feedback";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar w-full bg-transparent text-[#102A56] p-1 sm:p-2 select-none",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-full", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 w-full",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-20 px-1 sm:px-2",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8.5 w-8.5 sm:h-9 sm:w-9 p-0 text-[#0B2A67] hover:bg-[#EDF4FC] hover:text-[#0B2A67] hover:border-[#0B2A67]/40 rounded-full transition-all border border-[#E2E8F0] bg-white shadow-xs cursor-pointer active:scale-95",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8.5 w-8.5 sm:h-9 sm:w-9 p-0 text-[#0B2A67] hover:bg-[#EDF4FC] hover:text-[#0B2A67] hover:border-[#0B2A67]/40 rounded-full transition-all border border-[#E2E8F0] bg-white shadow-xs cursor-pointer active:scale-95",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8.5 sm:h-9 w-full items-center justify-center font-black text-base sm:text-lg text-[#0B2A67] tracking-tight uppercase px-12",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "font-black text-base sm:text-lg uppercase tracking-wider text-[#0B2A67] select-none",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse mt-3", defaultClassNames.month_grid),
        weekdays: cn(
          "grid grid-cols-7 mb-2 text-center border-b border-[#E2E8F0] pb-2.5",
          defaultClassNames.weekdays
        ),
        weekday: cn(
          "text-xs font-black uppercase tracking-wider text-[#64748B] select-none py-1",
          defaultClassNames.weekday
        ),
        week: cn(
          "grid grid-cols-7 gap-1 sm:gap-2 my-1 sm:my-1.5 w-full",
          defaultClassNames.week
        ),
        day: cn(
          "group/day relative aspect-square h-auto w-full p-0 text-center select-none flex items-center justify-center min-h-[44px] sm:min-h-[50px]",
          defaultClassNames.day
        ),
        today: cn(
          "font-bold text-[#0B2A67]",
          defaultClassNames.today
        ),
        outside: cn(
          "text-[#94A3B8] opacity-30 aria-selected:text-[#94A3B8]",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-[#94A3B8] opacity-25 cursor-not-allowed line-through",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn("w-full", className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4 text-[#0B2A67]", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4 text-[#0B2A67]", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon
              className={cn("size-4 text-[#0B2A67]", className)}
              {...props}
            />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isAlmostFull = Boolean((modifiers as Record<string, unknown>).almostFull);
  const isFullyBooked = Boolean((modifiers as Record<string, unknown>).fullyBooked);
  const isSelected = Boolean(modifiers.selected);
  const isDisabled = Boolean(modifiers.disabled);
  const isOutside = Boolean(modifiers.outside);
  const isToday = Boolean(modifiers.today);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSelected}
      title={
        isFullyBooked
          ? "Fully Scheduled — All 16 slots booked on this day"
          : isAlmostFull
          ? "Filling Fast — Limited court slots remaining"
          : !isDisabled && !isOutside
          ? "Slots Available for Booking"
          : undefined
      }
      className={cn(
        "group/day-btn relative isolate z-10 flex aspect-square h-10 w-10 sm:h-11 sm:w-11 min-w-0 flex-col items-center justify-center rounded-2xl leading-none font-semibold text-xs sm:text-sm transition-all mx-auto p-0 cursor-pointer active:scale-95",

        // Fully Booked Date (Unselected, active)
        isFullyBooked &&
          !isSelected &&
          !isDisabled &&
          !isOutside &&
          "bg-[#bf050b]/8 text-[#bf050b] border border-[#bf050b]/25 hover:bg-[#bf050b]/15 hover:border-[#bf050b]/40 shadow-xs",

        // Almost Full / Limited Slots (Unselected, active)
        isAlmostFull &&
          !isFullyBooked &&
          !isSelected &&
          !isDisabled &&
          !isOutside &&
          "bg-amber-500/10 text-amber-900 border border-amber-500/30 hover:bg-amber-500/20 shadow-xs",

        // Normal Available Date (Unselected, active)
        !isFullyBooked &&
          !isAlmostFull &&
          !isSelected &&
          !isDisabled &&
          !isOutside &&
          "bg-white text-[#0B2A67] border border-[#E2E8F0] hover:border-[#0B2A67]/40 hover:bg-[#EDF4FC] hover:shadow-xs",

        // Today ring (when not selected)
        isToday && !isSelected && "ring-2 ring-inset ring-[#0B2A67] font-black",

        // Selected Date: Solid Deep Navy with Championship Gold Ring
        isSelected &&
          "bg-[#0B2A67] text-white font-black ring-2 ring-[#FFD21C] shadow-md scale-105 transition-transform duration-150",

        // Disabled / Past Date
        isDisabled &&
          "opacity-25 cursor-not-allowed text-[#94A3B8] border-transparent bg-transparent pointer-events-none line-through",

        // Outside of visible month
        isOutside &&
          "opacity-20 text-[#94A3B8] border-transparent bg-transparent pointer-events-none",

        className
      )}
      {...props}
    >
      <span
        className={cn(
          "tracking-tight text-xs sm:text-sm",
          isSelected
            ? "text-white font-black"
            : isFullyBooked
            ? "text-[#bf050b] font-black"
            : isAlmostFull
            ? "text-amber-950 font-bold"
            : "text-[#0B2A67]"
        )}
      >
        {day.date.getDate()}
      </span>

      {/* Status Micro-Indicator Pill / Dot */}
      {!isDisabled && !isOutside && (
        <span className="absolute bottom-1 flex items-center justify-center gap-0.5">
          {isFullyBooked && (
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#bf050b] shadow-xs" />
              <span
                className={cn(
                  "hidden sm:inline text-[7.5px] font-black uppercase tracking-tighter leading-none",
                  isSelected ? "text-[#FFD21C]" : "text-[#bf050b]"
                )}
              >
                FULL
              </span>
            </span>
          )}
          {isAlmostFull && !isFullyBooked && (
            <span className="flex items-center gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-xs" />
              <span
                className={cn(
                  "hidden sm:inline text-[7.5px] font-bold uppercase tracking-tighter leading-none",
                  isSelected ? "text-[#FFD21C]" : "text-amber-800"
                )}
              >
                FEW
              </span>
            </span>
          )}
          {!isFullyBooked && !isAlmostFull && !isSelected && (
            <span className="h-1 w-1 rounded-full bg-[#007d48]/60" />
          )}
        </span>
      )}
    </Button>
  );
}

export { Calendar, CalendarDayButton };
