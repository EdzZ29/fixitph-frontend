"use client";

import { useState } from "react";
import Image from "next/image";
import { Receipt, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  commissions as commissionsApi,
  type CommissionRow,
  type CommissionStatus,
  type PaymentMethod,
  type RemittanceDestination,
} from "@/lib/api/client";
import {
  COMMISSION_DISCLOSURE,
  formatDate,
  formatDateTime,
  money,
  PAYMENT_METHOD_LABEL,
  ratePercent,
  statusMeta,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

const TABS: { label: string; status?: CommissionStatus }[] = [
  { label: "All", status: undefined },
  { label: "Due", status: "DUE" },
  { label: "Overdue", status: "OVERDUE" },
  { label: "Awaiting check", status: "PAYMENT_SUBMITTED" },
  { label: "Paid", status: "PAID" },
];

/**
 * How a provider can remit.
 *
 * Not the same list as the methods they accept from customers: these are
 * FixItPH's own receiving accounts. The order is the order of usefulness —
 * the QR methods first, cash last, because cash means arranging to meet.
 */
const REMIT_METHODS: PaymentMethod[] = [
  "GCASH",
  "MARIBANK",
  "GOTYME_BANK",
  "MAYA",
  "BANK_TRANSFER",
  "CASH",
];

/**
 * What the provider owes FixItPH.
 *
 * Kept firmly apart from the customer's payment, which the platform never
 * touches: the disclosure at the top of the page is the whole reason this
 * screen reads the way it does. A provider who confuses the two ends up
 * thinking FixItPH is holding their money.
 */
export function CommissionView() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const status = TABS[tab].status;

  const summary = useQuery(() => commissionsApi.summary(), []);
  const history = useQuery(
    () => commissionsApi.list({ status, page, limit: 10 }),
    [status, page],
  );
  // Where to send it. Rarely changes, so it does not need to follow the feed.
  const remittance = useQuery(() => commissionsApi.remittance(), [], {
    live: false,
  });
  const destinations = remittance.data?.destinations ?? {};

  return (
    <div className="space-y-5">
      <PageHeader
        title="FixItPH commission"
        description="What you owe the platform on bookings it brought you."
      />

      <p className="ring-foreground/10 text-muted-foreground rounded-xl px-4 py-3 text-sm ring-1">
        {COMMISSION_DISCLOSURE}
      </p>

      {summary.error ? (
        <ErrorState error={summary.error} onRetry={summary.reload} />
      ) : (
        <StatGrid>
          <StatCard
            label="Total commission"
            value={money(summary.data?.totalCommission)}
            hint="All time"
            loading={summary.loading}
          />
          <StatCard
            label="Paid"
            value={money(summary.data?.paid)}
            hint="Verified by FixItPH"
            loading={summary.loading}
          />
          <StatCard
            label="Amount due"
            value={money(summary.data?.amountDue)}
            hint={
              Number(summary.data?.awaitingVerification ?? 0) > 0
                ? `${money(summary.data?.awaitingVerification)} awaiting check`
                : "Outstanding now"
            }
            tone={Number(summary.data?.amountDue ?? 0) > 0 ? "warning" : "neutral"}
            loading={summary.loading}
          />
          <StatCard
            label="Overdue"
            value={money(summary.data?.overdue)}
            hint="Past its due date"
            tone={Number(summary.data?.overdue ?? 0) > 0 ? "critical" : "neutral"}
            loading={summary.loading}
          />
        </StatGrid>
      )}

      {Number(summary.data?.disputed ?? 0) > 0 ? (
        <p className="ring-foreground/10 text-muted-foreground rounded-xl px-4 py-3 text-sm ring-1">
          {money(summary.data?.disputed)} is on hold while a customer dispute is
          resolved. Nothing is collected on a disputed booking.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Commission history</h2>

        <Segmented
          label="Filter commissions"
          segments={TABS.map((item, index) => ({
            label: item.label,
            value: index,
          }))}
          value={tab}
          onChange={(index) => {
            setTab(index);
            setPage(1);
          }}
        />

        {history.loading ? (
          <LoadingRows rows={3} />
        ) : history.error ? (
          <ErrorState error={history.error} onRetry={history.reload} />
        ) : !history.data?.items.length ? (
          <EmptyState
            icon={Receipt}
            title="Nothing here"
            description="A commission is raised once a customer confirms a job you completed."
          />
        ) : (
          <div className="space-y-3">
            {history.data.items.map((row) => (
              <CommissionCard
                key={row.id}
                row={row}
                destinations={destinations}
                onChanged={() => {
                  history.reload();
                  summary.reload();
                }}
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          result={history.data}
          onPageChange={setPage}
          unit="commission"
        />
      </section>
    </div>
  );
}

/**
 * Where to send it, for whichever method is selected.
 *
 * The QR is the useful part: there is no payment gateway here, so the whole
 * transaction happens in the provider's banking app and the only thing this
 * screen can usefully do is show them what to scan. Cash has no QR — it has a
 * number to ring, because there is no office to walk into.
 */
function RemittanceDetails({
  method,
  destination,
}: {
  method: PaymentMethod;
  destination: RemittanceDestination | undefined;
}) {
  if (!destination) {
    return (
      <p className="text-muted-foreground text-xs">
        Contact FixItPH support for where to send a {PAYMENT_METHOD_LABEL[method]}{" "}
        payment.
      </p>
    );
  }

  return (
    <div className="ring-foreground/10 rounded-xl px-3 py-3 ring-1">
      <p className="text-muted-foreground text-xs">
        Send {PAYMENT_METHOD_LABEL[method]} to
      </p>

      {destination.qr ? (
        <div className="mt-2 flex items-start gap-3">
          {/*
            Fixed, generous and on white: a QR on a dark panel will not scan,
            and one shrunk to fit a dialog will not either.
          */}
          <Image
            src={destination.qr}
            alt={`${PAYMENT_METHOD_LABEL[method]} QR code`}
            width={144}
            height={144}
            className="size-36 shrink-0 rounded-lg bg-white p-1.5"
            unoptimized
          />
          <div className="min-w-0 text-sm">
            {destination.accountName ? (
              <p className="font-medium">{destination.accountName}</p>
            ) : null}
            {destination.reference ? (
              <p className="text-muted-foreground">{destination.reference}</p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-xs">
              Scan with your banking app, then put the reference number below.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm">
          {destination.contact ? (
            <p className="font-medium tabular-nums">{destination.contact}</p>
          ) : null}
          {destination.accountName ? (
            <p className="text-muted-foreground">{destination.accountName}</p>
          ) : null}
          {destination.note ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {destination.note}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CommissionCard({
  row,
  destinations,
  onChanged,
}: {
  row: CommissionRow;
  destinations: Partial<Record<PaymentMethod, RemittanceDestination>>;
  onChanged: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const payable = row.status === "DUE" || row.status === "OVERDUE";
  const title =
    row.booking?.service?.title ??
    row.booking?.serviceRequest?.title ??
    "Completed booking";

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {title}
            </h3>
            <StatusBadge meta={statusMeta.commission(row.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {money(row.finalAmount, row.currency)} job ·{" "}
            {ratePercent(row.commissionRate)} commission
            {row.booking?.completedAt ? (
              <> · completed {formatDate(row.booking.completedAt)}</>
            ) : null}
          </p>
        </div>
        <p className="font-heading shrink-0 text-lg font-semibold tabular-nums">
          {money(row.commissionAmount, row.currency)}
        </p>
      </div>

      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div>
          <dt className="sr-only">Due</dt>
          <dd>
            {row.status === "PAID"
              ? `Paid ${formatDate(row.paidAt)}`
              : `Due ${formatDate(row.dueDate)}`}
          </dd>
        </div>
        {row.submittedAt && row.status === "PAYMENT_SUBMITTED" ? (
          <div>
            <dt className="sr-only">Submitted</dt>
            <dd>
              Sent {formatDateTime(row.submittedAt)} ·{" "}
              {row.paymentMethod
                ? PAYMENT_METHOD_LABEL[row.paymentMethod]
                : "—"}{" "}
              {row.paymentReference}
            </dd>
          </div>
        ) : null}
      </dl>

      {row.note ? (
        <p className="text-muted-foreground mt-2 text-sm">{row.note}</p>
      ) : null}

      {payable ? (
        <>
          <Button
            variant="accent"
            size="sm"
            className="mt-3"
            onClick={() => setPaying(true)}
          >
            <Wallet aria-hidden />
            Pay commission
          </Button>

          <ConfirmDialog
            open={paying}
            onOpenChange={setPaying}
            title="Tell FixItPH you have paid"
            description="Send the commission by the method below, then record it here. FixItPH checks it against the receiving account before it counts as paid."
            confirmLabel="Submit payment"
            onConfirm={async () => {
              if (reference.trim().length < 3) {
                setProblem("Enter the reference number from your transfer.");
                throw new Error("Enter the reference number from your transfer.");
              }
              setProblem(null);

              const saved = await commissionsApi.submitPayment(row.id, {
                method,
                amount: Number(row.commissionAmount),
                reference: reference.trim(),
              });

              /**
               * The receipt goes up after the declaration, not with it: the
               * upload attaches to an existing commission, and a failed
               * attachment should not lose a payment the provider has already
               * made. If it fails they can add it afterwards.
               */
              if (receipt) {
                await commissionsApi.uploadProof(row.id, receipt);
              }
              return saved;
            }}
            onDone={onChanged}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`method-${row.id}`}>How did you send it?</Label>
                <Select
                  id={`method-${row.id}`}
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as PaymentMethod)
                  }
                >
                  {REMIT_METHODS.map((option) => (
                    <option key={option} value={option}>
                      {PAYMENT_METHOD_LABEL[option]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`ref-${row.id}`}>Reference number</Label>
                <Input
                  id={`ref-${row.id}`}
                  value={reference}
                  onChange={(event) => {
                    setReference(event.target.value);
                    setProblem(null);
                  }}
                  placeholder="e.g. GC-8842119"
                  aria-invalid={!!problem || undefined}
                />
                {problem ? (
                  <p className="text-destructive text-sm">{problem}</p>
                ) : null}
              </div>
            </div>

            <RemittanceDetails method={method} destination={destinations[method]} />

            <div className="space-y-1.5">
              <Label htmlFor={`receipt-${row.id}`}>
                Receipt{" "}
                <span className="text-muted-foreground font-normal">
                  (optional, but it gets you verified faster)
                </span>
              </Label>
              <Input
                id={`receipt-${row.id}`}
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) =>
                  setReceipt(event.target.files?.[0] ?? null)
                }
              />
              {receipt ? (
                <p className="text-muted-foreground text-xs">
                  {receipt.name} · {(receipt.size / 1024).toFixed(0)} KB
                </p>
              ) : null}
            </div>

            <p className="text-muted-foreground text-xs">
              Amount: {money(row.commissionAmount, row.currency)}. This is the
              platform commission only — not the customer&apos;s payment for the
              job, which they settle with you directly.
            </p>
          </ConfirmDialog>
        </>
      ) : null}
    </article>
  );
}
