"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Heart, HeartOff, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/dashboard/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import { favorites, type FavoriteRow } from "@/lib/api/client";
import { relativeTime, statusMeta } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Saved providers. Short and deliberately so: this is a shortlist, and its
 * only jobs are to get you to a provider's page and to let you drop one.
 */
export function FavoritesView() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery(
    () => favorites.list({ page, limit: 20 }),
    [page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Saved providers"
        description="The tradespeople you want to be able to find again."
      />

      {loading ? (
        <LoadingRows rows={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on a provider's page and they will be here next time you need them."
          action={
            <Button asChild variant="accent" size="lg">
              <Link href="/#search">Browse providers</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((row) => (
            <li key={row.provider.id}>
              <FavoriteCard row={row} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="provider" />
    </div>
  );
}

function FavoriteCard({
  row,
  onChanged,
}: {
  row: FavoriteRow;
  onChanged: () => void;
}) {
  const { provider } = row;
  const { run, pending, error } = useAction();
  const [removed, setRemoved] = useState(false);

  async function remove() {
    await run(() => favorites.remove(provider.id), {
      onSuccess: () => {
        // Hidden straight away rather than waiting for the refetch, so the
        // card does not sit there looking like the tap missed.
        setRemoved(true);
        onChanged();
      },
    });
  }

  if (removed) return null;

  return (
    <article className="ring-foreground/10 flex h-full flex-col rounded-xl px-4 py-4 ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-heading truncate text-base font-medium">
            <Link
              href={`/providers/${provider.slug}`}
              className="underline-offset-4 hover:underline"
            >
              {provider.businessName}
            </Link>
          </h3>
          {provider.headline ? (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
              {provider.headline}
            </p>
          ) : null}
        </div>
        {provider.verificationStatus === "APPROVED" ? (
          <BadgeCheck
            className="text-brand-lime-ink size-4 shrink-0"
            aria-label="Verified provider"
          />
        ) : null}
      </div>

      <dl className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Based in</dt>
          <dd>
            {[provider.baseBarangay, provider.baseCity].filter(Boolean).join(", ")}
          </dd>
        </div>
        {provider.ratingCount > 0 ? (
          <div>
            <dt className="sr-only">Rating</dt>
            <dd className="tabular-nums">
              {Number(provider.ratingAvg).toFixed(1)}★ ({provider.ratingCount})
            </dd>
          </div>
        ) : (
          <div>
            <dt className="sr-only">Rating</dt>
            <dd>No reviews yet</dd>
          </div>
        )}
      </dl>

      <div className="mt-2">
        {!provider.isAcceptingBookings ? (
          <StatusBadge meta={{ label: "Not taking bookings", tone: "warning" }} />
        ) : provider.verificationStatus !== "APPROVED" ? (
          <StatusBadge meta={statusMeta.verification(provider.verificationStatus)} />
        ) : null}
      </div>

      <p className="text-muted-foreground mt-auto pt-3 text-xs">
        Saved {relativeTime(row.createdAt)}
      </p>

      <div className="mt-3 flex gap-2">
        <Button asChild variant="accent" size="sm">
          <Link href={`/providers/${provider.slug}`}>View profile</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void remove()}
          disabled={pending}
        >
          {pending ? <Spinner /> : <HeartOff aria-hidden />}
          Remove
        </Button>
      </div>
      <ActionError message={error} />
    </article>
  );
}
