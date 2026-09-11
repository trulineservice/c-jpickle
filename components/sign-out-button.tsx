"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  text?: string;
  isLinkStyle?: boolean;
}

export function SignOutButton({
  className,
  variant = "ghost",
  size = "sm",
  showText = true,
  text = "Sign Out",
  isLinkStyle = false,
}: SignOutButtonProps) {
  const { pending } = useFormStatus();

  if (isLinkStyle) {
    return (
      <button
        type="submit"
        disabled={pending}
        className={className}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#d30005]" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        <span>{pending ? "Signing Out..." : text}</span>
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5" />
      )}
      {showText && <span>{pending ? "Signing Out..." : text}</span>}
    </Button>
  );
}
