"use client";

import { useState } from "react";
import { BadgeCheck, Check, FileText, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/dashboard/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { admin, type PendingVerification } from "@/lib/api/client";
import { formatDate, humanise, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The verification queue.
 *
 * Approving a provider is what makes them discoverable and bookable, so it is
 * the one decision on this dashboard that most needs to be slow. The queue is
 * ordered oldest-first by the API, each document can be approved or rejected
 * on its own, and a provider with no documents at all is flagged before you
 * can approve them by accident.
 */
export function AdminVerificationView() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(
    () => admin.pendingVerifications({ page, limit: 10 }),
    [page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Provider verification"
        description="Oldest first. Approving makes a provider visible in search and able to take bookings."
      />

      {loading ? (
        <LoadingRows rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={BadgeCheck}
          title="Queue is clear"
          description="No providers are waiting on a verification decision."
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((provider) => (
            <li key={provider.id}>
              <VerificationCard provider={provider} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="provider" />
    </div>
  );
}

function VerificationCard({
  provider,
  onChanged,
}: {
  provider: PendingVerification;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);

  const documents = provider.documents;
  const approvedDocs = documents.filter((doc) => doc.status === "APPROVED");
  const noDocuments = documents.length === 0;
  const nothingApproved = !noDocuments && approvedDocs.length === 0;

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {provider.businessName}
            </h3>
            <StatusBadge
              meta={statusMeta.verification(provider.verificationStatus)}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {provider.baseCity} · {provider.user.email}
            {provider.user.phone ? <> · {provider.user.phone}</> : null}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Waiting since {formatDate(provider.createdAt)} (
            {relativeTime(provider.createdAt)})
          </p>
        </div>
      </div>

      {noDocuments ? (
        <p className="border-border bg-secondary mt-3 flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm">
          <TriangleAlert
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          <span>
            <span className="font-medium">No documents uploaded.</span> There is
            nothing here to verify them against.
          </span>
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => (
            <li key={document.id}>
              <DocumentRow document={document} onChanged={onChanged} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="accent"
          size="sm"
          onClick={() => setDialog("approve")}
          disabled={noDocuments}
          title={
            noDocuments
              ? "Nothing has been uploaded to verify against."
              : undefined
          }
        >
          <Check aria-hidden />
          Approve provider
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDialog("reject")}
        >
          <X aria-hidden />
          Reject
        </Button>
      </div>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => setDialog(open ? "approve" : null)}
        title={`Approve ${provider.businessName}?`}
        description={
          nothingApproved
            ? "None of their documents has been individually approved yet. Approving the provider anyway is recorded against your account."
            : "They appear in search immediately and can publish listings and take bookings."
        }
        confirmLabel="Approve provider"
        reason={{
          label: "Note for the audit log",
          placeholder: "Which documents you checked, and anything notable.",
          optional: true,
        }}
        onConfirm={(reason) =>
          admin.verifyProvider(provider.id, {
            decision: "APPROVE",
            ...(reason ? { reason } : {}),
          })
        }
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={(open) => setDialog(open ? "reject" : null)}
        title={`Reject ${provider.businessName}?`}
        description="They are told, and the reason you give is what they see. They can upload new documents and apply again."
        confirmLabel="Reject verification"
        destructive
        reason={{
          label: "Why are you rejecting this?",
          placeholder:
            "What is wrong or missing, and what they need to send instead.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.verifyProvider(provider.id, { decision: "REJECT", reason })
        }
        onDone={onChanged}
      />
    </article>
  );
}

function DocumentRow({
  document,
  onChanged,
}: {
  document: PendingVerification["documents"][number];
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const decided = document.status === "APPROVED" || document.status === "REJECTED";

  return (
    <div className="bg-secondary/40 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3.5 py-2.5">
      <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {humanise(document.documentType)}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {document.originalFilename} · uploaded {formatDate(document.createdAt)}
        </p>
      </div>

      <StatusBadge meta={statusMeta.verification(document.status)} />

      {!decided ? (
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setDialog("approve")}
            aria-label={`Approve ${humanise(document.documentType)}`}
          >
            <Check aria-hidden />
            Approve
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDialog("reject")}
            aria-label={`Reject ${humanise(document.documentType)}`}
          >
            <X aria-hidden />
            Reject
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => setDialog(open ? "approve" : null)}
        title={`Approve this ${humanise(document.documentType).toLowerCase()}?`}
        description="Marks this one document as checked. It does not verify the provider on its own."
        confirmLabel="Approve document"
        reason={{
          label: "Note",
          placeholder: "What you verified against.",
          optional: true,
        }}
        onConfirm={(reason) =>
          admin.reviewDocument(document.id, {
            decision: "APPROVE",
            ...(reason ? { reason } : {}),
          })
        }
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "reject"}
        onOpenChange={(open) => setDialog(open ? "reject" : null)}
        title={`Reject this ${humanise(document.documentType).toLowerCase()}?`}
        description="The provider is told what is wrong with it and can upload a replacement."
        confirmLabel="Reject document"
        destructive
        reason={{
          label: "What is wrong with it?",
          placeholder: "Unreadable, expired, name does not match, wrong document.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.reviewDocument(document.id, { decision: "REJECT", reason })
        }
        onDone={onChanged}
      />
    </div>
  );
}
