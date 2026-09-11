"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Wrench, Loader2 } from "lucide-react";

interface CourtToggleButtonProps {
  isActive: boolean;
}

export function CourtToggleButton({ isActive }: CourtToggleButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      variant="outline"
      size="sm"
      type="submit"
      disabled={pending}
      className={
        !isActive
          ? "border-[#007d48]/40 bg-white dark:bg-[#18181c] text-[#007d48] dark:text-[#10b981] hover:bg-[#f5f5f5] dark:hover:bg-[#222226] text-xs font-semibold rounded-full h-8 px-4 cursor-pointer"
          : "border-[#d30005]/40 bg-white dark:bg-[#18181c] text-[#d30005] dark:text-red-400 hover:bg-[#f5f5f5] dark:hover:bg-[#222226] text-xs font-semibold rounded-full h-8 px-4 cursor-pointer"
      }
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-current" />
          <span>Updating...</span>
        </>
      ) : !isActive ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-[#007d48] dark:text-[#10b981]" />
          <span>Bring Online</span>
        </>
      ) : (
        <>
          <Wrench className="h-3.5 w-3.5 mr-1.5 text-[#d30005] dark:text-red-400" />
          <span>Set Maintenance</span>
        </>
      )}
    </Button>
  );
}
