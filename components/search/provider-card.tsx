"use client";

import Link from "next/link";
import { Clock, MapPin, Scale, Star } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FavouriteButton } from "@/components/search/favourite-button";
import {
  VerificationRow,
  VerifiedMark,
} from "@/components/search/verification-badges";
import type { ProviderSummary } from "@/lib/api/client";
import { money, plural, priceLine } from "@/lib/format";

/**
 * A provider in a results list.
 *
 * Everything on this card is something a customer weighs before making
 * contact: whether the ID and permits were checked, what other people said,
 * how many jobs they have actually finished, how fast they reply, and the
 * cheapest thing they list. That is the transparency the platform is for, so
 * none of it is behind the profile page.
 */
export function ProviderCard({
  provider,
  compared,
  onCompareChange,
  compareDisabled,
}: {
  provider: ProviderSummary;
  compared?: boolean;
  onCompareChange?: (next: boolean) => void;
  /** True when the compare tray is full and this one is not in it. */
  compareDisabled?: boolean;
}) {
  const rating = Number(provider.ratingAvg);
  const cheapest = cheapestService(provider);

  return (
    <article className="border-border bg-card flex h-full flex-col rounded-lg border-2 p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg leading-snug font-semibold">
            <Link
              href={`/providers/${provider.slug}`}
              className="underline-offset-4 hover:underline"
            >
              {provider.businessName}
            </Link>
            <VerifiedMark verification={provider.verification} className="ml-1.5" />
          </h3>

          {provider.headline ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {provider.headline}
            </p>
          ) : null}
        </div>

        <FavouriteButton providerId={provider.id} />
      </div>

      {/* Which checks were done, rather than one ambiguous tick. */}
      <VerificationRow verification={provider.verification} className="mt-2.5" />

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        {provider.ratingCount > 0 ? (
          <span className="flex items-center gap-1">
            <Star className="fill-accent text-brand-lime-ink size-4" aria-hidden />
            <span className="font-medium tabular-nums">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({provider.ratingCount})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">No reviews yet</span>
        )}

        <span className="text-muted-foreground">
          {plural(provider.completedJobsCount, "job")} done
        </span>
      </div>

      <dl className="text-muted-foreground mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Based in</dt>
          <dd>
            {[provider.baseBarangay, provider.baseCity]
              .filter(Boolean)
              .join(", ")}
          </dd>
        </div>

        {cheapest ? (
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Starting price</dt>
            <dd>
              {cheapest.label} from{" "}
              <span className="text-foreground font-medium">
                {cheapest.price}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>

      {provider.paymentMethods.length ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Accepts{" "}
          {provider.paymentMethods
            .map((method) => method.replace(/_/g, " ").toLowerCase())
            .join(", ")}
        </p>
      ) : null}

      {!provider.isAcceptingBookings ? (
        <p className="border-border bg-secondary text-muted-foreground mt-3 rounded-md border px-3 py-2 text-xs">
          Not taking new bookings at the moment.
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button asChild variant="accent" className="h-10 px-4">
          <Link href={`/providers/${provider.slug}`}>View profile</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href={`/post-job?providerId=${provider.id}`}>Request a quote</Link>
        </Button>

        {onCompareChange ? (
          <label
            className={cn(
              "text-muted-foreground ml-auto flex cursor-pointer items-center gap-1.5 text-sm",
              compareDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Checkbox
              checked={compared}
              disabled={compareDisabled}
              onCheckedChange={(checked) => onCompareChange(checked === true)}
              aria-label={`Compare ${provider.businessName}`}
            />
            <Scale className="size-3.5" aria-hidden />
            Compare
          </label>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The cheapest priced service on the card, for a "from ₱450" line. A
 * quote-only listing has no figure to show, so it is skipped rather than
 * rendered as a zero.
 */
function cheapestService(
  provider: ProviderSummary,
): { label: string; price: string } | null {
  const priced = (provider.services ?? []).filter(
    (service) => service.pricingType !== "QUOTE_REQUIRED" && service.price,
  );
  if (!priced.length) return null;

  const best = priced.reduce((cheapest, service) =>
    Number(service.price) < Number(cheapest.price) ? service : cheapest,
  );

  return {
    label: best.title,
    price:
      best.pricingType === "FIXED"
        ? money(best.price)
        : priceLine(best).replace(/^/, ""),
  };
}
