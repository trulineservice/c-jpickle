"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

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
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar w-full bg-transparent text-foreground p-2 select-none",
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
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-20 px-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#27272a] rounded-full transition-colors border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#18181c]",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-8 w-8 p-0 text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#27272a] rounded-full transition-colors border border-[#cacacb] dark:border-[#27272a] bg-white dark:bg-[#18181c]",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center font-bold text-base md:text-lg text-[#111111] dark:text-foreground tracking-tight uppercase px-10",
          defaultClassNames.month_caption
        ),
        caption_label: cn(
          "font-bold text-base md:text-lg uppercase tracking-wider text-[#111111] dark:text-foreground select-none",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse mt-2", defaultClassNames.month_grid),
        weekdays: cn("grid grid-cols-7 mb-2 text-center border-b border-[#cacacb] dark:border-[#27272a] pb-2", defaultClassNames.weekdays),
        weekday: cn(
          "text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93] select-none py-1",
          defaultClassNames.weekday
        ),
        week: cn("grid grid-cols-7 gap-1 sm:gap-2 my-1 w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-auto w-full p-0 text-center select-none flex items-center justify-center min-h-[44px] md:min-h-[50px]",
          defaultClassNames.day
        ),
        today: cn(
          "font-bold text-[#111111] dark:text-foreground",
          defaultClassNames.today
        ),
        outside: cn(
          "text-[#cacacb] dark:text-[#52525b] opacity-40 aria-selected:text-[#707072] dark:aria-selected:text-[#8a8a93]",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-[#cacacb] dark:text-[#52525b] opacity-35 cursor-not-allowed",
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
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4 text-[#111111] dark:text-foreground", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4 text-[#111111] dark:text-foreground", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4 text-[#111111] dark:text-foreground", className)} {...props} />
          )
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isAlmostFull = Boolean((modifiers as Record<string, unknown>).almostFull)
  const isFullyBooked = Boolean((modifiers as Record<string, unknown>).fullyBooked)
  const isSelected = Boolean(modifiers.selected)
  const isDisabled = Boolean(modifiers.disabled)
  const isOutside = Boolean(modifiers.outside)
  const isToday = Boolean(modifiers.today)

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSelected}
      className={cn(
        "relative isolate z-10 flex aspect-square h-10 w-10 sm:h-11 sm:w-11 min-w-0 flex-col items-center justify-center rounded-full leading-none font-semibold text-xs sm:text-sm transition-colors mx-auto p-0",
        // Default unselected state
        !isSelected && !isDisabled && !isOutside && "bg-transparent text-[#111111] dark:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#27272a]",
        // Today ring (when not selected)
        isToday && !isSelected && "ring-1 ring-inset ring-[#111111] dark:ring-foreground font-bold",
        // Selected Date: Solid Ink Black Pill in light mode, clean white in dark mode
        isSelected && "bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-bold hover:bg-[#222222] dark:hover:bg-zinc-200 shadow-none",
        // Disabled / Outside Date
        isDisabled && "opacity-30 cursor-not-allowed text-[#cacacb] dark:text-[#52525b] hover:bg-transparent pointer-events-none",
        isOutside && "opacity-20 text-[#cacacb] dark:text-[#52525b] hover:bg-transparent pointer-events-none",
        className
      )}
      {...props}
    >
      <span className={cn(
        "tracking-tight",
        isSelected ? "text-white dark:text-[#111111] font-bold" : "text-[#111111] dark:text-foreground"
      )}>
        {day.date.getDate()}
      </span>
      {!isDisabled && !isOutside && !isSelected && (isAlmostFull || isFullyBooked) && (
        <span className="absolute bottom-1 flex items-center justify-center">
          {isAlmostFull && (
            <span className="h-1 w-1 rounded-full bg-[#111111] dark:bg-white" />
          )}
          {isFullyBooked && (
            <span className="h-1 w-1 rounded-full bg-[#d30005]" />
          )}
        </span>
      )}
    </Button>
  )
}

export { Calendar, CalendarDayButton }
