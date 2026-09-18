"use client";

import { useState } from "react";

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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionError, Spinner } from "@/components/dashboard/states";
import { useSession } from "@/lib/auth/session";
import {
  reports,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/api/client";
import { useAction } from "@/lib/use-query";

/**
 * Flagging something to the moderators — the user-facing half of requirement
 * thirteen. The admin queue that receives these is /admin/reports.
 *
 * The reason list is narrowed per target, because the full enum contains
 * options that make no sense for what is being reported: a listing cannot be
 * a no-show and a booking cannot be a fake review. Offering all nine would
 * produce a queue of miscategorised reports.
 *
 * Reporting the same thing twice is refused by the API with ALREADY_REPORTED,
 * which is surfaced as-is: it is a useful answer, not an error.
 */
const REASONS: Record<ReportTargetType, ReportReason[]> = {
  PROVIDER: [
    "FRAUD",
    "OFF_PLATFORM_PAYMENT",
    "POOR_WORKMANSHIP",
    "NO_SHOW",
    "HARASSMENT",
    "SPAM",
    "OTHER",
  ],
  SERVICE: ["FRAUD", "SPAM", "INAPPROPRIATE_CONTENT", "OTHER"],
  REVIEW: ["FAKE_REVIEW", "HARASSMENT", "INAPPROPRIATE_CONTENT", "SPAM", "OTHER"],
  USER: ["HARASSMENT", "FRAUD", "SPAM", "OTHER"],
  BOOKING: ["NO_SHOW", "POOR_WORKMANSHIP", "OFF_PLATFORM_PAYMENT", "FRAUD", "OTHER"],
  MESSAGE: ["HARASSMENT", "SPAM", "INAPPROPRIATE_CONTENT", "FRAUD", "OTHER"],
};

const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: "Spam or advertising",
  FRAUD: "Fraud or a scam",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  HARASSMENT: "Harassment or abuse",
  NO_SHOW: "Did not turn up",
  POOR_WORKMANSHIP: "Bad workmanship",
  FAKE_REVIEW: "Fake review",
  OFF_PLATFORM_PAYMENT: "Asked to pay outside FixItPH",
  OTHER: "Something else",
};

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** What is being reported, shown so there is no doubt. */
  targetLabel: string;
}) {
  const { state } = useSession();
  const options = REASONS[targetType];

  const [reason, setReason] = useState<ReportReason>(options[0]);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  const { run, pending, error, clearError } = useAction();

  // Reset as the dialog opens, not in an effect: derived state off a prop.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(options[0]);
      setDetails("");
      setSent(false);
      clearError();
    }
  }

  const signedIn = state.status === "authenticated";

  async function submit() {
    const result = await run(() =>
      reports.create({
        targetType,
        targetId,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      }),
    );
    if (result !== null) setSent(true);
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {sent ? "Thanks, we have it" : `Report ${targetLabel}`}
          </DialogTitle>
          <DialogDescription>
            {sent
              ? "A moderator will look at this. We do not tell them who reported it."
              : "A moderator reviews every report. Give us enough to act on."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <DialogFooter>
            <Button variant="accent" size="lg" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        ) : !signedIn ? (
          <>
            <p className="text-sm">
              You need to be signed in to report something, so a moderator can
              follow up if they need to.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button asChild variant="accent" size="lg">
                <a href="/login">Sign in</a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`reason-${targetId}`}>
                  What is the problem?
                </Label>
                <Select
                  id={`reason-${targetId}`}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as ReportReason)
                  }
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {REASON_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`details-${targetId}`}>
                  What happened?{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional, but it helps)
                  </span>
                </Label>
                <Textarea
                  id={`details-${targetId}`}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Dates, what was said or done, and anything a moderator can check."
                />
              </div>
            </div>

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
                variant="destructive"
                size="lg"
                onClick={() => void submit()}
                disabled={pending}
              >
                {pending ? <Spinner /> : null}
                Send report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
