"use client";

import { useState } from "react";
import { Gavel, HandCoins, ShieldCheck, Split } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { admin, type AdminDisputeRow } from "@/lib/api/client";
import {
  formatDateTime,
  money,
  personName,
  relativeTime,
  statusMeta,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

type Outcome =
  | "RESOLVED_REFUND"
  | "RESOLVED_PARTIAL_REFUND"
  | "RESOLVED_NO_ACTION";

/**
 * Booking disputes.
 *
 * FixItPH does not hold the money — customers pay providers directly — so
 * "refund" here is a ruling, not a transfer. The figure recorded is what the
 * provider is being told to return, and both parties are notified of the
 * decision and the reasoning. That is why the resolution text is mandatory
 * and long: it is the only record either side gets of why they lost.
 */
const OUTCOMES: {
  value: Outcome;
  label: string;
  description: string;
  icon: typeof Gavel;
  needsAmount: boolean;
}[] = [
  {
    value: "RESOLVED_REFUND",
    label: "Full refund",
    description: "The customer is owed the whole amount back.",
    icon: HandCoins,
    needsAmount: false,
  },
  {
    value: "RESOLVED_PARTIAL_REFUND",
    label: "Partial refund",
    description: "Some of the work stands; name the figure to return.",
    icon: Split,
    needsAmount: true,
  },
  {
    value: "RESOLVED_NO_ACTION",
    label: "No action",
    description: "The complaint is not upheld. Nothing is returned.",
    icon: ShieldCheck,
    needsAmount: false,
  },
];

const FILTERS: { label: string; value: "open" | "" }[] = [
  { label: "Needs a decision", value: "open" },
  { label: "All", value: "" },
];

export function AdminDisputesView() {
  const [filter, setFilter] = useState<"open" | "">("open");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      admin.disputes({
        ...(filter === "open" ? { openOnly: true } : {}),
        page,
        limit: 10,
      }),
    [filter, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disputes"
        description="Bookings where the two sides disagree. Oldest unresolved first."
      />

      <Segmented
        label="Filter disputes"
        segments={FILTERS}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Gavel}
          title={filter === "open" ? "Nothing to decide" : "No disputes"}
          description={
            filter === "open"
              ? "Every dispute has been ruled on."
              : "No dispute has ever been raised."
          }
        />
      ) : (
        <ul
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((dispute) => (
            <li key={dispute.id}>
              <DisputeCard dispute={dispute} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="dispute" />
    </div>
  );
}

function DisputeCard({
  dispute,
  onChanged,
}: {
  dispute: AdminDisputeRow;
  onChanged: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  const resolved = dispute.resolvedAt !== null;
  const chosen = OUTCOMES.find((option) => option.value === outcome);
  const raisedByProvider = dispute.raisedBy.role === "PROVIDER";

  const amountValue = Number(refundAmount);
  const amountValid =
    !chosen?.needsAmount ||
    (!!refundAmount &&
      Number.isFinite(amountValue) &&
      amountValue > 0 &&
      amountValue <= Number(dispute.booking.totalAmount));

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {dispute.reason}
            </h3>
            <StatusBadge meta={statusMeta.dispute(dispute.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {dispute.booking.service?.title ?? "Booking"} with{" "}
            {dispute.booking.provider.businessName}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Raised by the{" "}
            {raisedByProvider ? "provider" : "customer"} (
            {personName(dispute.raisedBy.profile, dispute.raisedBy.email)}){" "}
            {relativeTime(dispute.createdAt)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-heading text-lg leading-none font-semibold tabular-nums">
            {money(dispute.booking.totalAmount, dispute.booking.currency)}
          </p>
          <div className="mt-1.5 flex justify-end">
            <StatusBadge meta={statusMeta.booking(dispute.booking.status)} />
          </div>
        </div>
      </div>

      <p className="bg-secondary/40 mt-3 rounded-lg px-3.5 py-2.5 text-sm">
        {dispute.details}
      </p>

      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div>
          <dt className="sr-only">Scheduled</dt>
          <dd>Scheduled {formatDateTime(dispute.booking.scheduledStart)}</dd>
        </div>
        {dispute.booking.completedAt ? (
          <div>
            <dt className="sr-only">Completed</dt>
            <dd>Completed {formatDateTime(dispute.booking.completedAt)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="sr-only">Reference</dt>
          <dd className="font-mono">{dispute.booking.id.slice(0, 8)}</dd>
        </div>
      </dl>

      {resolved ? (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-sm font-medium">
            {statusMeta.dispute(dispute.status).label}
            {dispute.refundAmount ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                · {money(dispute.refundAmount, dispute.booking.currency)} to
                return
              </span>
            ) : null}
          </p>
          {dispute.resolution ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {dispute.resolution}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs">
            Ruled {formatDateTime(dispute.resolvedAt)}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {OUTCOMES.map((option) => (
            <Button
              key={option.value}
              variant={option.value === "RESOLVED_NO_ACTION" ? "outline" : "accent"}
              size="sm"
              onClick={() => {
                setRefundAmount(
                  option.needsAmount ? "" : dispute.booking.totalAmount,
                );
                setOutcome(option.value);
              }}
            >
              <option.icon aria-hidden />
              {option.label}
            </Button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={outcome !== null}
        onOpenChange={(open) => setOutcome(open ? outcome : null)}
        title={chosen ? `Rule: ${chosen.label.toLowerCase()}` : "Resolve dispute"}
        description={
          <>
            Both sides are told the outcome and your reasoning. FixItPH does not
            hold the payment, so this is a ruling the provider is expected to
            honour, not a transfer.
          </>
        }
        confirmLabel="Record decision"
        reason={{
          label: "Your reasoning",
          placeholder:
            "What each side claimed, what the evidence shows, and why you decided this way.",
          minLength: 10,
        }}
        onConfirm={(resolution) =>
          admin.resolveDispute(dispute.id, {
            status: outcome!,
            resolution,
            ...(outcome === "RESOLVED_PARTIAL_REFUND"
              ? { refundAmount: amountValue }
              : outcome === "RESOLVED_REFUND"
                ? { refundAmount: Number(dispute.booking.totalAmount) }
                : {}),
          })
        }
        onDone={onChanged}
      >
        {chosen?.needsAmount ? (
          <div className="space-y-1.5">
            <Label htmlFor={`refund-${dispute.id}`}>How much to return?</Label>
            <Input
              id={`refund-${dispute.id}`}
              type="number"
              min={0.01}
              max={Number(dispute.booking.totalAmount)}
              step="0.01"
              inputMode="decimal"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              aria-invalid={(!!refundAmount && !amountValid) || undefined}
              aria-describedby={`refund-hint-${dispute.id}`}
              autoFocus
            />
            <p
              id={`refund-hint-${dispute.id}`}
              className={
                refundAmount && !amountValid
                  ? "text-destructive text-sm"
                  : "text-muted-foreground text-sm"
              }
            >
              {refundAmount && !amountValid
                ? `Between ₱0.01 and ${money(dispute.booking.totalAmount)}.`
                : `The job was ${money(
                    dispute.booking.totalAmount,
                    dispute.booking.currency,
                  )}.`}
            </p>
          </div>
        ) : chosen ? (
          <p className="bg-secondary/40 rounded-lg px-3.5 py-2.5 text-sm">
            {chosen.description}
            {outcome === "RESOLVED_REFUND" ? (
              <>
                {" "}
                Recorded as{" "}
                {money(dispute.booking.totalAmount, dispute.booking.currency)}.
              </>
            ) : null}
          </p>
        ) : null}
      </ConfirmDialog>
    </article>
  );
}
