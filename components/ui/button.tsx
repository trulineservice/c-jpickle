import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#111111] active:scale-[0.97] active:opacity-85 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#111111] text-white hover:bg-[#222222]",
        yellow:
          "bg-[#FFD21C] text-[#0B2A67] font-bold hover:bg-[#E8BA00] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus-visible:ring-[#0B2A67]",
        red:
          "bg-[#bf050b] text-white font-bold hover:bg-[#a10409] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus-visible:ring-[#bf050b]",
        navy:
          "bg-[#0B2A67] text-white font-semibold hover:bg-[#123A82] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus-visible:ring-[#FFD21C]",
        "navy-outline":
          "border border-white/40 bg-[#0B2A67]/40 text-white font-semibold backdrop-blur-sm hover:bg-white/15 hover:border-white hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 focus-visible:ring-white",
        outline:
          "border-[#cacacb] bg-transparent text-[#111111] hover:bg-[#f5f5f5]",
        secondary:
          "bg-[#f5f5f5] text-[#111111] hover:bg-[#e5e5e5]",
        ghost:
          "bg-transparent text-[#111111] hover:bg-[#f5f5f5]",
        "on-image":
          "bg-white text-[#111111] hover:bg-[#f5f5f5] shadow-none",
        destructive:
          "bg-[#d30005] text-white hover:bg-[#b00004]",
        link: "text-[#111111] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-5 text-sm font-medium",
        xs: "h-7 gap-1 px-3 text-xs font-medium",
        sm: "h-8 gap-1.5 px-3.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-8 text-base font-medium",
        icon: "size-10 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
