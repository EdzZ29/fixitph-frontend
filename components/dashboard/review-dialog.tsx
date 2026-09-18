"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "cn";

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
import { reviews } from "@/lib/api/client";
import { useAction } from "@/lib/use-query";

const OVERALL_HINT: Record<number, string> = {
  1: "Bad. Would not book again.",
  2: "Below what was agreed.",
  3: "Did the job.",
  4: "Good work.",
  5: "Excellent. Would book again.",
};

/**
 * Leaving a review. The overall rating is required; the three sub-ratings and
 * the comment are not, because a forced comment is a useless comment.
 *
 * A review can only be left on a completed booking and only once — both
 * enforced by the API and by a unique index on booking_id — so a second
 * attempt fails loudly rather than quietly creating a duplicate.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  providerName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  providerName: string;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState("");
  const { run, pending, error, clearError } = useAction();

  // Cleared as the dialog opens, not in an effect: derived state reacting to
  // a prop change, so the first paint is already empty.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRating(0);
      setPunctuality(0);
      setQuality(0);
      setValue(0);
      setComment("");
      clearError();
    }
  }

  async function submit() {
    if (!rating) return;
    const result = await run(() =>
      reviews.create({
        bookingId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(punctuality ? { punctualityRating: punctuality } : {}),
        ...(quality ? { qualityRating: quality } : {}),
        ...(value ? { valueRating: value } : {}),
      }),
    );
    if (result !== null) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {providerName}</DialogTitle>
          <DialogDescription>
            Your rating is public and counts towards their score. You can edit
            it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Overall</Label>
            <StarPicker value={rating} onChange={setRating} size="lg" />
            <p className="text-muted-foreground mt-1.5 h-5 text-sm">
              {OVERALL_HINT[rating] ?? "Tap a star."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SubRating
              label="On time"
              value={punctuality}
              onChange={setPunctuality}
            />
            <SubRating
              label="Quality"
              value={quality}
              onChange={setQuality}
            />
            <SubRating
              label="Value"
              value={value}
              onChange={setValue}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`comment-${bookingId}`}>
              Comment{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id={`comment-${bookingId}`}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              placeholder="What was the work, and how did it go?"
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
            variant="accent"
            size="lg"
            onClick={() => void submit()}
            disabled={pending || !rating}
          >
            {pending ? <Spinner /> : null}
            Post review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <Label className="mb-1 block text-sm font-normal">{label}</Label>
      <StarPicker value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Five radio buttons that look like stars. Radios rather than buttons so the
 * group is one tab stop and arrow keys move between values, which is what a
 * screen reader user expects from a rating.
 */
function StarPicker({
  value,
  onChange,
  size = "default",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: "default" | "lg";
}) {
  const name = `rating-${useId()}`;

  return (
    <div role="radiogroup" className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className="focus-within:ring-ring/50 cursor-pointer rounded-sm p-0.5 focus-within:ring-3"
        >
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <Star
            className={cn(
              size === "lg" ? "size-7" : "size-4.5",
              star <= value
                ? "fill-accent text-brand-lime-ink"
                : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span className="sr-only">
            {star} star{star === 1 ? "" : "s"}
          </span>
        </label>
      ))}
    </div>
  );
}

