import Link from "next/link";
import { Clock, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VerifiedMark } from "@/components/search/verification-badges";
import type { PublicService } from "@/lib/api/client";
import { formatDuration, PRICING_LABEL, priceLine } from "@/lib/format";

/**
 * A service listing in a results list. Shows the price and who is charging
 * it together, because neither is a decision on its own.
 */
export function ServiceCard({ service }: { service: PublicService }) {
  const { provider } = service;

  return (
    <article className="border-border bg-card flex h-full flex-col rounded-lg border-2 p-5">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {service.category.name}
      </p>

      <h3 className="font-heading mt-1 text-lg leading-snug font-semibold">
        <Link
          href={`/services/${service.id}`}
          className="underline-offset-4 hover:underline"
        >
          {service.title}
        </Link>
      </h3>

      <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
        {service.description}
      </p>

      <div className="mt-4 flex items-baseline gap-2">
        <p className="font-heading text-2xl leading-none font-semibold tabular-nums">
          {priceLine(service)}
        </p>
        {service.pricingType !== "FIXED" &&
        service.pricingType !== "QUOTE_REQUIRED" ? (
          <span className="text-muted-foreground text-xs">
            {PRICING_LABEL[service.pricingType]}
          </span>
        ) : null}
      </div>

      {service.durationMinutes ? (
        <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-sm">
          <Clock className="size-3.5" aria-hidden />
          Usually {formatDuration(service.durationMinutes)}
        </p>
      ) : null}

      <div className="border-border mt-4 border-t pt-3">
        <p className="text-sm font-medium">
          <Link
            href={`/providers/${provider.slug}`}
            className="underline-offset-4 hover:underline"
          >
            {provider.businessName}
          </Link>
          <VerifiedMark verification={provider.verification} className="ml-1.5" />
        </p>

        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {[provider.baseBarangay, provider.baseCity].filter(Boolean).join(", ")}
          </span>
          {provider.ratingCount > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="fill-accent text-brand-lime-ink size-3.5" aria-hidden />
              <span className="tabular-nums">
                {Number(provider.ratingAvg).toFixed(1)}
              </span>
              ({provider.ratingCount})
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button asChild variant="accent" className="h-10 px-4">
          <Link
            href={`/post-job?providerId=${provider.id}&serviceId=${service.id}&categoryId=${service.category.id}`}
          >
            Book or request a quote
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href={`/services/${service.id}`}>Details</Link>
        </Button>
      </div>
    </article>
  );
}
