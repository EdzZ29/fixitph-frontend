"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ClipboardList,
  Coins,
  MapPin,
  MessageSquareQuote,
  X,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  quotes as quotesApi,
  serviceRequests,
  type PaymentMethod,
  type Quote,
  type RequestStatus,
  type RequestSummary,
} from "@/lib/api/client";
import {
  formatDate,
  formatDateTime,
  moneyRange,
  money,
  relativeTime,
  statusMeta,
  toDateTimeInputValue,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

const TABS: { label: string; status?: RequestStatus }[] = [
  { label: "Live", status: undefined },
  { label: "Open", status: "OPEN" },
  { label: "Quoted", status: "QUOTED" },
  { label: "Booked", status: "BOOKED" },
  { label: "Closed", status: "CLOSED" },
];

/**
 * A customer's posted jobs, and the quotes that came back for each.
 *
 * This is the step before a booking exists: accepting a quote is what creates
 * one, which is why the accept dialog asks for a date and a payment method —
 * the API needs both to build the booking in the same transaction.
 */
export function RequestsView() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const status = TABS[tab].status;

  const { data, loading, error, reload, refreshing } = useQuery(
    () => serviceRequests.list({ status, page, limit: 10 }),
    [status, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Requests & quotes"
        description="Jobs you have posted, and what providers have quoted for them."
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/#search">Post a job</Link>
          </Button>
        }
      />

      <Segmented
        label="Filter requests"
        segments={TABS.map((item, index) => ({ label: item.label, value: index }))}
        value={tab}
        onChange={(index) => {
          setTab(index);
          setPage(1);
        }}
      />

      {loading ? (
        <LoadingRows rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No requests here"
          description="Post a job and providers in your area can quote for it. You choose which quote to take."
          action={
            <Button asChild variant="accent" size="lg">
              <Link href="/#search">Post a job</Link>
            </Button>
          }
        />
      ) : (
        <div
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((request) => (
            <RequestRow key={request.id} request={request} onChanged={reload} />
          ))}
        </div>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="request" />
    </div>
  );
}

function RequestRow({
  request,
  onChanged,
}: {
  request: RequestSummary;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const quoteCount = request._count.quotes;
  const cancellable = !["BOOKED", "CLOSED", "CANCELLED", "EXPIRED"].includes(
    request.status,
  );

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {request.title}
            </h3>
            <StatusBadge meta={statusMeta.request(request.status)} />
            <StatusBadge meta={statusMeta.urgency(request.urgency)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {request.category.name} · posted {relativeTime(request.createdAt)}
            {request.provider ? (
              <> · sent directly to {request.provider.businessName}</>
            ) : null}
          </p>
        </div>
      </div>

      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Where</dt>
          <dd>{[request.barangay, request.city].filter(Boolean).join(", ")}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Budget</dt>
          <dd>{moneyRange(request.budgetMin, request.budgetMax)}</dd>
        </div>
        {request.preferredAt ? (
          <div>
            <dt className="sr-only">Preferred date</dt>
            <dd>Prefers {formatDate(request.preferredAt)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={quoteCount ? "accent" : "outline"}
          size="sm"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          disabled={!quoteCount}
        >
          <MessageSquareQuote aria-hidden />
          {quoteCount
            ? `${expanded ? "Hide" : "See"} ${quoteCount} quote${quoteCount === 1 ? "" : "s"}`
            : "No quotes yet"}
        </Button>

        {cancellable ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setCancelling(true)}
          >
            <X aria-hidden />
            Cancel request
          </Button>
        ) : null}
      </div>

      {expanded ? <QuoteList requestId={request.id} onChanged={onChanged} /> : null}

      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title="Cancel this request?"
        description="Providers who have quoted are told it is closed. You can post it again later."
        confirmLabel="Cancel request"
        destructive
        reason={{
          label: "Reason",
          placeholder: "Sorted it myself, found someone else, no longer needed.",
          optional: true,
        }}
        onConfirm={(reason) =>
          serviceRequests.updateStatus(request.id, "CANCELLED", reason || undefined)
        }
        onDone={onChanged}
      />
    </article>
  );
}

/**
 * The quotes on one request, loaded only when the row is expanded. The list
 * endpoint returns a count rather than the quotes themselves, so opening a
 * request is what fetches them.
 */
function QuoteList({
  requestId,
  onChanged,
}: {
  requestId: string;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useQuery(
    () => serviceRequests.byId(requestId),
    [requestId],
  );

  if (loading) return <LoadingRows rows={2} className="mt-3" />;
  if (error)
    return (
      <div className="mt-3">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  if (!data?.quotes.length) return null;

  // Cheapest first: on a like-for-like job that is the comparison people
  // actually make, and the rating is right there to weigh against it.
  const sorted = [...data.quotes].sort(
    (a, b) => Number(a.amount) - Number(b.amount),
  );

  return (
    <ul className="mt-3 space-y-2">
      {sorted.map((quote) => (
        <li key={quote.id}>
          <QuoteCard
            quote={quote}
            onChanged={() => {
              reload();
              onChanged();
            }}
          />
        </li>
      ))}
    </ul>
  );
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash on completion" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
];

function QuoteCard({
  quote,
  onChanged,
}: {
  quote: Quote;
  onChanged: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [scheduleProblem, setScheduleProblem] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [scheduledStart, setScheduledStart] = useState(() =>
    toDateTimeInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  // Read once on mount rather than on every render: the clock is not a pure
  // render input, and an expiry badge does not need to tick over in place.
  const [now] = useState(() => Date.now());

  const pending = quote.status === "PENDING";
  const expired = quote.validUntil
    ? new Date(quote.validUntil).getTime() < now
    : false;

  return (
    <div className="bg-secondary/40 rounded-lg px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {quote.provider?.businessName ?? "Provider"}
            {quote.provider && quote.provider.ratingCount > 0 ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {Number(quote.provider.ratingAvg).toFixed(1)}★ from{" "}
                {quote.provider.ratingCount}
              </span>
            ) : null}
          </p>
          {quote.notes ? (
            <p className="text-muted-foreground mt-1 text-sm">{quote.notes}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-heading text-base leading-none font-semibold tabular-nums">
            {money(quote.amount, quote.currency)}
          </p>
          <div className="mt-1 flex justify-end">
            <StatusBadge meta={statusMeta.quote(quote.status)} />
          </div>
        </div>
      </div>

      {quote.validUntil ? (
        <p
          className={cn(
            "mt-2 text-xs",
            expired ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {expired ? "Expired " : "Valid until "}
          {formatDate(quote.validUntil)}
        </p>
      ) : null}

      {pending && !expired ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="accent" size="sm" onClick={() => setAccepting(true)}>
            Accept and book
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRejecting(true)}>
            Decline
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={accepting}
        onOpenChange={setAccepting}
        title={`Book ${quote.provider?.businessName ?? "this provider"}?`}
        description={
          <>
            Accepting creates a booking for{" "}
            {money(quote.amount, quote.currency)} and declines the other quotes
            on this request. The provider still has to confirm the time.
          </>
        }
        confirmLabel="Accept and book"
        onConfirm={async () => {
          // datetime-local yields "" when cleared, and new Date("") is an
          // Invalid Date whose toISOString() throws. Checked here so the
          // reader gets a field message rather than "Invalid time value".
          const when = new Date(scheduledStart);
          if (!scheduledStart || Number.isNaN(when.getTime())) {
            setScheduleProblem("Pick a date and time for the visit.");
            throw new Error("Pick a date and time for the visit.");
          }
          if (when.getTime() < Date.now()) {
            setScheduleProblem("That time has already passed.");
            throw new Error("That time has already passed.");
          }
          setScheduleProblem(null);
          return quotesApi.accept(quote.id, {
            scheduledStart: when.toISOString(),
            paymentMethod: method,
          });
        }}
        onDone={onChanged}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`start-${quote.id}`}>When should they come?</Label>
            <Input
              id={`start-${quote.id}`}
              type="datetime-local"
              value={scheduledStart}
              min={toDateTimeInputValue(new Date())}
              onChange={(event) => {
                setScheduledStart(event.target.value);
                setScheduleProblem(null);
              }}
              aria-invalid={!!scheduleProblem || undefined}
              aria-describedby={`start-hint-${quote.id}`}
            />
            {scheduleProblem ? (
              <p
                id={`start-hint-${quote.id}`}
                className="text-destructive text-sm"
              >
                {scheduleProblem}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`method-${quote.id}`}>How will you pay?</Label>
            <Select
              id={`method-${quote.id}`}
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as PaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          You pay the provider directly. FixItPH does not handle the money.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Decline this quote?"
        description="The provider is told. Your request stays open for other quotes."
        confirmLabel="Decline quote"
        reason={{
          label: "Reason",
          placeholder: "Too expensive, wrong dates, went with someone else.",
          optional: true,
        }}
        onConfirm={(reason) => quotesApi.reject(quote.id, reason || undefined)}
        onDone={onChanged}
      />
    </div>
  );
}

/** Exported for the overview card, which shows the next booked date. */
export function nextDateLabel(request: RequestSummary): string {
  return request.preferredAt
    ? formatDateTime(request.preferredAt)
    : "No date set";
}
