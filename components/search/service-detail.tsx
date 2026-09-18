"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Flag, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VerifiedMark } from "@/components/search/verification-badges";
import { FavouriteButton } from "@/components/search/favourite-button";
import { ReportDialog } from "@/components/search/report-dialog";
import {
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { services } from "@/lib/api/client";
import {
  formatDuration,
  money,
  moneyRange,
  PRICING_LABEL,
  priceLine,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * One listing in full — the last stop before requesting it.
 *
 * Its job is to leave nothing to ask about: what the price covers, how it is
 * calculated, how long the job usually takes, and who is doing it. A customer
 * who has to message to find out the price is the thing this page exists to
 * prevent.
 */
export function ServiceDetailView({ serviceId }: { serviceId: string }) {
  const { data, loading, error, reload } = useQuery(
    () => services.byId(serviceId),
    [serviceId],
  );
  const [reporting, setReporting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 lg:px-8">
        <ErrorState error={error} onRetry={reload} />
        <Button asChild variant="outline" className="mt-4 h-10 px-4">
          <Link href="/search?tab=services">Browse other services</Link>
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const service = data;
  const { provider } = service;
  const quoteOnly = service.pricingType === "QUOTE_REQUIRED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <Link href="/search?tab=services" className="underline-offset-4 hover:underline">
          Services
        </Link>
        <span aria-hidden> / </span>
        <Link
          href={`/providers/${provider.slug}`}
          className="underline-offset-4 hover:underline"
        >
          {provider.businessName}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{service.title}</span>
      </nav>

      <header className="border-border mt-4 border-b pb-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {service.category.name}
        </p>
        <div className="mt-1 flex flex-wrap items-start gap-3">
          <h1 className="font-heading min-w-0 flex-1 text-3xl leading-tight font-semibold tracking-tight">
            {service.title}
          </h1>
          <FavouriteButton providerId={provider.id} />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="font-heading text-3xl leading-none font-semibold tabular-nums">
              {priceLine(service)}
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {PRICING_LABEL[service.pricingType]}
              {service.minPrice || service.maxPrice ? (
                <>
                  {" "}
                  · typically {moneyRange(service.minPrice, service.maxPrice)}
                </>
              ) : null}
            </p>
          </div>

          {service.durationMinutes ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Clock className="size-4" aria-hidden />
              Usually takes {formatDuration(service.durationMinutes)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="accent" className="h-11 px-5 text-base">
            <Link
              href={`/post-job?providerId=${provider.id}&serviceId=${service.id}&categoryId=${service.category.id}`}
            >
              {quoteOnly ? "Request a quote" : "Request this service"}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5">
            <Link href={`/providers/${provider.slug}`}>
              See the provider
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground mt-3 text-sm">
          {quoteOnly
            ? "This one is priced per job. Describe yours and the provider replies with a figure."
            : `The provider confirms the final price for your job before any work starts. Listed at ${money(service.price, service.currency)}.`}
        </p>
      </header>

      <section className="border-border border-b py-6">
        <h2 className="font-heading text-xl font-semibold">What is included</h2>
        <p className="mt-2 whitespace-pre-line">{service.description}</p>
      </section>

      <section className="border-border border-b py-6">
        <h2 className="font-heading text-xl font-semibold">Who does it</h2>

        <div className="border-border mt-3 rounded-lg border p-4">
          <p className="font-heading text-base font-medium">
            <Link
              href={`/providers/${provider.slug}`}
              className="underline-offset-4 hover:underline"
            >
              {provider.businessName}
            </Link>
            <VerifiedMark verification={provider.verification} className="ml-1.5" />
          </p>

          <dl className="text-muted-foreground mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <dt className="sr-only">Based in</dt>
              <dd>
                {[provider.baseBarangay, provider.baseCity]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="fill-accent text-brand-lime-ink size-3.5 shrink-0" aria-hidden />
              <dt className="sr-only">Rating</dt>
              <dd>
                {provider.ratingCount > 0
                  ? `${Number(provider.ratingAvg).toFixed(1)} from ${provider.ratingCount}`
                  : "No reviews yet"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="py-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setReporting(true)}
        >
          <Flag aria-hidden />
          Report this listing
        </Button>
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          targetType="SERVICE"
          targetId={service.id}
          targetLabel={service.title}
        />
      </footer>
    </div>
  );
}
