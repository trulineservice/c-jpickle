"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  loadingText?: string;
  loadingIcon?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SubmitButton({
  children,
  loadingText,
  loadingIcon,
  className,
  variant = "default",
  size = "default",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={className}
      variant={variant}
      size={size}
      {...props}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          {loadingIcon || <Loader2 className="w-4 h-4 animate-spin text-current" />}
          {loadingText ? <span>{loadingText}</span> : children}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
