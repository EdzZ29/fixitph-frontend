"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  ClipboardPlus,
  MessagesSquare,
  Search,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingCard } from "@/components/dashboard/booking-card";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings, notifications, serviceRequests } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { personName, plural, relativeTime } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The four things a customer starts from here.
 *
 * Deliberately not derived from NAV_FOR_ROLE the way the admin overview's
 * grid is: half of these leave the dashboard for the public search and
 * post-a-job pages, which have no sidebar entry to derive from.
 */
const QUICK_ACTIONS: {
  href: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/search",
    label: "Find a service",
    blurb: "Browse verified providers near you and compare rates.",
    icon: Search,
  },
  {
    href: "/post-job",
    label: "Request a quote",
    blurb: "Describe the job once, and providers nearby quote for it.",
    icon: ClipboardPlus,
  },
  {
    href: "/dashboard/bookings",
    label: "View bookings",
    blurb: "Confirm, reschedule, cancel and review your jobs.",
    icon: CalendarCheck,
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    blurb: "Every conversation with a provider, in one place.",
    icon: MessagesSquare,
  },
];

/**
 * The customer's landing screen. One question: what needs me, and when?
 *
 * The figures are read off the pagination totals of a few cheap, narrowly
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
  /**
   * Read a page at a time rather than counted, because "pending review" is
   * not a status the API can filter on — it is a completed booking with no
   * review hanging off it, which only the rows themselves answer. 50 is the
   * API's ceiling, and the list comes back newest first, so an unrated job
   * would have to be older than the last 50 to go uncounted.
   */
  const completed = useQuery(
    () => bookings.list({ status: "COMPLETED", limit: 50 }),
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
  const activity = useQuery(() => notifications.list({ limit: 5 }), []);

  const loading = upcoming.loading || awaiting.loading;

  // A posted job is still working for them until it is booked or closed,
  // which is both of the statuses a provider can still act on.
  const quotesIn = quoted.data?.total ?? 0;
  const activeRequests = (openRequests.data?.total ?? 0) + quotesIn;
  const pendingReviews =
    completed.data?.items.filter((booking) => !booking.review).length ?? 0;

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
            <Link href="/post-job">Post a job</Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard
          label="Active requests"
          value={activeRequests}
          hint={
            quotesIn
              ? `${plural(quotesIn, "quote")} to review`
              : "Waiting for quotes"
          }
          tone={quotesIn ? "warning" : "neutral"}
          href="/dashboard/requests"
          loading={openRequests.loading || quoted.loading}
        />
        <StatCard
          label="Upcoming bookings"
          value={upcoming.data?.total ?? 0}
          hint="Confirmed and scheduled"
          href="/dashboard/bookings"
          loading={upcoming.loading}
        />
        <StatCard
          label="Completed services"
          value={completed.data?.total ?? 0}
          hint="All time"
          href="/dashboard/bookings"
          loading={completed.loading}
        />
        <StatCard
          label="Pending reviews"
          value={pendingReviews}
          hint="Jobs you have not rated yet"
          tone={pendingReviews ? "warning" : "neutral"}
          href="/dashboard/bookings"
          loading={completed.loading}
        />
      </StatGrid>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="ring-foreground/10 group/card hover:bg-secondary/50 rounded-xl px-4 py-3.5 ring-1 transition-colors"
            >
              <p className="font-heading flex items-center gap-1.5 text-sm font-medium">
                <action.icon className="size-4 shrink-0" aria-hidden />
                {action.label}
                <ArrowUpRight
                  className="ml-auto size-3.5 opacity-0 transition-opacity group-hover/card:opacity-100"
                  aria-hidden
                />
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {action.blurb}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-medium">
            Needs your attention
          </h2>
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
                    openRequests.data?.total
                      ? "/dashboard/requests"
                      : "/post-job"
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

      {/*
        The same rows the notification panel shows, on the page rather than
        behind the bell. The panel is for catching up on everything; this is
        so the landing screen says what has happened lately without being
        opened at all.
      */}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Recent activity</h2>

        {activity.loading ? (
          <LoadingRows rows={3} />
        ) : activity.error ? (
          <ErrorState error={activity.error} onRetry={activity.reload} />
        ) : !activity.data?.items.length ? (
          <EmptyState
            icon={Bell}
            title="Nothing yet"
            description="Quotes, booking changes and messages will show up here."
          />
        ) : (
          <ul className="ring-foreground/10 divide-border divide-y rounded-xl px-4 ring-1">
            {activity.data.items.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <time
                    className="text-muted-foreground shrink-0 text-xs"
                    dateTime={item.createdAt}
                  >
                    {relativeTime(item.createdAt)}
                  </time>
                </div>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
