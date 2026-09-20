"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  adminCommissions,
  commissions as commissionsApi,
  type CommissionRow,
  type CommissionStatus,
} from "@/lib/api/client";

/**
 * Opens the receipt in a new tab.
 *
 * Fetched on demand rather than rendered inline: the URL is short-lived and
 * signed, so baking one into the list would hand out a hundred links that all
 * expire before anybody clicks them.
 */
async function openProof(id: string): Promise<void> {
  try {
    const { url } = await commissionsApi.proofUrl(id);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // The button is a convenience; the reference number is the real evidence.
  }
}
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
  { label: "To verify", status: "PAYMENT_SUBMITTED" },
  { label: "Due", status: "DUE" },
  { label: "Overdue", status: "OVERDUE" },
  { label: "Disputed", status: "DISPUTED" },
  { label: "Paid", status: "PAID" },
  { label: "All", status: undefined },
];

/**
 * Commission management.
 *
 * The queue that matters is "to verify": a provider has said they remitted
 * and nobody has checked the receiving account yet. It leads, because every
 * other view here is reference rather than work.
 *
 * Every action on this screen writes an admin_actions row in the same
 * transaction as the change, so the audit log is the record of who decided
 * what — this page never becomes the only account of it.
 */
export function AdminCommissionsView() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const status = TABS[tab].status;

  const outstanding = useQuery(() => adminCommissions.outstanding(), []);
  const list = useQuery(
    () => adminCommissions.list({ status, page, limit: 20 }),
    [status, page],
  );

  const reload = () => {
    list.reload();
    outstanding.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commissions"
        description="What providers owe the platform, and the payments they have declared."
      />

      <p className="ring-foreground/10 text-muted-foreground rounded-xl px-4 py-3 text-sm ring-1">
        {COMMISSION_DISCLOSURE}
      </p>

      <StatGrid className="lg:grid-cols-2">
        <StatCard
          label="Total outstanding"
          value={money(outstanding.data?.totalOutstanding)}
          hint="Due, overdue and awaiting verification"
          tone={
            Number(outstanding.data?.totalOutstanding ?? 0) > 0
              ? "warning"
              : "neutral"
          }
          loading={outstanding.loading}
        />
        <StatCard
          label="Providers owing"
          value={outstanding.data?.items.length ?? 0}
          hint="With an unsettled balance"
          loading={outstanding.loading}
        />
      </StatGrid>

      {outstanding.data?.items.length ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">
            Outstanding balances
          </h2>
          <ul className="ring-foreground/10 divide-border divide-y rounded-xl px-4 ring-1">
            {outstanding.data.items.map((row) => (
              <li
                key={row.providerId}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="truncate">
                  {row.provider?.businessName ?? "Unknown provider"}
                  <span className="text-muted-foreground">
                    {" · "}
                    {row.count} commission{row.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {money(row.outstanding)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
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

        {list.loading ? (
          <LoadingRows rows={4} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.data?.items.length ? (
          <EmptyState
            icon={Receipt}
            title="Nothing in this queue"
            description="Commissions appear here once a customer confirms a completed booking."
          />
        ) : (
          <div className="space-y-3">
            {list.data.items.map((row) => (
              <AdminCommissionCard key={row.id} row={row} onChanged={reload} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          result={list.data}
          onPageChange={setPage}
          unit="commission"
        />
      </section>
    </div>
  );
}

function AdminCommissionCard({
  row,
  onChanged,
}: {
  row: CommissionRow;
  onChanged: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [waiving, setWaiving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [amount, setAmount] = useState(String(row.commissionAmount));

  const submitted = row.status === "PAYMENT_SUBMITTED";
  const open =
    row.status === "DUE" ||
    row.status === "OVERDUE" ||
    row.status === "DISPUTED" ||
    submitted;

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {row.provider?.businessName ?? "Unknown provider"}
            </h3>
            <StatusBadge meta={statusMeta.commission(row.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {money(row.finalAmount, row.currency)} job ·{" "}
            {ratePercent(row.commissionRate)} · due {formatDate(row.dueDate)}
          </p>
          {submitted ? (
            <p className="mt-1 text-sm">
              Declared{" "}
              {row.paymentMethod
                ? PAYMENT_METHOD_LABEL[row.paymentMethod]
                : "—"}{" "}
              <span className="font-medium">{row.paymentReference}</span>
              <span className="text-muted-foreground">
                {" · "}
                {formatDateTime(row.submittedAt)}
              </span>
            </p>
          ) : null}
          {row.proofFilename ? (
            <p className="mt-1 text-sm">
              <button
                type="button"
                className="link-lime"
                onClick={() => void openProof(row.id)}
              >
                View receipt
              </button>
              <span className="text-muted-foreground">
                {" · "}
                {row.proofFilename}
                {row.proofSizeBytes
                  ? ` · ${(row.proofSizeBytes / 1024).toFixed(0)} KB`
                  : ""}
              </span>
            </p>
          ) : row.status === "PAYMENT_SUBMITTED" ? (
            <p className="text-muted-foreground mt-1 text-sm">
              No receipt attached — check the reference against the receiving
              account.
            </p>
          ) : null}
          {row.note ? (
            <p className="text-muted-foreground mt-1 text-sm">{row.note}</p>
          ) : null}
        </div>
        <p className="font-heading shrink-0 text-lg font-semibold tabular-nums">
          {money(row.commissionAmount, row.currency)}
        </p>
      </div>

      {open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {submitted ? (
            <>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setVerifying(true)}
              >
                Verify payment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejecting(true)}
              >
                Not received
              </Button>
            </>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => setAdjusting(true)}>
            Adjust
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWaiving(true)}>
            Waive
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={verifying}
        onOpenChange={setVerifying}
        title="Confirm this commission was received"
        description="Check the reference against the receiving account first. This marks it paid and cannot be undone from here."
        confirmLabel="Yes, it arrived"
        onConfirm={() => adminCommissions.verify(row.id)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Payment not found"
        description="The commission goes back to owing, and the provider is told why."
        confirmLabel="Reject payment"
        destructive
        reason={{
          label: "What should the provider be told?",
          placeholder: "No transfer matching that reference arrived.",
          minLength: 5,
        }}
        onConfirm={(reason) => adminCommissions.reject(row.id, reason)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={waiving}
        onOpenChange={setWaiving}
        title="Waive this commission"
        description="It will never be collected. The reason is kept on the record and shown to the provider."
        confirmLabel="Waive it"
        reason={{
          label: "Why is it being waived?",
          minLength: 5,
        }}
        onConfirm={(reason) => adminCommissions.waive(row.id, reason)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={adjusting}
        onOpenChange={setAdjusting}
        title="Adjust what is owed"
        description="The stored rate is left alone, so the record still shows what the booking was originally charged at."
        confirmLabel="Save adjustment"
        reason={{ label: "Why is it being adjusted?", minLength: 5 }}
        onConfirm={(reason) =>
          adminCommissions.adjust(row.id, Number(amount), reason)
        }
        onDone={onChanged}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`amount-${row.id}`}>New commission amount</Label>
          <Input
            id={`amount-${row.id}`}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Was {money(row.commissionAmount, row.currency)} at{" "}
            {ratePercent(row.commissionRate)} of{" "}
            {money(row.finalAmount, row.currency)}. It cannot exceed the job
            total.
          </p>
        </div>
      </ConfirmDialog>
    </article>
  );
}
