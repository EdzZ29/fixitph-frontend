"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Info,
  Mail,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VerificationBadge, VerificationSummary } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

/**
 * What FixItPH checked about a provider — and, just as importantly, what it
 * did not.
 *
 * The rule from the brief is carried through here rather than left to each
 * page: a badge states that one specific check was carried out. It is not a
 * guarantee of the provider's work or of anything they claim. So the
 * disclaimer travels with the badges (the API sends it alongside them), and
 * every badge can be opened to read what it actually means in plain words.
 *
 * The badges are deliberately not a single "Verified" tick. "Identity
 * Verified" and "Business Verified" mean different things, a customer choosing
 * between two providers cares which, and collapsing them would overstate the
 * weaker one.
 */

const ICON: Record<VerificationBadge, LucideIcon> = {
  EMAIL: Mail,
  IDENTITY: ShieldCheck,
  BUSINESS: Building2,
};

export function VerificationBadges({
  verification,
  /** "full" shows unearned checks too, which only the owner needs to see. */
  variant = "compact",
  /**
   * Narrows the list to the checks that apply.
   *
   * An individual tradesperson is never asked for business papers, so showing
   * them "Business Verified · not yet" invents a gap that does not exist —
   * and contradicts the same screen telling them every check is complete.
   */
  only,
  className,
}: {
  verification: VerificationSummary;
  variant?: "compact" | "full";
  only?: VerificationBadge[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const relevant = only
    ? verification.badges.filter((badge) => only.includes(badge.badge))
    : verification.badges;

  const shown =
    variant === "full" ? relevant : relevant.filter((badge) => badge.earned);

  if (!shown.length && variant === "compact") {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        No checks completed yet.
      </p>
    );
  }

  return (
    <div className={className}>
      <ul className="flex flex-wrap items-center gap-1.5">
        {shown.map((badge) => {
          const Icon = ICON[badge.badge];
          return (
            <li key={badge.badge}>
              <span
                title={badge.means}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-4xl px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                  badge.earned
                    ? "bg-accent text-accent-foreground ring-transparent"
                    : "text-muted-foreground ring-border",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {badge.earned ? "✓ " : ""}
                {badge.label}
                {!badge.earned ? (
                  <span className="font-normal opacity-70"> · not yet</span>
                ) : null}
              </span>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-4xl px-1.5 py-1 text-xs underline-offset-4 hover:underline focus-visible:ring-3"
          >
            <Info className="size-3.5" aria-hidden />
            What do these mean?
          </button>
        </li>
      </ul>

      {/*
        The disclaimer is not hidden behind the dialog. Someone scanning a
        profile should see the limit of the claim without having to ask for it.
      */}
      <p className="text-muted-foreground mt-2 text-xs">
        {verification.disclaimer}
      </p>

      <BadgeLegendDialog
        verification={verification}
        badges={relevant}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

/**
 * The legend, shared by the badge list and the single tick beside a name.
 *
 * Wherever a verification mark appears, the same explanation is one click
 * away — including the sentence about what it does not mean.
 */
function BadgeLegendDialog({
  verification,
  badges = verification.badges,
  open,
  onOpenChange,
}: {
  verification: VerificationSummary;
  badges?: VerificationSummary["badges"];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>What FixItPH checked</DialogTitle>
          <DialogDescription>
            Each badge is a single check that an administrator carried out. They
            are not a rating, and they are not a promise about the work.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {badges.map((badge) => {
            const Icon = ICON[badge.badge];
            return (
              <li
                key={badge.badge}
                className="border-border flex gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    badge.earned
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {badge.earned ? "✓ " : ""}
                    {badge.label}
                    {!badge.earned ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        — not completed
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {badge.means}
                  </p>
                  {badge.earned && badge.at ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Checked {formatDate(badge.at)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-border bg-secondary rounded-md border px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <BadgeCheck className="size-4" aria-hidden />
            What a badge does not mean
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {verification.disclaimer}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A single tick beside a provider's name, and only once every check their
 * trading type calls for has passed.
 *
 * Deliberately all-or-nothing. A name is read at a glance, so a mark there
 * has to mean one clear thing; showing it for a partly checked provider would
 * make it mean "some of it", which is exactly the overstatement the badges
 * exist to avoid. Anyone part-way through still shows their individual badges
 * lower down, where there is room to say which.
 *
 * `complete` comes from the API, which knows that an individual is finished
 * with proof of identity while a business also needs its permit.
 */
export function VerifiedMark({
  verification,
  /** "icon" is for tight rows; "label" spells the word out. */
  variant = "icon",
  className,
}: {
  verification: VerificationSummary;
  variant?: "icon" | "label";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!verification.complete) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // Names are usually inside a link to the profile.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        title="Verified by FixItPH — what this means"
        aria-label="Verified by FixItPH. See what was checked."
        className={cn(
          "focus-visible:ring-ring/50 inline-flex shrink-0 items-center gap-1 align-middle focus-visible:ring-3 focus-visible:outline-none",
          // Filled rather than a bare tick: an outline in the foreground
          // colour is nearly invisible next to a heading on a dark theme,
          // which is exactly where this needs to read at a glance.
          variant === "label"
            ? "bg-accent text-accent-foreground rounded-4xl px-2 py-0.5 text-xs font-medium"
            : "bg-accent text-accent-foreground size-5 justify-center rounded-full",
          className,
        )}
      >
        <BadgeCheck
          className={variant === "label" ? "size-3.5" : "size-3.5"}
          aria-hidden
        />
        {variant === "label" ? "Verified" : null}
      </button>

      <BadgeLegendDialog
        verification={verification}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/**
 * The one-line version for a search result, where there is no room for the
 * full legend. Links through to the profile, which carries the explanation.
 */
export function VerificationRow({
  verification,
  className,
}: {
  verification: VerificationSummary;
  className?: string;
}) {
  const earned = verification.badges.filter((badge) => badge.earned);
  if (!earned.length) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {earned.map((badge) => {
        const Icon = ICON[badge.badge];
        return (
          <li key={badge.badge}>
            <span
              title={`${badge.means} ${verification.disclaimer}`}
              className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-4xl px-2 py-0.5 text-xs font-medium"
            >
              <Icon className="size-3" aria-hidden />
              {badge.label.replace(" Verified", "")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
