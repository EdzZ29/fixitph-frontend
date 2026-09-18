"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/session";

/**
 * "Verify your account", with the one action that resolves it.
 *
 * One component rather than a paragraph repeated on each screen, so the
 * wording cannot drift and every reminder actually leads somewhere — the
 * banner this replaces told providers they were not verified and then left
 * them to work out what to do about it.
 *
 * It says nothing at all once the account is approved. A reminder that
 * outlives the thing it is reminding you about is noise, and people stop
 * reading the next one.
 */
export function VerifyReminder({ className }: { className?: string }) {
  const user = useCurrentUser();
  const provider = user.provider;

  if (!provider) return null;

  /**
   * An approved account can still be missing the one check the provider can
   * do themselves. Confirming an email takes a minute and earns a badge, so
   * it is worth a nudge — without it they never reach "fully verified", and
   * the mark never appears beside their name.
   */
  const emailUnconfirmed = user.emailVerifiedAt === null;
  if (provider.verificationStatus === "APPROVED" && !emailUnconfirmed) {
    return null;
  }

  const emailOnly =
    provider.verificationStatus === "APPROVED" && emailUnconfirmed;
  const pending = provider.verificationStatus === "PENDING";
  const rejected = provider.verificationStatus === "REJECTED";

  return (
    <div
      className={cn(
        "ring-foreground/10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl px-4 py-3 ring-1",
        className,
      )}
    >
      <BadgeCheck className="text-muted-foreground size-5 shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {emailOnly
            ? "Confirm your email address"
            : pending
              ? "Your documents are being reviewed"
              : rejected
                ? "Your verification needs another look"
                : "Verify your account"}
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {emailOnly
            ? "It takes a minute and earns the Email Verified badge. Until then your checks are not complete."
            : pending
              ? "We will let you know as soon as an administrator has decided. You can keep building listings as drafts."
              : rejected
                ? "Something was wrong with what you sent. The reason is on your verification page."
                : "Until you are verified your listings stay private and you will not appear in search."}
        </p>
      </div>

      <Button asChild variant={pending ? "outline" : "accent"} size="lg">
        <Link href="/provider/verification">
          {emailOnly
            ? "Confirm now"
            : pending
              ? "See progress"
              : rejected
                ? "See what to fix"
                : "Verify now"}
        </Link>
      </Button>
    </div>
  );
}
