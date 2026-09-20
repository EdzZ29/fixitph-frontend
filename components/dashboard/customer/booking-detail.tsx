"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Phone,
  Receipt,
  Star,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BookingCard } from "@/components/dashboard/booking-card";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { MessageThread } from "@/components/messaging/message-thread";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { bookings, type BookingDetail as BookingDetailData, type PaymentMethod } from "@/lib/api/client";
import {
  acceptedPaymentMethods,
  formatDateTime,
  money,
  PAYMENT_METHOD_LABEL,
  statusMeta,
} from "@/lib/format";
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
/**
 * One booking, from either side of it.
 *
 * The same screen serves both because it is the same booking: the money, the
 * history and the thread do not change depending on who is reading. What does
 * change is who the other party is, and that is the whole reason a provider
 * needs this page — before it existed their only route into a job was a list
 * with no thread on it, so a provider could be messaged and had nowhere to
 * reply.
 *
 * The customer's contact details are not decided here. The API releases them
 * on its own terms — address withheld until the booking is confirmed — and
 * this only renders what it was given.
 */
export function BookingDetail({
  bookingId,
  perspective = "customer",
}: {
  bookingId: string;
  perspective?: "customer" | "provider";
}) {
  const isProvider = perspective === "provider";
  const { data, loading, error, reload } = useQuery(
    () => bookings.byId(bookingId),
    [bookingId],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title={isProvider ? "Job" : "Booking"} />
        <LoadingRows rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <BackLink isProvider={isProvider} />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  const customerName = data.customerContact?.name?.trim() || "the customer";

  return (
    <div className="space-y-5">
      <BackLink isProvider={isProvider} />

      <PageHeader
        title={
          data.service?.title ??
          (isProvider ? customerName : data.provider.businessName)
        }
        description={
          <>
            Booked {formatDateTime(data.createdAt)} · reference{" "}
            <span className="font-mono text-xs">{data.id.slice(0, 8)}</span>
          </>
        }
      />

      <BookingCard
        booking={data}
        perspective={perspective}
        onChanged={reload}
      />

      {/*
        Who the job is for. Only the provider sees this, and only because the
        API decided to send it — the address stays withheld until the booking
        is confirmed, which is what `released` reports.
      */}
      {isProvider && data.customerContact ? (
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading flex items-center gap-2 text-base font-medium">
            <User className="size-4" aria-hidden />
            Customer
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Name">{data.customerContact.name ?? "—"}</Row>
            <Row label="Area">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {[data.customerContact.barangay, data.customerContact.city]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </span>
            </Row>
            {data.customerContact.released ? (
              <>
                <Row label="Phone">
                  {data.customerContact.phone ? (
                    <a
                      href={`tel:${data.customerContact.phone}`}
                      className="flex items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                      <Phone className="size-3.5 shrink-0" aria-hidden />
                      {data.customerContact.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Address">
                  {data.customerContact.addressLine1 ?? "—"}
                </Row>
              </>
            ) : null}
          </dl>
          {!data.customerContact.released ? (
            <p className="text-muted-foreground mt-3 text-xs">
              The exact address and phone number are shared once the booking is
              confirmed. Until then, use the messages below.
            </p>
          ) : null}
        </section>
      ) : null}

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
            {data.paidAt ? (
              <>
                <Row label="Settled by">
                  {PAYMENT_METHOD_LABEL[data.paidMethod ?? data.paymentMethod]}
                </Row>
                <Row label="Confirmed">{formatDateTime(data.paidAt)}</Row>
              </>
            ) : null}
            {data.completedAt ? (
              <Row label="Completed">{formatDateTime(data.completedAt)}</Row>
            ) : null}
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">
            FixItPH does not take the payment.{" "}
            {isProvider
              ? "The customer settles with you directly by the method above."
              : "You settle directly with the provider by the method above."}
          </p>

          <MarkPaidControl
            booking={data}
            isProvider={isProvider}
            onDone={reload}
          />
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
        counterpartyName={
          isProvider ? customerName : data.provider.businessName
        }
      />

      {data.review ? (
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading flex items-center gap-2 text-base font-medium">
            <Star className="size-4" aria-hidden />
            {/* The same row, read from opposite ends: the customer wrote it,
                the provider received it. */}
            {isProvider ? `Review from ${customerName}` : "Your review"}
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

function BackLink({ isProvider = false }: { isProvider?: boolean }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href={isProvider ? "/provider/jobs" : "/dashboard/bookings"}>
        <ArrowLeft aria-hidden />
        {isProvider ? "All jobs" : "All bookings"}
      </Link>
    </Button>
  );
}

/**
 * The provider's confirmation that the money arrived.
 *
 * Shown to nobody else, because nobody else can know. FixItPH never handles
 * the payment, so the platform cannot observe it and the customer cannot
 * prove it — the only party whose word means anything here is the one who
 * would be out of pocket if it were wrong. The server enforces the same rule;
 * this is only the door.
 *
 * Behind a confirm dialog because it cannot be taken back: a payment recorded
 * in error has to go through a dispute, which is deliberate — a button that
 * could quietly un-mark a payment would make the record worth no more than
 * whoever pressed it last.
 */
function MarkPaidControl({
  booking,
  isProvider,
  onDone,
}: {
  booking: BookingDetailData;
  isProvider: boolean;
  onDone: () => void;
}) {
  const settleable =
    booking.status === "CONFIRMED" ||
    booking.status === "IN_PROGRESS" ||
    booking.status === "COMPLETED";

  const methods = acceptedPaymentMethods(booking.provider.paymentMethods);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(
    () => booking.paymentMethod,
  );

  if (!isProvider || !settleable || booking.paymentStatus === "PAID") {
    return null;
  }

  return (
    <>
      <Button
        variant="accent"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        <BadgeCheck aria-hidden />
        Mark as paid
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirm you received the payment"
        description="This is your record that the money arrived. It cannot be undone here — correcting it afterwards means raising a dispute."
        confirmLabel="Yes, I received it"
        onConfirm={() => bookings.markPaid(booking.id, { method })}
        onDone={onDone}
      >
        <div className="space-y-1.5">
          <Label htmlFor="paid-method">How was it actually paid?</Label>
          <Select
            id="paid-method"
            value={method}
            onChange={(event) =>
              setMethod(event.target.value as PaymentMethod)
            }
          >
            {methods.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_METHOD_LABEL[option]}
              </option>
            ))}
          </Select>
          <p className="text-muted-foreground text-xs">
            Agreed as {PAYMENT_METHOD_LABEL[booking.paymentMethod]}. Change it
            here if they settled another way.
          </p>
        </div>
      </ConfirmDialog>
    </>
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
