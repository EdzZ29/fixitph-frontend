"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingCard, type Perspective } from "@/components/dashboard/booking-card";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings, type BookingStatus } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";
import { cn } from "cn";

/**
 * The booking list, shared by the customer's "Bookings" and the provider's
 * "Jobs". The same endpoint serves both — /bookings scopes itself to whoever
 * the token belongs to — so the only difference is which filters are useful
 * and which actions each side is allowed.
 */

interface Filter {
  label: string;
  status?: BookingStatus;
  /** Several statuses under one tab, filtered client-side after fetching. */
  group?: BookingStatus[];
}

const CUSTOMER_FILTERS: Filter[] = [
  { label: "Upcoming", group: ["PENDING_CONFIRMATION", "CONFIRMED", "IN_PROGRESS"] },
  { label: "Awaiting the provider", status: "PENDING_CONFIRMATION" },
  { label: "Completed", status: "COMPLETED" },
  { label: "Disputed", status: "DISPUTED" },
  { label: "All", group: undefined },
];

const PROVIDER_FILTERS: Filter[] = [
  { label: "Needs a decision", status: "PENDING_CONFIRMATION" },
  { label: "Scheduled", status: "CONFIRMED" },
  { label: "In progress", status: "IN_PROGRESS" },
  { label: "Completed", status: "COMPLETED" },
  { label: "All", group: undefined },
];

export function BookingsView({
  perspective,
  title,
  description,
}: {
  perspective: Perspective;
  title: string;
  description: string;
}) {
  const filters =
    perspective === "provider" ? PROVIDER_FILTERS : CUSTOMER_FILTERS;

  const [active, setActive] = useState(0);
  const [page, setPage] = useState(1);

  const filter = filters[active];

  const { data, loading, error, reload, refreshing } = useQuery(
    () => bookings.list({ status: filter.status, page, limit: 20 }),
    [filter.status, page],
  );

  /**
   * A grouped tab ("Upcoming") cannot be a `status` query, because the API
   * takes one status at a time. Rather than three requests it fetches the
   * unfiltered page and narrows it here — which means a grouped tab shows
   * "the upcoming ones on this page", and the count under the list stays
   * honest about that by counting the whole result.
   */
  const rows = filter.group
    ? (data?.items ?? []).filter((booking) =>
        filter.group!.includes(booking.status),
      )
    : (data?.items ?? []);

  function choose(index: number) {
    setActive(index);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      <Segmented
        label="Filter bookings"
        segments={filters.map((item, index) => ({
          label: item.label,
          value: index,
        }))}
        value={active}
        onChange={choose}
      />

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !rows.length ? (
        <EmptyState
          icon={CalendarCheck}
          title={
            // A grouped tab narrows the fetched page rather than the query,
            // so "nothing here" can mean "none on this page". Said plainly
            // rather than claiming there are none at all.
            filter.group && (data?.total ?? 0) > 0
              ? `Nothing ${filter.label.toLowerCase()} on this page`
              : filter.status || filter.group
                ? `Nothing ${filter.label.toLowerCase()}`
                : "No bookings yet"
          }
          description={
            filter.group && (data?.total ?? 0) > 0
              ? "Try another page, or the All tab."
              : perspective === "customer"
                ? "Bookings appear here once you accept a quote from a provider."
                : "Jobs appear here once a customer accepts one of your quotes."
          }
          action={
            perspective === "customer" ? (
              <Button asChild variant="accent" size="lg">
                <Link href="/#search">Find a provider</Link>
              </Button>
            ) : (
              <Button asChild variant="accent" size="lg">
                <Link href="/provider/requests">Browse open requests</Link>
              </Button>
            )
          }
        />
      ) : (
        <div
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {rows.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              perspective={perspective}
              onChanged={reload}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        result={data}
        onPageChange={setPage}
        unit="booking"
      />
    </div>
  );
}
