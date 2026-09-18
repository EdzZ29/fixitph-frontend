"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionError, Spinner } from "@/components/dashboard/states";
import { useAction } from "@/lib/use-query";

/**
 * The confirm-with-a-reason dialog, used for every consequential action in
 * these dashboards: cancelling a booking, suspending an account, taking a
 * listing down, hiding a review, rejecting a verification.
 *
 * Two things it is strict about, both because the API is:
 *
 *   - The reason is not decoration. Several of these endpoints require ten or
 *     more characters and write it to an insert-only audit log, so the length
 *     is checked here rather than surfacing a 400 the user has to decode.
 *   - The dialog stays open on failure, with the typed reason intact. A
 *     cancellation that 409s because the booking already moved on should not
 *     also lose the paragraph the user wrote.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  reason: reasonConfig,
  children,
  onConfirm,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Omit to confirm without a reason field. */
  reason?: {
    label: string;
    placeholder?: string;
    /** Matches the API's own minimum, so the user never sees its 400. */
    minLength?: number;
    /** Sent as an empty string rather than blocking, when the API allows it. */
    optional?: boolean;
  };
  /** Extra fields: a refund amount, a resolution status, a checkbox. */
  children?: ReactNode;
  onConfirm: (reason: string) => Promise<unknown>;
  /** Runs only after a successful confirm, typically to reload a list. */
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const { run, pending, error, clearError } = useAction();
  const fieldId = useId();

  // Reset as the dialog opens, so a reason typed against a previous row can
  // never be submitted against this one. Adjusted during render rather than in
  // an effect: this is derived state reacting to a prop change, and doing it
  // here means the dialog's first paint is already blank.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setTouched(false);
      clearError();
    }
  }

  const min = reasonConfig?.minLength ?? 0;
  const trimmed = reason.trim();
  const tooShort = !!reasonConfig && !reasonConfig.optional && trimmed.length < min;
  const showLengthHint = touched && tooShort;

  async function handleConfirm() {
    if (tooShort) {
      setTouched(true);
      return;
    }
    const result = await run(() => onConfirm(trimmed));
    // run() returns null only when it caught an error, in which case the
    // dialog stays put with the message and the text still in it.
    if (result !== null) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {children}

        {reasonConfig ? (
          <div className="space-y-1.5">
            <Label htmlFor={fieldId}>
              {reasonConfig.label}
              {reasonConfig.optional ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  (optional)
                </span>
              ) : null}
            </Label>
            <Textarea
              id={fieldId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={reasonConfig.placeholder}
              aria-invalid={showLengthHint || undefined}
              aria-describedby={`${fieldId}-hint`}
              rows={3}
              autoFocus
            />
            <p
              id={`${fieldId}-hint`}
              className={
                showLengthHint
                  ? "text-destructive text-sm"
                  : "text-muted-foreground text-sm"
              }
            >
              {showLengthHint
                ? `At least ${min} characters. ${trimmed.length} so far.`
                : min > 0
                  ? `At least ${min} characters. This is written to the audit log.`
                  : "Shown to the other party."}
            </p>
          </div>
        ) : null}

        <ActionError message={error} />

        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "accent"}
            size="lg"
            onClick={handleConfirm}
            disabled={pending || tooShort}
          >
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
