---
name: form-ux-patterns
description: Use this skill when developing multi-step booking flows, phone/ID input masking, instant field validations, discount verification forms, and checkout steppers with React 19 and Server Actions.
---

# Form UX Patterns & Steppers Skill

This skill outlines form ergonomics, input masking, and error recovery patterns for C&J Pickleball's checkout, court booking, and cashier forms.

## 1. Ergonomic Principles
- **Instant Validation on Blur**: Validate formats as soon as the user finishes typing in a field, not only when they click submit.
- **Auto-Formatting Masks**: Automatically format Philippine mobile numbers (`09XX XXX XXXX`) and Senior Citizen / PWD ID numbers.
- **Preserve User Input on Error**: Never wipe form state if a Server Action reports a validation issue.
- **Scroll to First Error**: When submission fails, automatically focus and scroll the viewport to the first invalid field.

## 2. Philippine Phone & Currency Input Masking

```tsx
export function formatPHPhone(value: string): string {
  // Strip non-digits
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  
  // Format as 09XX XXX XXXX
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}
```

## 3. Multi-Step Checkout Stepper

```tsx
export function BookingProgressStepper({
  currentStep = 1,
  steps = ["Court & Time", "Player Details", "Payment", "Pass Confirmed"]
}: {
  currentStep: number;
  steps?: string[];
}) {
  return (
    <nav aria-label="Progress" className="w-full py-4">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((label, idx) => {
          const stepNumber = idx + 1;
          const isComplete = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <li key={label} className="flex-1 flex flex-col items-center relative">
              <div className="flex items-center w-full">
                {/* Connecting line */}
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-300 ${
                      isComplete ? "bg-emerald-500" : "bg-zinc-800"
                    }`}
                  />
                )}
                {/* Step Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isComplete
                      ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                      : isCurrent
                      ? "border-2 border-emerald-400 bg-zinc-900 text-emerald-400 ring-4 ring-emerald-500/10"
                      : "border border-zinc-800 bg-zinc-950 text-zinc-500"
                  }`}
                >
                  {isComplete ? "✓" : stepNumber}
                </div>
                {/* Connecting line */}
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-300 ${
                      currentStep > stepNumber ? "bg-emerald-500" : "bg-zinc-800"
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-[11px] font-medium mt-1.5 text-center ${
                  isCurrent ? "text-emerald-400" : isComplete ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

## 4. Server Action Form Feedback Pattern (React 19)

```tsx
import { useActionState } from "react";

interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export function PlayerDetailsForm({ action }: { action: (prev: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
        <input
          name="fullName"
          required
          className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white transition-all"
        />
        {state.fieldErrors?.fullName && (
          <p className="text-[10px] text-rose-400 mt-1">{state.fieldErrors.fullName}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/10"
      >
        {isPending ? "Locking reservation..." : "Continue to Payment"}
      </button>
    </form>
  );
}
```
