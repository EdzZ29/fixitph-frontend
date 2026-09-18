"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/dashboard/booking-card";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings, serviceRequests } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { personName } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The customer's landing screen. One question: what needs me, and when?
 *
 * The figures are read off the pagination totals of three cheap, narrowly
 * filtered requests rather than a bespoke stats endpoint — a customer has
 * tens of bookings, not thousands, so counting them properly is not worth a
 * round trip of its own.
 */
export function CustomerOverview() {
  const user = useCurrentUser();

  const upcoming = useQuery(
    () => bookings.list({ status: "CONFIRMED", limit: 5 }),
    [],
  );
  const awaiting = useQuery(
    () => bookings.list({ status: "PENDING_CONFIRMATION", limit: 5 }),
    [],
  );
  const completed = useQuery(
    () => bookings.list({ status: "COMPLETED", limit: 1 }),
    [],
  );
  const openRequests = useQuery(
    () => serviceRequests.list({ status: "OPEN", limit: 1 }),
    [],
  );
  const quoted = useQuery(
    () => serviceRequests.list({ status: "QUOTED", limit: 1 }),
    [],
  );

  const loading = upcoming.loading || awaiting.loading;

  // Confirmed jobs first, then the ones still waiting on a provider: that is
  // the order they need attention in.
  const attention = [
    ...(upcoming.data?.items ?? []),
    ...(awaiting.data?.items ?? []),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${personName(user.profile, user.email).split(" ")[0]}`}
        description="Your jobs, quotes and saved providers in one place."
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/#search">Post a job</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard
          label="Confirmed jobs"
          value={upcoming.data?.total ?? 0}
          hint="Provider has accepted"
          href="/dashboard/bookings"
          loading={upcoming.loading}
        />
        <StatCard
          label="Awaiting provider"
          value={awaiting.data?.total ?? 0}
          hint="Not accepted yet"
          tone={awaiting.data?.total ? "warning" : "neutral"}
          href="/dashboard/bookings"
          loading={awaiting.loading}
        />
        <StatCard
          label="Quotes to review"
          value={quoted.data?.total ?? 0}
          hint="Requests with a quote in"
          tone={quoted.data?.total ? "warning" : "neutral"}
          href="/dashboard/requests"
          loading={quoted.loading}
        />
        <StatCard
          label="Jobs completed"
          value={completed.data?.total ?? 0}
          hint="All time"
          href="/dashboard/bookings"
          loading={completed.loading}
        />
      </StatGrid>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-medium">Needs your attention</h2>
          <Link
            href="/dashboard/bookings"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            All bookings
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {loading ? (
          <LoadingRows rows={2} />
        ) : upcoming.error ? (
          <ErrorState error={upcoming.error} onRetry={upcoming.reload} />
        ) : !attention.length ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing booked right now"
            description={
              openRequests.data?.total
                ? "You have an open request waiting for quotes. Check back shortly."
                : "Post a job and providers near you can quote for it."
            }
            action={
              <Button asChild variant="accent" size="lg">
                <Link
                  href={
                    openRequests.data?.total ? "/dashboard/requests" : "/#search"
                  }
                >
                  {openRequests.data?.total ? "See my requests" : "Post a job"}
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {attention.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                perspective="customer"
                onChanged={() => {
                  upcoming.reload();
                  awaiting.reload();
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
