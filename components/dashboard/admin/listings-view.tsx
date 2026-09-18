"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Pause, RotateCcw, Search, Tags } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type AdminServiceRow,
  type ServiceStatus,
} from "@/lib/api/client";
import { plural, priceLine, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Listing moderation: every service on the platform, at any status and from
 * any provider.
 *
 * The public GET /services cannot serve this screen — it only returns ACTIVE
 * listings belonging to approved providers, which excludes exactly the rows a
 * moderator is looking for. GET /admin/services returns the lot.
 *
 * Three actions, deliberately distinct:
 *   Pause      — reversible by the provider. For something that needs fixing.
 *   Take down  — archived and soft-deleted. Off the platform; the provider
 *                cannot undo it.
 *   Reinstate  — a taken-down listing comes back as a DRAFT, so the provider
 *                has to republish it knowingly rather than it reappearing.
 */

const STATUS_SEGMENTS: { label: string; value: ServiceStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Live", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Taken down", value: "ARCHIVED" },
];

export function AdminListingsView({
  initialProviderId = "",
  initialQuery = "",
}: {
  initialProviderId?: string;
  initialQuery?: string;
}) {
  const [status, setStatus] = useState<ServiceStatus | "">("");
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      admin.services({
        status: status || undefined,
        providerId: initialProviderId || undefined,
        q: query || undefined,
        page,
        limit: 20,
      }),
    [status, initialProviderId, query, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Listings"
        description="Every service on the platform. Pause something that needs fixing; take down what should not be here."
      />

      {initialProviderId ? (
        <p className="border-border bg-secondary flex flex-wrap items-center gap-2 rounded-md border px-4 py-2.5 text-sm">
          Showing one provider&rsquo;s listings.
          <Link
            href="/admin/listings"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Show all
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Filter by status"
          segments={STATUS_SEGMENTS}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />

        <form
          className="sm:ml-auto sm:w-64"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
        >
          <label htmlFor="listing-search" className="sr-only">
            Search listings by title or provider
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="listing-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title or business name"
              className="pl-8"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Tags}
          title="No listings matched"
          description={
            query
              ? `Nothing for “${query}” with those filters.`
              : "Try a different status."
          }
        />
      ) : (
        <ul
          className={cn("space-y-2", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((service) => (
            <li key={service.id}>
              <ListingRow service={service} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="listing" />
    </div>
  );
}

function ListingRow({
  service,
  onChanged,
}: {
  service: AdminServiceRow;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<
    "TAKE_DOWN" | "PAUSE" | "REINSTATE" | null
  >(null);

  const down = service.deletedAt !== null;

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-3.5 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{service.title}</h3>
            <StatusBadge meta={statusMeta.service(service.status)} />
            {down ? (
              <StatusBadge meta={{ label: "Taken down", tone: "critical" }} />
            ) : null}
          </div>

          <p className="text-muted-foreground mt-0.5 text-sm">
            <Link
              href={`/admin/listings?providerId=${service.provider.id}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {service.provider.businessName}
            </Link>{" "}
            · {service.provider.baseCity} · {service.category.name}
          </p>

          <p className="text-muted-foreground mt-0.5 text-xs">
            {service.provider.user.email} ·{" "}
            {statusMeta.verification(service.provider.verificationStatus).label}
            {service.provider.suspendedAt ? (
              <span className="text-destructive"> · provider suspended</span>
            ) : null}
          </p>

          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
            {service.description}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-medium tabular-nums">
            {priceLine(service)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {plural(service._count.bookings, "booking")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            edited {relativeTime(service.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {down ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog("REINSTATE")}
          >
            <RotateCcw aria-hidden />
            Reinstate as draft
          </Button>
        ) : (
          <>
            {service.status === "ACTIVE" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog("PAUSE")}
              >
                <Pause aria-hidden />
                Pause
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setDialog("TAKE_DOWN")}
            >
              <Ban aria-hidden />
              Take down
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "PAUSE"}
        onOpenChange={(open) => setDialog(open ? "PAUSE" : null)}
        title={`Pause “${service.title}”?`}
        description="It stops appearing in search. The provider can see why and put it back themselves once they have fixed it."
        confirmLabel="Pause listing"
        reason={{
          label: "Why are you pausing it?",
          placeholder: "What is wrong with the listing and what has to change.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.moderateService(service.id, { action: "PAUSE", reason })
        }
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "TAKE_DOWN"}
        onOpenChange={(open) => setDialog(open ? "TAKE_DOWN" : null)}
        title={`Take down “${service.title}”?`}
        description={
          service._count.bookings > 0
            ? `It is archived and removed from every public page. Its ${plural(
                service._count.bookings,
                "booking",
              )} are kept. The provider cannot undo this.`
            : "It is archived and removed from every public page. The provider cannot undo this."
        }
        confirmLabel="Take listing down"
        destructive
        reason={{
          label: "Why are you taking it down?",
          placeholder:
            "The policy it breaks, and the report reference if there is one.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.moderateService(service.id, { action: "TAKE_DOWN", reason })
        }
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "REINSTATE"}
        onOpenChange={(open) => setDialog(open ? "REINSTATE" : null)}
        title={`Reinstate “${service.title}”?`}
        description="It comes back as a draft, so it stays hidden until the provider publishes it again."
        confirmLabel="Reinstate as draft"
        reason={{
          label: "Why are you reinstating it?",
          placeholder: "Appeal upheld, taken down in error, provider fixed it.",
          minLength: 10,
        }}
        onConfirm={(reason) =>
          admin.moderateService(service.id, { action: "REINSTATE", reason })
        }
        onDone={onChanged}
      />
    </article>
  );
}
