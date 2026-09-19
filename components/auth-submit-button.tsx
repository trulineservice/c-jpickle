"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playHapticSound } from "@/lib/motion-feedback";

interface AuthSubmitButtonProps {
  label: string;
  loadingLabel: string;
  className?: string;
  variant?: "yellow" | "navy" | "default" | "outline";
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  className = "w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer",
  variant = "yellow",
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      onClick={() => playHapticSound("tap")}
      className={className}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1.5 font-black uppercase tracking-wider">
          <span>{label}</span>
          <ArrowRight className="w-4 h-4" />
        </span>
      )}
    </Button>
  );
}
