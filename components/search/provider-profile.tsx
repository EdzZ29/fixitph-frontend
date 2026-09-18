"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  Star,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FavouriteButton } from "@/components/search/favourite-button";
import {
  VerificationBadges,
  VerifiedMark,
} from "@/components/search/verification-badges";
import { ReportDialog } from "@/components/search/report-dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { Pagination } from "@/components/dashboard/pagination";
import { providers } from "@/lib/api/client";
import {
  formatDate,
  formatDuration,
  humanise,
  plural,
  PRICING_LABEL,
  priceLine,
  relativeTime,
  reviewerName,
  openingTime,
  statusMeta,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { useState } from "react";

/**
 * A provider's public profile — the step where a customer decides whether to
 * make contact.
 *
 * Requirement fourteen, transparency, is what this page is: the rating with
 * its full breakdown rather than a single number, every review including the
 * bad ones, the jobs actually completed, the documents that were checked, the
 * areas they cover, the hours they work, and what they charge. Nothing here
 * is a claim the provider makes about themselves except the bio.
 *
 * Hidden reviews are excluded by the API, not filtered here, so a moderated
 * review cannot leak through this page.
 */

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function ProviderProfileView({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useQuery(
    () => providers.profile(slug),
    [slug],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 lg:px-8">
        <ErrorState error={error} onRetry={reload} />
        <Button asChild variant="outline" className="mt-4 h-10 px-4">
          <Link href="/providers">Back to all providers</Link>
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const provider = data;
  const verified = provider.verificationStatus === "APPROVED";
  const rating = Number(provider.ratingAvg);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <Link href="/providers" className="underline-offset-4 hover:underline">
          Providers
        </Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{provider.businessName}</span>
      </nav>

      {/* -- header ---------------------------------------------------------- */}
      <header className="border-border mt-4 border-b pb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">
                {provider.businessName}
                <VerifiedMark
                  verification={provider.verification}
                  className="ml-2 align-[-2px]"
                />
              </h1>
              <span className="bg-secondary text-secondary-foreground rounded-4xl px-2.5 py-1 text-xs font-medium">
                {provider.providerType === "BUSINESS"
                  ? "Registered business"
                  : "Individual tradesperson"}
              </span>
              {!verified ? (
                <StatusBadge
                  meta={statusMeta.verification(provider.verificationStatus)}
                />
              ) : null}
            </div>

            {provider.headline ? (
              <p className="text-muted-foreground mt-1.5 text-base">
                {provider.headline}
              </p>
            ) : null}

            <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <dt className="sr-only">Based in</dt>
                <dd>
                  {[provider.baseBarangay, provider.baseCity]
                    .filter(Boolean)
                    .join(", ")}
                  {provider.serviceRadiusKm
                    ? ` · covers ${provider.serviceRadiusKm} km`
                    : ""}
                </dd>
              </div>

              {provider.responseTimeMinutes ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  <dt className="sr-only">Typical reply time</dt>
                  <dd>
                    Usually replies in{" "}
                    {formatDuration(provider.responseTimeMinutes)}
                  </dd>
                </div>
              ) : null}

              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                <dt className="sr-only">On the platform since</dt>
                <dd>Joined {formatDate(provider.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center gap-1">
            <FavouriteButton providerId={provider.id} />
          </div>
        </div>

        {/*
          Which specific checks were carried out, with what each one means and
          the limit of the claim. Not a single "Verified" tick: identity and
          business verification are different things and a customer choosing
          between two providers cares which.
        */}
        <VerificationBadges
          verification={provider.verification}
          className="mt-4"
        />

        {/* Three numbers a customer can weigh, not a marketing badge. */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Figure
            label={plural(provider.ratingCount, "review")}
            value={provider.ratingCount > 0 ? rating.toFixed(1) : "—"}
            suffix={provider.ratingCount > 0 ? "★" : undefined}
          />
          <Figure
            label="jobs completed"
            value={provider.completedJobsCount.toLocaleString("en-PH")}
          />
          <Figure
            label="years in the trade"
            value={provider.yearsExperience ? String(provider.yearsExperience) : "—"}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {provider.isAcceptingBookings ? (
            <Button asChild variant="accent" className="h-11 px-5 text-base">
              <Link href={`/post-job?providerId=${provider.id}`}>
                Request a quote
              </Link>
            </Button>
          ) : (
            <p className="border-border bg-secondary text-muted-foreground rounded-md border px-4 py-2.5 text-sm">
              This provider has paused new bookings.
            </p>
          )}

          {provider.acceptsEmergency ? (
            <StatusBadge meta={{ label: "Takes emergencies", tone: "warning" }} />
          ) : null}
        </div>

        {provider.paymentMethods.length ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Accepts{" "}
            {provider.paymentMethods
              .map((method) => method.replace(/_/g, " ").toLowerCase())
              .join(", ")}
            . You pay the provider directly — FixItPH does not handle the money.
          </p>
        ) : null}
      </header>

      {provider.bio ? (
        <section className="border-border border-b py-6">
          <h2 className="font-heading text-xl font-semibold">About</h2>
          <p className="text-muted-foreground mt-2 whitespace-pre-line">
            {provider.bio}
          </p>
        </section>
      ) : null}

      {/* -- services -------------------------------------------------------- */}
      <section className="border-border border-b py-6">
        <h2 className="font-heading text-xl font-semibold">
          What they do{" "}
          <span className="text-muted-foreground text-base font-normal">
            ({provider.services?.length ?? 0})
          </span>
        </h2>

        {!provider.services?.length ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nothing published yet. You can still send a request describing the
            job.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {provider.services.map((service) => (
              <li
                key={service.id}
                className="border-border rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {service.category.name}
                    </p>
                    <h3 className="font-heading mt-0.5 text-base font-medium">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {service.description}
                    </p>
                    {service.durationMinutes ? (
                      <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                        <Clock className="size-3" aria-hidden />
                        Usually {formatDuration(service.durationMinutes)}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="font-heading text-lg leading-none font-semibold tabular-nums">
                      {priceLine(service)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {PRICING_LABEL[service.pricingType]}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/services/${service.id}`}>
                      <Wrench aria-hidden />
                      Details
                    </Link>
                  </Button>
                  {provider.isAcceptingBookings ? (
                    <Button asChild variant="accent" size="sm">
                      <Link
                        href={`/post-job?providerId=${provider.id}&serviceId=${service.id}&categoryId=${service.category.id}`}
                      >
                        Request this
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -- coverage and hours ---------------------------------------------- */}
      {provider.serviceAreas?.length || provider.availability?.length ? (
        <section className="border-border grid gap-6 border-b py-6 sm:grid-cols-2">
          {provider.serviceAreas?.length ? (
            <div>
              <h2 className="font-heading text-xl font-semibold">Where they work</h2>
              <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
                {provider.serviceAreas.map((area) => (
                  <li key={area.id} className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {[area.barangay, area.city].filter(Boolean).join(", ") ||
                      humanise(area.areaType)}
                    {area.radiusKm ? ` (${area.radiusKm} km)` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {provider.availability?.length ? (
            <div>
              <h2 className="font-heading text-xl font-semibold">Working hours</h2>
              <dl className="mt-3 space-y-1 text-sm">
                {[...provider.availability]
                  .sort(
                    (a, b) =>
                      DAY_ORDER.indexOf(a.dayOfWeek) -
                      DAY_ORDER.indexOf(b.dayOfWeek),
                  )
                  .map((day) => (
                    <div key={day.dayOfWeek} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        {humanise(day.dayOfWeek)}
                      </dt>
                      <dd>
                        {day.isClosed || !day.startTime
                          ? "Closed"
                          : `${openingTime(day.startTime)} – ${openingTime(day.endTime)}`}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* -- portfolio ------------------------------------------------------- */}
      {provider.portfolioItems?.length ? (
        <section className="border-border border-b py-6">
          <h2 className="font-heading text-xl font-semibold">Past work</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {provider.portfolioItems.map((item) => (
              <li key={item.id} className="border-border rounded-lg border p-4">
                <h3 className="text-sm font-medium">{item.title}</h3>
                {item.description ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.description}
                  </p>
                ) : null}
                {item.completedAt ? (
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    {formatDate(item.completedAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReviewsSection providerId={provider.id} name={provider.businessName} />

      <footer className="py-6">
        <ReportProviderLink
          providerId={provider.id}
          name={provider.businessName}
        />
      </footer>
    </div>
  );
}

function Figure({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="border-border rounded-lg border p-3 text-center">
      <p className="font-heading text-2xl leading-none font-semibold tabular-nums">
        {value}
        {suffix ? (
          <span className="text-brand-lime-ink text-lg">{suffix}</span>
        ) : null}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}

/**
 * Reviews, paginated, with the star breakdown. Fetched separately from the
 * profile because it is its own endpoint and its own page state.
 */
function ReviewsSection({
  providerId,
  name,
}: {
  providerId: string;
  name: string;
}) {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(
    () => providers.reviews(providerId, { page, limit: 10, sort: "recent" }),
    [providerId, page],
  );

  const breakdown = data?.breakdown ?? [];
  const total = breakdown.reduce((sum, row) => sum + row.count, 0);
  const average =
    total > 0
      ? breakdown.reduce((sum, row) => sum + row.stars * row.count, 0) / total
      : 0;

  return (
    <section className="border-border border-b py-6">
      <h2 className="font-heading text-xl font-semibold">
        Reviews{" "}
        <span className="text-muted-foreground text-base font-normal">
          ({total})
        </span>
      </h2>

      {loading ? (
        <LoadingRows rows={3} className="mt-4" />
      ) : error ? (
        <div className="mt-4">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : !total ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description={`${name} has not been reviewed on FixItPH yet. Only customers with a completed booking can leave one.`}
        />
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="sm:w-28 sm:text-center">
              <p className="font-heading text-4xl leading-none font-semibold tabular-nums">
                {average.toFixed(1)}
              </p>
              <div className="mt-1.5 flex gap-0.5 sm:justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={
                      star <= Math.round(average)
                        ? "fill-accent text-brand-lime-ink size-4"
                        : "text-muted-foreground size-4"
                    }
                    aria-hidden
                  />
                ))}
              </div>
            </div>

            <ul className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count =
                  breakdown.find((row) => row.stars === stars)?.count ?? 0;
                const share = total ? Math.round((count / total) * 100) : 0;
                return (
                  <li key={stars} className="flex items-center gap-2 text-sm">
                    <span className="w-6 shrink-0 tabular-nums">{stars}★</span>
                    <div className="bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-8 shrink-0 text-right tabular-nums">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Separator className="my-5" />

          <ul className="space-y-5">
            {data?.items.map((review) => (
              <li key={review.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex gap-0.5"
                      aria-label={`${review.rating} out of 5`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={
                            star <= review.rating
                              ? "fill-accent text-brand-lime-ink size-3.5"
                              : "text-muted-foreground size-3.5"
                          }
                          aria-hidden
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium">
                      {reviewerName(review.author)}
                    </span>
                  </div>
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={review.createdAt}
                  >
                    {relativeTime(review.createdAt)}
                  </time>
                </div>

                {review.comment ? (
                  <p className="mt-2 text-sm">{review.comment}</p>
                ) : null}

                {review.providerResponse ? (
                  <div className="bg-secondary/50 mt-2 rounded-lg px-3.5 py-2.5">
                    <p className="text-xs font-medium">
                      Reply from {name}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {review.providerResponse}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <Pagination
              page={page}
              result={data}
              onPageChange={setPage}
              unit="review"
            />
          </div>
        </>
      )}
    </section>
  );
}

function ReportProviderLink({
  providerId,
  name,
}: {
  providerId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Flag aria-hidden />
        Report this provider
      </Button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        targetType="PROVIDER"
        targetId={providerId}
        targetLabel={name}
      />
    </>
  );
}
