"use client";

import { useState } from "react";
import { MessageSquareReply, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/dashboard/pagination";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  GateCard,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { providers, reviews, type ReviewRow } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { formatDate, plural, reviewerName } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * What customers said, and the provider's one chance to answer.
 *
 * A provider can add a response to a review but cannot edit or delete the
 * review itself — a trigger (reviews_guard_update) enforces which side may
 * touch which columns, so the only field offered here is providerResponse.
 * That asymmetry is the point of a review system.
 */
export function ProviderReviewsView() {
  const user = useCurrentUser();
  const providerId = user.provider?.id;
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useQuery(
    () =>
      providerId
        ? providers.reviews(providerId, { page, limit: 20, sort: "recent" })
        : Promise.resolve(null),
    [providerId, page],
  );

  if (!user.provider) {
    return (
      <GateCard
        title="No provider profile yet"
        description="Reviews appear here once you have a profile and have completed your first job."
        href="/provider"
        cta="Go to my dashboard"
      />
    );
  }

  const breakdown = data?.breakdown ?? [];
  const total = breakdown.reduce((sum, row) => sum + row.count, 0);
  const average =
    total > 0
      ? breakdown.reduce((sum, row) => sum + row.stars * row.count, 0) / total
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        description="Your public rating, and what each customer wrote."
      />

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          {total > 0 ? (
            <section className="ring-foreground/10 flex flex-col gap-5 rounded-xl px-4 py-4 ring-1 sm:flex-row sm:items-center">
              <div className="text-center sm:w-32">
                <p className="font-heading text-4xl leading-none font-semibold tabular-nums">
                  {average.toFixed(1)}
                </p>
                <div className="mt-1.5 flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={
                        star <= Math.round(average)
                          ? "fill-accent text-brand-lime-ink size-4"
                          : "text-muted-foreground size-4"
                      }
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {plural(total, "review")}
                </p>
              </div>

              <ul className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count =
                    breakdown.find((row) => row.stars === stars)?.count ?? 0;
                  const share = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-6 shrink-0 tabular-nums">{stars}★</span>
                      <div className="bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-accent h-full rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 shrink-0 text-right tabular-nums">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {!data?.items.length ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Customers can review a job once you have marked it complete."
            />
          ) : (
            <ul className="space-y-3">
              {data.items.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} onChanged={reload} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={page}
            result={data}
            onPageChange={setPage}
            unit="review"
          />
        </>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onChanged,
}: {
  review: ReviewRow;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-0.5" aria-label={`${review.rating} out of 5`}>
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
          <span className="text-sm font-medium">
            {reviewerName(review.author)}
          </span>
        </div>
        <time className="text-muted-foreground text-xs" dateTime={review.createdAt}>
          {formatDate(review.createdAt)}
        </time>
      </div>

      {review.comment ? (
        <p className="mt-2 text-sm">{review.comment}</p>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm italic">
          Rating only, no comment.
        </p>
      )}

      {review.providerResponse ? (
        <div className="bg-secondary/50 mt-3 rounded-lg px-3.5 py-3">
          <p className="text-xs font-medium">Your reply</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {review.providerResponse}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setReplying(true)}>
            <MessageSquareReply aria-hidden />
            Reply publicly
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={replying}
        onOpenChange={setReplying}
        title="Reply to this review"
        description="Your reply is public and sits under the review. You get one reply, so make it count."
        confirmLabel="Post reply"
        reason={{
          label: "Your reply",
          placeholder:
            "Thank them, or set the record straight. Keep it short and civil.",
          minLength: 10,
        }}
        onConfirm={(providerResponse) =>
          reviews.update(review.id, { providerResponse })
        }
        onDone={onChanged}
      />
    </article>
  );
}
