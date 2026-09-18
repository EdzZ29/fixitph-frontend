"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { cn } from "cn";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  bookings,
  type BookingStatus,
  type BookingSummary,
} from "@/lib/api/client";
import { formatDateTime, money, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Booking monitoring.
 *
 * Read-only, and that is a decision rather than an omission. The API's
 * transition table lets an admin move a booking, but a booking is an
 * agreement between two people: an administrator reaching in to mark someone's
 * job complete would be forging a party's action. Where an admin genuinely
 * needs to change an outcome there is a dispute, which is recorded as a
 * ruling with reasoning attached. This screen exists to find the booking a
 * report or dispute is about.
 */
const STATUSES: { label: string; value: BookingStatus | "" }[] = [
  { label: "Any status", value: "" },
  { label: "Awaiting confirmation", value: "PENDING_CONFIRMATION" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Disputed", value: "DISPUTED" },
  { label: "Cancelled by customer", value: "CANCELLED_BY_CUSTOMER" },
  { label: "Cancelled by provider", value: "CANCELLED_BY_PROVIDER" },
  { label: "Customer no-show", value: "NO_SHOW_CUSTOMER" },
  { label: "Provider no-show", value: "NO_SHOW_PROVIDER" },
];

export function AdminBookingsView({
  initialStatus = "",
}: {
  initialStatus?: BookingStatus | "";
}) {
  const [status, setStatus] = useState<BookingStatus | "">(initialStatus);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      bookings.list({
        status: status || undefined,
        // The API takes ISO instants; a date input gives a plain date, which
        // is read as midnight UTC. Close enough for a day-granularity filter.
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        page,
        limit: 20,
      }),
    [status, from, to, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bookings"
        description="Every booking on the platform. Read-only: changes belong to the two parties, or to a dispute ruling."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="booking-status">Status</Label>
          <Select
            id="booking-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as BookingStatus | "");
              setPage(1);
            }}
          >
            {STATUSES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-from">Scheduled from</Label>
          <Input
            id="booking-from"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="booking-to">Scheduled to</Label>
          <Input
            id="booking-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings matched"
          description="Try widening the status or the dates."
        />
      ) : (
        <ul
          className={cn("space-y-2", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((booking) => (
            <li key={booking.id}>
              <AdminBookingRow booking={booking} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="booking" />
    </div>
  );
}

function AdminBookingRow({ booking }: { booking: BookingSummary }) {
  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-3.5 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">
              {booking.service?.title ??
                booking.serviceRequest?.title ??
                "Direct booking"}
            </h3>
            <StatusBadge meta={statusMeta.booking(booking.status)} />
          </div>

          <p className="text-muted-foreground mt-0.5 text-sm">
            <Link
              href={`/admin/listings?providerId=${booking.provider.id}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {booking.provider.businessName}
            </Link>
            {booking.serviceRequest ? <> · {booking.serviceRequest.city}</> : null}
          </p>

          <p className="text-muted-foreground mt-0.5 text-xs">
            Scheduled {formatDateTime(booking.scheduledStart)} · booked{" "}
            {relativeTime(booking.createdAt)} ·{" "}
            <span className="font-mono">{booking.id.slice(0, 8)}</span>
          </p>

          {booking.cancellationReason ? (
            <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
              Reason: {booking.cancellationReason}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-medium tabular-nums">
            {money(booking.totalAmount, booking.currency)}
          </p>
          <div className="mt-1 flex justify-end">
            <StatusBadge meta={statusMeta.payment(booking.paymentStatus)} />
          </div>
        </div>
      </div>
    </article>
  );
}
