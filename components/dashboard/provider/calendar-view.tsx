"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessagesSquare,
  Wallet,
} from "lucide-react";
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
import { formatTime, formatDuration, money, statusMeta } from "@/lib/format";
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

  /**
   * Which day the panel below is describing, as a yyyy-mm-dd key.
   *
   * A key rather than a Date because a Date compares by identity, so
   * re-deriving the same day from the grid would never match the selection.
   */
  const [selected, setSelected] = useState<string | null>(null);

  const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const to = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

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

  const cells = weeks.flat();

  /**
   * Today, when this month contains it; otherwise the first day with anything
   * on it. Derived rather than stored so that paging to another month moves
   * the panel with it instead of leaving it on a day nobody can see.
   */
  const fallback =
    cells.find((cell) => cell.inMonth && isSameDay(cell.date, new Date())) ??
    cells.find(
      (cell) => cell.inMonth && cell.bookings.length + cell.requests.length > 0,
    );

  const active =
    cells.find((cell) => dayKey(cell.date) === selected) ?? fallback ?? null;

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
              {cells.map((cell) => (
                <DayBox
                  key={cell.date.toISOString()}
                  cell={cell}
                  selected={!!active && isSameDay(cell.date, active.date)}
                  onSelect={() => setSelected(dayKey(cell.date))}
                />
              ))}
            </div>
          </div>

          {active ? <DayDetail cell={active} /> : null}

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

function DayBox({
  cell,
  selected,
  onSelect,
}: {
  cell: DayCell;
  selected: boolean;
  onSelect: () => void;
}) {
  const today = isSameDay(cell.date, new Date());
  const items = cell.bookings.length + cell.requests.length;

  // On a phone the empty days of a month are noise, so they collapse away.
  if (!cell.inMonth && items === 0) {
    return (
      <div className="border-border hidden border-b border-r sm:block sm:min-h-24" />
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${cell.date.toLocaleDateString("en-PH", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}: ${describeDay(cell)}`}
      className={cn(
        "border-border focus-visible:ring-ring/50 block w-full border-b p-1.5 text-left focus-visible:ring-2 focus-visible:outline-none sm:min-h-24 sm:border-r",
        !cell.inMonth && "bg-secondary/30",
        items === 0 && "hidden sm:block",
        selected && "ring-accent bg-accent/5 ring-2 ring-inset",
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

      {/*
        Summaries only. The day is a button, so nothing inside it may be a
        link — a link inside a button is invalid markup and, more to the
        point, the two would fight over the same click. Opening a job happens
        in the panel below.
      */}
      <ul className="mt-1 space-y-1">
        {cell.bookings.map((booking) => (
          <li
            key={booking.id}
            className="bg-accent text-accent-foreground truncate rounded px-1.5 py-1 text-xs"
          >
            <span className="font-medium tabular-nums">
              {formatTime(booking.scheduledStart)}
            </span>{" "}
            {booking.service?.title ?? "Job"}
          </li>
        ))}

        {cell.requests.map((request) => (
          <li
            key={request.id}
            className="ring-border text-muted-foreground truncate rounded px-1.5 py-1 text-xs ring-1"
          >
            {request.title}
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
    </button>
  );
}

/** One line for a screen reader, so a day is not just a number. */
function describeDay(cell: DayCell): string {
  const parts: string[] = [];
  if (cell.bookings.length) {
    parts.push(
      `${cell.bookings.length} job${cell.bookings.length === 1 ? "" : "s"}`,
    );
  }
  if (cell.requests.length) {
    parts.push(
      `${cell.requests.length} request${cell.requests.length === 1 ? "" : "s"}`,
    );
  }
  return parts.length ? parts.join(", ") : "nothing booked";
}

/**
 * What is actually happening on the selected day.
 *
 * The grid can only carry a time and a truncated title — a month of them has
 * to fit on a screen. This is where a booked day says what the job is: when
 * it starts and how long it runs, where it is, what was agreed, what state it
 * is in, and the way through to the customer and the thread.
 */
function DayDetail({ cell }: { cell: DayCell }) {
  const heading = cell.date.toLocaleDateString("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const empty = cell.bookings.length + cell.requests.length === 0;

  return (
    <section
      aria-live="polite"
      className="ring-foreground/10 rounded-xl px-4 py-4 ring-1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-heading text-base font-medium">{heading}</h2>
        <p className="text-muted-foreground text-sm">{describeDay(cell)}</p>
      </div>

      {empty ? (
        <p className="text-muted-foreground mt-3 text-sm">
          Nothing on this day. It is free to take work.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {cell.bookings.map((booking) => (
            <li
              key={booking.id}
              className="border-border rounded-lg border px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {booking.service?.title ??
                      booking.serviceRequest?.title ??
                      "Booking"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="size-3.5 shrink-0" aria-hidden />
                      {formatTime(booking.scheduledStart)}
                      {booking.scheduledEnd
                        ? ` – ${formatTime(booking.scheduledEnd)}`
                        : ""}
                      {durationOf(booking) ? ` · ${durationOf(booking)}` : ""}
                    </span>
                    {booking.serviceRequest ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        {[
                          booking.serviceRequest.barangay,
                          booking.serviceRequest.city,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 tabular-nums">
                      <Wallet className="size-3.5 shrink-0" aria-hidden />
                      {money(booking.totalAmount, booking.currency)}
                    </span>
                  </p>
                </div>
                <StatusBadge meta={statusMeta.booking(booking.status)} />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/provider/jobs/${booking.id}`}>
                    <MessagesSquare aria-hidden />
                    Details and messages
                  </Link>
                </Button>
              </div>
            </li>
          ))}

          {cell.requests.map((request) => (
            <li
              key={request.id}
              className="border-border rounded-lg border border-dashed px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{request.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Not booked. This is a request you have quoted for, on its
                    preferred date.
                  </p>
                </div>
                <StatusBadge meta={statusMeta.request(request.status)} />
              </div>

              <div className="mt-2.5">
                <Button asChild size="sm" variant="outline">
                  <Link href="/provider/requests">See the request</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** How long the job is scheduled to run, when both ends are known. */
function durationOf(booking: BookingSummary): string | null {
  if (!booking.scheduledEnd) return null;
  const minutes = Math.round(
    (new Date(booking.scheduledEnd).getTime() -
      new Date(booking.scheduledStart).getTime()) /
      60000,
  );
  return minutes > 0 ? formatDuration(minutes) : null;
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
