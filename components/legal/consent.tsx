"use client";

import { useId } from "react";
import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

/**
 * Consent UI for the flows that need it.
 *
 * Two shapes, because the two situations are genuinely different:
 *
 *   ConsentNotice   a statement. Creating an account is itself the act of
 *                   agreeing, so there is nothing to tick.
 *   ConsentCheckbox a deliberate action, for booking and service requests,
 *                   where agreement has to be given each time.
 *
 * A consent checkbox is never pre-selected. A box the user did not tick is not
 * consent, and under the Data Privacy Act consent has to be freely given and
 * evidenced by a clear affirmative action.
 */

/** Inline links to both documents, used by both shapes. */
function LegalLinks() {
  return (
    <>
      <Link href="/terms" className="link-lime">
        Terms and Conditions
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="link-lime">
        Privacy Policy
      </Link>
    </>
  );
}

/**
 * For registration, where submitting the form is the agreement. Rendered next
 * to the submit button so it is read before the click, not after.
 */
export function ConsentNotice({
  action = "creating an account",
  className,
}: {
  /** Completes "By ___, you agree to ...". */
  action?: string;
  className?: string;
}) {
  return (
    <p className={cn("text-muted-foreground text-sm leading-relaxed", className)}>
      By {action}, you agree to our{" "}
      <Link href="/terms" className="link-lime">
        Terms and Conditions
      </Link>{" "}
      and acknowledge our{" "}
      <Link href="/privacy" className="link-lime">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/**
 * For bookings and service requests, where consent is an explicit act.
 * Controlled, so the parent owns the value and can block submission on it.
 */
export function ConsentCheckbox({
  checked,
  onCheckedChange,
  disabled,
  invalid,
  name = "consent",
  children,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Marks the control when the form was submitted without it. */
  invalid?: boolean;
  name?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          name={name}
          // Never defaultChecked. Consent is the user's action, not ours.
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="mt-0.5"
        />
        <Label
          htmlFor={id}
          className="text-muted-foreground text-sm leading-relaxed font-normal"
        >
          {children ?? (
            <>
              I agree to the <LegalLinks />, and I understand how my personal
              information is processed.
            </>
          )}
        </Label>
      </div>

      {invalid ? (
        <p id={errorId} role="alert" className="text-destructive ml-7 text-sm">
          Please agree to the terms before continuing.
        </p>
      ) : null}
    </div>
  );
}

/** The wording the brief specifies for booking and service request flows. */
export function BookingConsentCheckbox(
  props: Omit<React.ComponentProps<typeof ConsentCheckbox>, "children">,
) {
  return (
    <ConsentCheckbox {...props}>
      I agree to the{" "}
      <Link href="/terms" className="link-lime">
        Terms and Conditions
      </Link>{" "}
      and understand how my personal information is processed as described in
      the{" "}
      <Link href="/privacy" className="link-lime">
        Privacy Policy
      </Link>
      .
    </ConsentCheckbox>
  );
}
