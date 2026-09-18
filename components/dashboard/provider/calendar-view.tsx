"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Segmented } from "@/components/dashboard/segmented";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  bookings as bookingsApi,
  serviceRequests,
  type BookingSummary,
  type RequestSummary,
} from "@/lib/api/client";
import { formatTime, money, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * A provider's month at a glance: confirmed jobs, and the requests they have
 * quoted for that have a preferred date.
 *
 * Both are on the same grid deliberately. A provider deciding whether to quote
 * for Thursday needs to see what Thursday already looks like, and keeping
 * requests on a separate screen is what makes people double-book.
 *
 * The two are visually distinct — a booking is committed work, a request is
 * only a possibility — so the grid never implies a request is a job.
 */

type DayCell = {
  date: Date;
  inMonth: boolean;
  bookings: BookingSummary[];
  requests: RequestSummary[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProviderCalendarView() {
  // The month being viewed, pinned to the 1st so arithmetic never rolls over
  // a short month (adding a month to the 31st lands in the month after next).
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [show, setShow] = useState<"all" | "bookings" | "requests">("all");

  const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  const jobs = useQuery(
    () =>
      bookingsApi.list({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 50,
      }),
    [from.getTime(), to.getTime()],
  );

  // Requests the provider is involved in. Not date-filtered by the API, so
  // they are narrowed to the month here.
  const requests = useQuery(() => serviceRequests.list({ limit: 50 }), []);

  const weeks = useMemo(
    () =>
      buildMonth(
        cursor,
        show === "requests" ? [] : (jobs.data?.items ?? []),
        show === "bookings" ? [] : (requests.data?.items ?? []),
      ),
    [cursor, jobs.data, requests.data, show],
  );

  const monthLabel = cursor.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const jobCount = jobs.data?.items.length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Your confirmed jobs and the requests you are waiting on, together."
        action={
          <Button asChild variant="outline" size="lg">
            <Link href="/provider/jobs">See jobs as a list</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft aria-hidden />
          </Button>
          <p className="font-heading min-w-40 text-center text-base font-medium">
            {monthLabel}
          </p>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </Button>
        </div>

        <Segmented
          label="What to show on the calendar"
          segments={[
            { label: "Everything", value: "all" as const },
            { label: "Jobs only", value: "bookings" as const },
            { label: "Requests only", value: "requests" as const },
          ]}
          value={show}
          onChange={setShow}
        />
      </div>

      {jobs.loading ? (
        <LoadingRows rows={5} />
      ) : jobs.error ? (
        <ErrorState error={jobs.error} onRetry={jobs.reload} />
      ) : (
        <>
          <div className="ring-foreground/10 overflow-hidden rounded-xl ring-1">
            {/* Weekday header. Hidden on a phone, where the grid stacks. */}
            <div className="border-border bg-secondary/50 hidden border-b sm:grid sm:grid-cols-7">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7">
              {weeks.flat().map((cell) => (
                <DayBox key={cell.date.toISOString()} cell={cell} />
              ))}
            </div>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-accent size-2.5 rounded-full" aria-hidden />
              Confirmed job
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="ring-muted-foreground/50 size-2.5 rounded-full ring-1"
                aria-hidden
              />
              Request awaiting a decision
            </span>
          </div>

          {jobCount === 0 && show !== "requests" ? (
            <EmptyState
              icon={CalendarDays}
              title={`Nothing booked in ${monthLabel}`}
              description="Quote for open requests and accepted ones appear here."
              action={
                <Button asChild variant="accent" size="lg">
                  <Link href="/provider/requests">Browse open requests</Link>
                </Button>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function DayBox({ cell }: { cell: DayCell }) {
  const today = isSameDay(cell.date, new Date());
  const items = cell.bookings.length + cell.requests.length;

  // On a phone the empty days of a month are noise, so they collapse away.
  if (!cell.inMonth && items === 0) {
    return <div className="border-border hidden border-b border-r sm:block sm:min-h-24" />;
  }

  return (
    <div
      className={cn(
        "border-border border-b p-1.5 sm:min-h-24 sm:border-r",
        !cell.inMonth && "bg-secondary/30",
        items === 0 && "hidden sm:block",
      )}
    >
      <p
        className={cn(
          "px-1 text-xs font-medium tabular-nums",
          today
            ? "text-accent-foreground bg-accent inline-block rounded-full px-1.5"
            : cell.inMonth
              ? "text-foreground"
              : "text-muted-foreground",
        )}
      >
        <span className="sm:hidden">
          {cell.date.toLocaleDateString("en-PH", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
        <span className="hidden sm:inline">{cell.date.getDate()}</span>
      </p>

      <ul className="mt-1 space-y-1">
        {cell.bookings.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/provider/jobs?booking=${booking.id}`}
              className="bg-accent text-accent-foreground block truncate rounded px-1.5 py-1 text-xs hover:opacity-90"
              title={`${formatTime(booking.scheduledStart)} · ${
                booking.service?.title ?? "Booking"
              } · ${money(booking.totalAmount, booking.currency)}`}
            >
              <span className="font-medium tabular-nums">
                {formatTime(booking.scheduledStart)}
              </span>{" "}
              {booking.service?.title ?? "Job"}
            </Link>
          </li>
        ))}

        {cell.requests.map((request) => (
          <li key={request.id}>
            <span
              className="ring-border text-muted-foreground block truncate rounded px-1.5 py-1 text-xs ring-1"
              title={`Request · ${request.title} · ${
                statusMeta.request(request.status).label
              }`}
            >
              {request.title}
            </span>
          </li>
        ))}
      </ul>

      {/* On a phone each day is a row, so the statuses are worth spelling out. */}
      {items > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
          {cell.bookings.map((booking) => (
            <StatusBadge
              key={`s-${booking.id}`}
              meta={statusMeta.booking(booking.status)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The month as weeks of seven, padded with the surrounding days so the grid is
 * rectangular. Weeks start on Monday, which is how a working week reads here.
 */
function buildMonth(
  cursor: Date,
  bookings: BookingSummary[],
  requests: RequestSummary[],
): DayCell[][] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const first = new Date(year, month, 1);
  // getDay() is Sunday-based; shift so Monday is 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);

  const byDay = new Map<string, { b: BookingSummary[]; r: RequestSummary[] }>();
  const bucket = (date: Date) => {
    const key = dayKey(date);
    if (!byDay.has(key)) byDay.set(key, { b: [], r: [] });
    return byDay.get(key)!;
  };

  for (const booking of bookings) {
    bucket(new Date(booking.scheduledStart)).b.push(booking);
  }
  for (const request of requests) {
    // Only requests with a date the provider could plan around.
    if (!request.preferredAt) continue;
    bucket(new Date(request.preferredAt)).r.push(request);
  }

  const weeks: DayCell[][] = [];
  const cell = new Date(start);

  // Six rows covers every month layout, including a 31-day month starting on
  // a Sunday.
  for (let week = 0; week < 6; week++) {
    const row: DayCell[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(cell);
      const found = byDay.get(dayKey(date));
      row.push({
        date,
        inMonth: date.getMonth() === month,
        bookings: (found?.b ?? []).sort(
          (a, b) =>
            new Date(a.scheduledStart).getTime() -
            new Date(b.scheduledStart).getTime(),
        ),
        requests: found?.r ?? [],
      });
      cell.setDate(cell.getDate() + 1);
    }
    weeks.push(row);
  }

  return weeks;
}

/** Local-date key, so a booking does not slide a day on a timezone boundary. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Exported for the overview, which highlights today's work. */
export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

