"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Flag, Star } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
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
import { admin, type AdminReviewRow } from "@/lib/api/client";
import { formatDate, personName, plural } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

type Filter = "reported" | "hidden" | "visible" | "";

/**
 * Review moderation.
 *
 * The only lever here is visibility, and that is on purpose. A review cannot
 * be edited or deleted by an administrator: hiding it takes it off the
 * provider's profile and out of their rating while leaving the record intact,
 * so a provider cannot lose a bad review and a customer cannot lose their
 * account of what happened.
 *
 * "Reported" is the default filter, because a queue of every review ever
 * written is not a queue.
 */
const FILTERS: { label: string; value: Filter }[] = [
  { label: "Reported", value: "reported" },
  { label: "Hidden", value: "hidden" },
  { label: "Visible", value: "visible" },
  { label: "All", value: "" },
];

const RATING_CAPS = [
  { label: "Any rating", value: "" },
  { label: "2★ and below", value: "2" },
  { label: "1★ only", value: "1" },
];

export function AdminReviewsView() {
  const [filter, setFilter] = useState<Filter>("reported");
  const [maxRating, setMaxRating] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      admin.reviews({
        ...(filter ? { filter } : {}),
        ...(maxRating ? { maxRating: Number(maxRating) } : {}),
        page,
        limit: 20,
      }),
    [filter, maxRating, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        description="Hide a review that breaks the rules. The record is kept either way."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Filter reviews"
          segments={FILTERS}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
        <div className="sm:ml-auto sm:w-40">
          <label htmlFor="review-rating" className="sr-only">
            Filter by rating
          </label>
          <Select
            id="review-rating"
            value={maxRating}
            onChange={(event) => {
              setMaxRating(event.target.value);
              setPage(1);
            }}
          >
            {RATING_CAPS.map((option) => (
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
          icon={Star}
          title={
            filter === "reported" ? "No reported reviews" : "No reviews here"
          }
          description={
            filter === "reported"
              ? "Nothing has an open report against it."
              : "Try a different filter."
          }
        />
      ) : (
        <ul
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((review) => (
            <li key={review.id}>
              <ModerateReviewCard review={review} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="review" />
    </div>
  );
}

function ModerateReviewCard({
  review,
  onChanged,
}: {
  review: AdminReviewRow;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"hide" | "show" | null>(null);

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex gap-0.5"
              aria-label={`${review.rating} out of 5`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={
                    star <= review.rating
                      ? "fill-accent text-brand-lime-ink size-3.5"
                      : "text-muted-foreground size-3.5"
                  }
                  aria-hidden
                />
              ))}
            </span>
            {review.isHidden ? (
              <StatusBadge meta={{ label: "Hidden", tone: "critical" }} />
            ) : null}
            {review.openReports > 0 ? (
              <span className="text-destructive flex items-center gap-1 text-xs font-medium">
                <Flag className="size-3" aria-hidden />
                {plural(review.openReports, "open report")}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground mt-1 text-sm">
            on{" "}
            <Link
              href={`/admin/listings?providerId=${review.provider.id}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {review.provider.businessName}
            </Link>{" "}
            by {personName(review.author.profile, review.author.email)}
          </p>
        </div>

        <time
          className="text-muted-foreground shrink-0 text-xs"
          dateTime={review.createdAt}
        >
          {formatDate(review.createdAt)}
        </time>
      </div>

      {review.comment ? (
        <p className="mt-3 text-sm">{review.comment}</p>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm italic">
          Rating only, no comment.
        </p>
      )}

      {review.providerResponse ? (
        <div className="bg-secondary/40 mt-3 rounded-lg px-3.5 py-2.5">
          <p className="text-xs font-medium">Provider&rsquo;s reply</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {review.providerResponse}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {review.isHidden ? (
          <Button variant="outline" size="sm" onClick={() => setDialog("show")}>
            <Eye aria-hidden />
            Restore
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDialog("hide")}
          >
            <EyeOff aria-hidden />
            Hide
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "hide"}
        onOpenChange={(open) => setDialog(open ? "hide" : null)}
        title="Hide this review?"
        description="It comes off the provider's public profile and stops counting towards their rating. The review itself is kept."
        confirmLabel="Hide review"
        destructive
        reason={{
          label: "Why are you hiding it?",
          placeholder:
            "Abusive language, not about the job, identifiable third party, suspected fake.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.setReviewVisibility(review.id, { hidden: true, reason })
        }
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "show"}
        onOpenChange={(open) => setDialog(open ? "show" : null)}
        title="Restore this review?"
        description="It goes back on the provider's profile and counts towards their rating again."
        confirmLabel="Restore review"
        reason={{
          label: "Why are you restoring it?",
          placeholder: "Hidden in error, appeal upheld, report dismissed.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.setReviewVisibility(review.id, { hidden: false, reason })
        }
        onDone={onChanged}
      />
    </article>
  );
}
