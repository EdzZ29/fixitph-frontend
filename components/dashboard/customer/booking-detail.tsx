"use client";

import Link from "next/link";
import { ArrowLeft, Receipt, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookingCard } from "@/components/dashboard/booking-card";
import { MessageThread } from "@/components/messaging/message-thread";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings } from "@/lib/api/client";
import { formatDateTime, money, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * One booking in full: the card with its actions, the money, and the status
 * history.
 *
 * The history is the useful part of this page. A booking that says
 * "Cancelled by provider" tells you what happened; the history tells you when
 * it was accepted, when it changed, and what reason was given each time. It
 * is written by a database trigger rather than by the API, so it cannot be
 * edited after the fact.
 */
export function BookingDetail({ bookingId }: { bookingId: string }) {
  const { data, loading, error, reload } = useQuery(
    () => bookings.byId(bookingId),
    [bookingId],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Booking" />
        <LoadingRows rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <BackLink />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      <BackLink />

      <PageHeader
        title={data.service?.title ?? data.provider.businessName}
        description={
          <>
            Booked {formatDateTime(data.createdAt)} · reference{" "}
            <span className="font-mono text-xs">{data.id.slice(0, 8)}</span>
          </>
        }
      />

      <BookingCard booking={data} perspective="customer" onChanged={reload} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading flex items-center gap-2 text-base font-medium">
            <Receipt className="size-4" aria-hidden />
            Payment
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Agreed amount">
              <span className="tabular-nums">
                {money(data.totalAmount, data.currency)}
              </span>
            </Row>
            <Row label="Method">
              {data.paymentMethod.replace(/_/g, " ").toLowerCase()}
            </Row>
            <Row label="Status">
              <StatusBadge meta={statusMeta.payment(data.paymentStatus)} />
            </Row>
            {data.completedAt ? (
              <Row label="Completed">{formatDateTime(data.completedAt)}</Row>
            ) : null}
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">
            FixItPH does not take the payment. You settle directly with the
            provider by the method above.
          </p>
        </section>

        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading text-base font-medium">History</h2>
          {!data.statusHistory.length ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Nothing has changed since it was booked.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {data.statusHistory.map((entry, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span
                    aria-hidden
                    className="bg-accent mt-1.5 size-2 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {statusMeta.booking(entry.toStatus).label}
                      {entry.fromStatus ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          from {statusMeta.booking(entry.fromStatus).label}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.reason ? (
                      <p className="text-muted-foreground mt-0.5">
                        {entry.reason}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <MessageThread
        bookingId={data.id}
        counterpartyName={data.provider.businessName}
      />

      {data.review ? (
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading flex items-center gap-2 text-base font-medium">
            <Star className="size-4" aria-hidden />
            Your review
          </h2>
          <Separator className="my-3" />
          <p className="text-sm font-medium tabular-nums">
            {data.review.rating} out of 5
          </p>
          {data.review.comment ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {data.review.comment}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-xs">
            Posted {formatDateTime(data.review.createdAt)}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/dashboard/bookings">
        <ArrowLeft aria-hidden />
        All bookings
      </Link>
    </Button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
