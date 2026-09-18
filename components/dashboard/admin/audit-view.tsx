"use client";

import { useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";

import { Pagination } from "@/components/dashboard/pagination";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { admin, type AuditEntry } from "@/lib/api/client";
import { formatDateTime, humanise, relativeTime } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The audit log.
 *
 * Every administrative action on this dashboard writes a row here, in the same
 * transaction as the change it records — so if the change rolled back the row
 * went with it, and if the row could not be written the change did not happen.
 * The table is insert-only: UPDATE and DELETE are revoked from the API's
 * database role, so nothing on this screen can be edited away, including by
 * whoever is reading it.
 *
 * The before/after payloads are the useful part, which is why each row expands
 * rather than linking somewhere.
 */
export function AdminAuditView() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(
    () => admin.auditLog({ page, limit: 25 }),
    [page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every administrative action, newest first. Insert-only: these rows cannot be changed or removed."
      />

      {loading ? (
        <LoadingRows rows={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded yet"
          description="Suspensions, verifications, takedowns and settings changes all appear here."
        />
      ) : (
        <ul className="space-y-2">
          {data.items.map((entry) => (
            <li key={entry.id}>
              <AuditRow entry={entry} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="entry" />
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const hasPayload = entry.before !== null || entry.after !== null;

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-3 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {humanise(entry.actionType)}
            <span className="text-muted-foreground font-normal">
              {" "}
              on a {entry.targetType.toLowerCase().replace(/_/g, " ")}
            </span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {entry.admin.email} ·{" "}
            <time dateTime={entry.createdAt}>
              {formatDateTime(entry.createdAt)}
            </time>{" "}
            ({relativeTime(entry.createdAt)})
            {entry.ipAddress ? <> · {entry.ipAddress}</> : null}
          </p>
          {entry.reason ? (
            <p className="mt-1.5 text-sm">{entry.reason}</p>
          ) : null}
        </div>

        {hasPayload ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs"
          >
            {open ? "Hide" : "What changed"}
            <ChevronDown
              className={open ? "size-3.5 rotate-180" : "size-3.5"}
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Payload label="Before" value={entry.before} />
          <Payload label="After" value={entry.after} />
        </div>
      ) : null}

      <p className="text-muted-foreground mt-2 font-mono text-xs">
        {entry.targetId}
      </p>
    </article>
  );
}

function Payload({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <pre className="bg-secondary/50 max-h-52 overflow-auto rounded-lg px-3 py-2 font-mono text-xs">
        {value === null || value === undefined
          ? "—"
          : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
