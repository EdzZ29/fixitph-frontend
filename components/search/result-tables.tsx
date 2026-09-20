"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { VerifiedMark } from "@/components/search/verification-badges";
import type { ProviderSummary, PublicService } from "@/lib/api/client";
import { formatDuration, priceLine } from "@/lib/format";

/**
 * The table layouts.
 *
 * A table exists for one job the cards are bad at: reading the same figure
 * down a column. Cards put each price in a different place on the screen, so
 * comparing five of them means five separate looks; a column of prices is one.
 *
 * Both tables scroll sideways rather than collapsing or hiding columns. A
 * column quietly dropped on a narrow screen is worse than one you have to
 * reach — the reader cannot tell it was ever there.
 */

function Rating({
  avg,
  count,
}: {
  avg: string | number;
  count: number;
}) {
  if (count <= 0) {
    return <span className="text-muted-foreground">No reviews</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="text-accent size-3.5 fill-current" aria-hidden />
      {Number(avg).toFixed(1)}
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

const TH =
  "border-border text-muted-foreground border-b px-3 py-2 text-left text-xs font-medium tracking-wide uppercase";
const TD = "border-border border-b px-3 py-3 align-top";

export function ServiceTable({ services }: { services: PublicService[] }) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border-2">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <caption className="sr-only">
          Services matching your search, with price, duration and provider
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Service
            </th>
            <th scope="col" className={TH}>
              Category
            </th>
            <th scope="col" className={TH}>
              Price
            </th>
            <th scope="col" className={TH}>
              Duration
            </th>
            <th scope="col" className={TH}>
              Provider
            </th>
            <th scope="col" className={TH}>
              Rating
            </th>
            <th scope="col" className={TH}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const { provider } = service;
            return (
              <tr key={service.id} className="hover:bg-secondary/40">
                <th scope="row" className={`${TD} font-medium`}>
                  <Link
                    href={`/services/${service.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {service.title}
                  </Link>
                </th>
                <td className={`${TD} text-muted-foreground`}>
                  {service.category.name}
                </td>
                <td className={`${TD} font-medium whitespace-nowrap`}>
                  {priceLine(service)}
                </td>
                <td className={`${TD} text-muted-foreground whitespace-nowrap`}>
                  {service.durationMinutes
                    ? formatDuration(service.durationMinutes)
                    : "—"}
                </td>
                <td className={TD}>
                  <Link
                    href={`/providers/${provider.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {provider.businessName}
                  </Link>
                  <VerifiedMark verification={provider.verification} className="ml-1.5" />
                  <span className="text-muted-foreground block text-xs">
                    {[provider.baseBarangay, provider.baseCity]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <Rating avg={provider.ratingAvg} count={provider.ratingCount} />
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <Button asChild size="sm" variant="accent">
                    <Link
                      href={`/post-job?providerId=${provider.id}&serviceId=${service.id}&categoryId=${service.category.id}`}
                    >
                      Book
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProviderTable({
  providers,
}: {
  providers: ProviderSummary[];
}) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border-2">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <caption className="sr-only">
          Providers matching your search, with location, rating and jobs done
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Provider
            </th>
            <th scope="col" className={TH}>
              Area
            </th>
            <th scope="col" className={TH}>
              Rating
            </th>
            <th scope="col" className={TH}>
              Jobs done
            </th>
            <th scope="col" className={TH}>
              Taking work
            </th>
            <th scope="col" className={TH}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider.id} className="hover:bg-secondary/40">
              <th scope="row" className={`${TD} font-medium`}>
                <Link
                  href={`/providers/${provider.slug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {provider.businessName}
                </Link>
                <VerifiedMark verification={provider.verification} className="ml-1.5" />
                {provider.headline ? (
                  <span className="text-muted-foreground block max-w-xs truncate text-xs font-normal">
                    {provider.headline}
                  </span>
                ) : null}
              </th>
              <td className={`${TD} text-muted-foreground`}>
                {[provider.baseBarangay, provider.baseCity]
                  .filter(Boolean)
                  .join(", ")}
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <Rating avg={provider.ratingAvg} count={provider.ratingCount} />
              </td>
              <td className={`${TD} tabular-nums`}>
                {provider.completedJobsCount}
              </td>
              <td className={TD}>
                {provider.isAcceptingBookings ? (
                  "Yes"
                ) : (
                  <span className="text-muted-foreground">Paused</span>
                )}
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/providers/${provider.slug}`}>View</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
