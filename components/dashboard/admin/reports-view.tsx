"use client";

import { useState } from "react";
import { Check, EyeOff, MessageSquareWarning, X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  admin,
  type AdminReportRow,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/api/client";
import { formatDateTime, humanise, personName, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * The report queue: things users have flagged, ordered unresolved-first and
 * then oldest-first, because that is the order they should be worked.
 *
 * A report's target is polymorphic — it can point at a user, a provider, a
 * listing, a review, a message or a booking — so the API resolves each one
 * into a readable label server-side. Without that, this screen would be a
 * list of UUIDs.
 *
 * Resolving a report about a review can hide the review in the same action,
 * which is the one shortcut worth having here: it is the commonest outcome
 * and doing it in two places invites a resolved report over a live review.
 */

const FILTERS: { label: string; value: ReportStatus | "open" | "" }[] = [
  { label: "Needs a decision", value: "open" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Dismissed", value: "DISMISSED" },
  { label: "All", value: "" },
];

const TARGET_TYPES: { label: string; value: ReportTargetType | "" }[] = [
  { label: "Anything", value: "" },
  { label: "Reviews", value: "REVIEW" },
  { label: "Listings", value: "SERVICE" },
  { label: "Providers", value: "PROVIDER" },
  { label: "Users", value: "USER" },
  { label: "Bookings", value: "BOOKING" },
  { label: "Messages", value: "MESSAGE" },
];

export function AdminReportsView() {
  const [filter, setFilter] = useState<ReportStatus | "open" | "">("open");
  const [targetType, setTargetType] = useState<ReportTargetType | "">("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      admin.reports({
        ...(filter === "open"
          ? { openOnly: true }
          : filter
            ? { status: filter }
            : {}),
        targetType: targetType || undefined,
        page,
        limit: 20,
      }),
    [filter, targetType, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="What users have flagged. Oldest unresolved first."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Filter reports"
          segments={FILTERS}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
        <div className="sm:ml-auto sm:w-40">
          <label htmlFor="report-target" className="sr-only">
            Filter by what was reported
          </label>
          <Select
            id="report-target"
            value={targetType}
            onChange={(event) => {
              setTargetType(event.target.value as ReportTargetType | "");
              setPage(1);
            }}
          >
            {TARGET_TYPES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={MessageSquareWarning}
          title={filter === "open" ? "Nothing to decide" : "No reports here"}
          description={
            filter === "open"
              ? "Every report has been dealt with."
              : "Try a different filter."
          }
        />
      ) : (
        <ul
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((report) => (
            <li key={report.id}>
              <ReportCard report={report} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="report" />
    </div>
  );
}

function ReportCard({
  report,
  onChanged,
}: {
  report: AdminReportRow;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"resolve" | "dismiss" | null>(null);
  const [hideReview, setHideReview] = useState(false);

  const open = report.status === "OPEN" || report.status === "UNDER_REVIEW";
  const aboutReview = report.targetType === "REVIEW";

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">
              {humanise(report.reason)}
            </h3>
            <StatusBadge meta={statusMeta.report(report.status)} />
            <span className="text-muted-foreground text-xs">
              about a {report.targetType.toLowerCase()}
            </span>
          </div>

          <p className="text-muted-foreground mt-0.5 text-xs">
            Reported by {personName(report.reporter.profile, report.reporter.email)}{" "}
            ({report.reporter.role.toLowerCase()}) ·{" "}
            {relativeTime(report.createdAt)}
          </p>
        </div>
      </div>

      {/* The resolved target, so the row is about a thing rather than an id. */}
      <div className="bg-secondary/40 mt-3 rounded-lg px-3.5 py-2.5">
        {report.target ? (
          <>
            <p className="text-sm font-medium">{report.target.label}</p>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
              {report.target.detail}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            The reported {report.targetType.toLowerCase()} no longer exists.
          </p>
        )}
      </div>

      {report.details ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">What they said: </span>
          {report.details}
        </p>
      ) : null}

      {report.resolvedAt ? (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            {statusMeta.report(report.status).label} by{" "}
            {report.resolvedBy?.email ?? "an administrator"} on{" "}
            {formatDateTime(report.resolvedAt)}
          </p>
          {report.resolutionNotes ? (
            <p className="mt-1 text-sm">{report.resolutionNotes}</p>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              setHideReview(aboutReview);
              setDialog("resolve");
            }}
          >
            <Check aria-hidden />
            Uphold and resolve
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDialog("dismiss")}>
            <X aria-hidden />
            Dismiss
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={dialog === "resolve"}
        onOpenChange={(open) => setDialog(open ? "resolve" : null)}
        title="Uphold this report"
        description="Marks the report resolved. Record what you did about it, because the reporter is told it was actioned."
        confirmLabel="Resolve report"
        reason={{
          label: "What did you do?",
          placeholder:
            "Hid the review, took the listing down, warned the account, suspended them.",
          minLength: 5,
        }}
        onConfirm={(notes) =>
          admin.resolveReport(report.id, {
            notes,
            status: "RESOLVED",
            ...(aboutReview ? { hideReview } : {}),
          })
        }
        onDone={onChanged}
      >
        {aboutReview ? (
          <label className="bg-secondary/40 flex items-start gap-2.5 rounded-lg px-3.5 py-2.5">
            <Checkbox
              checked={hideReview}
              onCheckedChange={(checked) => setHideReview(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <EyeOff className="size-3.5" aria-hidden />
                Hide the review as well
              </span>
              <span className="text-muted-foreground">
                It drops off the provider&rsquo;s public profile and stops
                counting towards their rating.
              </span>
            </span>
          </label>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "dismiss"}
        onOpenChange={(open) => setDialog(open ? "dismiss" : null)}
        title="Dismiss this report"
        description="Nothing happens to what was reported. The note is kept against the report."
        confirmLabel="Dismiss report"
        reason={{
          label: "Why are you dismissing it?",
          placeholder: "Nothing wrong with it, not a platform matter, duplicate.",
          minLength: 5,
        }}
        onConfirm={(notes) =>
          admin.resolveReport(report.id, { notes, status: "DISMISSED" })
        }
        onDone={onChanged}
      />
    </article>
  );
}
