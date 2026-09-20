"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  adminPlans,
  plans as plansApi,
  type PlanPurchaseRow,
  type PlanPurchaseStatus,
} from "@/lib/api/client";
import {
  formatDateTime,
  money,
  PAYMENT_METHOD_LABEL,
  statusMeta,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

const TABS: { label: string; status?: PlanPurchaseStatus }[] = [
  { label: "To verify", status: "PAYMENT_SUBMITTED" },
  { label: "Active", status: "ACTIVE" },
  { label: "Rejected", status: "REJECTED" },
  { label: "All", status: undefined },
];

/** Opens the receipt in a new tab; the signed URL is fetched on click. */
async function openProof(id: string): Promise<void> {
  try {
    const { url } = await plansApi.proofUrl(id);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // The reference number is the real evidence; this is a convenience.
  }
}

/**
 * Plan payments waiting on a decision.
 *
 * Verifying is what actually moves a provider between plans — a provider
 * cannot do it themselves, by design and by a database trigger. Every ruling
 * here writes an admin_actions row in the same transaction as the change.
 */
export function AdminPlansView() {
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const status = TABS[tab].status;

  const list = useQuery(
    () => adminPlans.list({ status, page, limit: 20 }),
    [status, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plan payments"
        description="One-time plan purchases declared by providers, and whether the money arrived."
      />

      <p className="ring-foreground/10 text-muted-foreground rounded-xl px-4 py-3 text-sm ring-1">
        A plan is a one-time payment that raises how many services a provider
        may list. Verifying one here is the only thing that changes their plan.
      </p>

      <Segmented
        label="Filter plan payments"
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
          icon={Sparkles}
          title="Nothing in this queue"
          description="Plan payments appear here as soon as a provider says they have paid."
        />
      ) : (
        <div className="space-y-3">
          {list.data.items.map((row) => (
            <PurchaseCard key={row.id} row={row} onChanged={list.reload} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        result={list.data}
        onPageChange={setPage}
        unit="payment"
      />
    </div>
  );
}

function PurchaseCard({
  row,
  onChanged,
}: {
  row: PlanPurchaseRow;
  onChanged: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const open = row.status === "PAYMENT_SUBMITTED";

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {row.provider?.businessName ?? "Unknown provider"}
            </h3>
            <StatusBadge meta={statusMeta.planPurchase(row.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {row.plan} plan
            {row.provider ? <> · currently on {row.provider.plan}</> : null} ·
            declared {PAYMENT_METHOD_LABEL[row.paymentMethod]}{" "}
            <span className="text-foreground font-medium">
              {row.paymentReference}
            </span>{" "}
            · {formatDateTime(row.submittedAt)}
          </p>
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
              </span>
            </p>
          ) : open ? (
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
          {money(row.amount, row.currency)}
        </p>
      </div>

      {open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="accent" size="sm" onClick={() => setVerifying(true)}>
            Verify and activate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
            Not received
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={verifying}
        onOpenChange={setVerifying}
        title={`Activate the ${row.plan} plan?`}
        description="Check the reference against the receiving account first. This raises their listing limit straight away."
        confirmLabel="Yes, it arrived"
        onConfirm={() => adminPlans.verify(row.id)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title="Payment not found"
        description="The provider stays on their current plan and is told why."
        confirmLabel="Reject payment"
        destructive
        reason={{
          label: "What should the provider be told?",
          placeholder: "No transfer matching that reference arrived.",
          minLength: 5,
        }}
        onConfirm={(reason) => adminPlans.reject(row.id, reason)}
        onDone={onChanged}
      />
    </article>
  );
}
