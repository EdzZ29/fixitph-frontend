"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/dashboard/booking-card";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  EmptyState,
  ErrorState,
  GateCard,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings, providers, serviceRequests, services } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { VerifyReminder } from "@/components/dashboard/provider/verify-reminder";
import { personName, plural, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The provider's landing screen.
 *
 * Ordered by what costs them money if ignored: jobs waiting on their decision
 * first, then their verification state (which gates publishing at all), then
 * the listings and the rating.
 */
export function ProviderOverview() {
  const user = useCurrentUser();
  const provider = user.provider;

  const pending = useQuery(
    () => bookings.list({ status: "PENDING_CONFIRMATION", limit: 5 }),
    [],
  );
  const confirmed = useQuery(
    () => bookings.list({ status: "CONFIRMED", limit: 5 }),
    [],
  );
  const inProgress = useQuery(
    () => bookings.list({ status: "IN_PROGRESS", limit: 5 }),
    [],
  );
  const myServices = useQuery(() => services.mine({ limit: 1 }), []);
  const openFeed = useQuery(
    () => serviceRequests.feed({ limit: 1 }).catch(() => null),
    [],
  );
  const profile = useQuery(
    () => (provider ? providers.byId(provider.id) : Promise.resolve(null)),
    [provider?.id],
  );

  if (!provider) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Become a provider"
          description="You are signed in as a customer. A provider profile is what lets you list services and take bookings."
        />
        <GateCard
          title="Set up your provider profile"
          description="Tell us your business name, where you are based and what you accept as payment. You can add services straight after, and publish them once your documents are approved."
          href="/provider/profile"
          cta="Create provider profile"
        />
      </div>
    );
  }

  const verified = provider.verificationStatus === "APPROVED";
  const counts = myServices.data?.counts;

  // Decision first, then today's work.
  const attention = [
    ...(pending.data?.items ?? []),
    ...(inProgress.data?.items ?? []),
    ...(confirmed.data?.items ?? []),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={provider.businessName}
        description={
          <>
            Signed in as {personName(user.profile, user.email)} ·{" "}
            <StatusBadge
              meta={statusMeta.verification(provider.verificationStatus)}
              className="align-middle"
            />
          </>
        }
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/provider/services/new">
              <Plus aria-hidden />
              New service
            </Link>
          </Button>
        }
      />

<VerifyReminder />

      <StatGrid>
        <StatCard
          label="Waiting on you"
          value={pending.data?.total ?? 0}
          hint="Jobs to accept or decline"
          tone={pending.data?.total ? "warning" : "neutral"}
          href="/provider/jobs"
          loading={pending.loading}
        />
        <StatCard
          label="Scheduled"
          value={confirmed.data?.total ?? 0}
          hint="Accepted and upcoming"
          href="/provider/jobs"
          loading={confirmed.loading}
        />
        <StatCard
          label="Live listings"
          value={counts?.ACTIVE ?? 0}
          hint={
            counts?.DRAFT
              ? `${plural(counts.DRAFT, "draft")} not published`
              : "Visible in the directory"
          }
          href="/provider/services"
          loading={myServices.loading}
        />
        <StatCard
          label="Rating"
          value={
            profile.data && profile.data.ratingCount > 0
              ? Number(profile.data.ratingAvg).toFixed(1)
              : "—"
          }
          hint={
            profile.data?.ratingCount
              ? plural(profile.data.ratingCount, "review")
              : "No reviews yet"
          }
          href="/provider/reviews"
          loading={profile.loading}
        />
      </StatGrid>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-medium">Needs your attention</h2>
          <Link
            href="/provider/jobs"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            All jobs
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {pending.loading ? (
          <LoadingRows rows={2} />
        ) : pending.error ? (
          <ErrorState error={pending.error} onRetry={pending.reload} />
        ) : !attention.length ? (
          <EmptyState
            icon={CalendarClock}
            title="No jobs on the books"
            description={
              openFeed.data?.total
                ? `There are ${plural(
                    openFeed.data.total,
                    "open request",
                  )} you could quote for.`
                : verified
                  ? "Quote for open requests and they will show up here once a customer accepts."
                  : "Once you are verified and your listings are live, work will come through here."
            }
            action={
              <Button asChild variant="accent" size="lg">
                <Link href="/provider/requests">Browse open requests</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {attention.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                perspective="provider"
                onChanged={() => {
                  pending.reload();
                  confirmed.reload();
                  inProgress.reload();
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
