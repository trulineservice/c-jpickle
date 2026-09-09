import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full border border-[#cacacb] dark:border-[#3f3f46] bg-[#f5f5f5] dark:bg-black px-4 py-2 text-sm text-[#111111] dark:text-white placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] transition-all outline-none focus-visible:bg-white dark:focus-visible:bg-black focus-visible:border-[#111111] dark:focus-visible:border-white focus-visible:ring-1 focus-visible:ring-[#111111] dark:focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
