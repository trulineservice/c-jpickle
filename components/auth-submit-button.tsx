"use client";

import { useFormStatus } from "react-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  label: string;
  loadingLabel: string;
  className?: string;
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  className,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1.5">
          <span>{label}</span>
          <ArrowRight className="w-4 h-4" />
        </span>
      )}
    </Button>
  );
}
