"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  Clock,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import {
  services,
  type OwnService,
  type ServiceStatus,
} from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { VerifyReminder } from "@/components/dashboard/provider/verify-reminder";
import {
  formatDuration,
  plural,
  priceLine,
  relativeTime,
  statusMeta,
} from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * "My services": the provider's own listings, including the ones the public
 * directory hides.
 *
 * This is why /services/mine exists. The public GET /services returns only
 * ACTIVE listings from approved providers, so a provider using it could never
 * see their own drafts — which is most of what they need this page for.
 *
 * The lifecycle a provider controls here is DRAFT → ACTIVE ⇄ PAUSED, plus
 * archiving. Publishing requires an approved verification, which the API
 * refuses otherwise; the button is disabled rather than allowed to fail.
 */

const TABS: { label: string; status?: ServiceStatus }[] = [
  { label: "All", status: undefined },
  { label: "Live", status: "ACTIVE" },
  { label: "Drafts", status: "DRAFT" },
  { label: "Paused", status: "PAUSED" },
  { label: "Archived", status: "ARCHIVED" },
];

export function ServicesView() {
  const user = useCurrentUser();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const status = TABS[tab].status;

  const { data, loading, error, reload, refreshing } = useQuery(
    () => services.mine({ status, q: query || undefined, page, limit: 20 }),
    [status, query, page],
  );

  const verified = user.provider?.verificationStatus === "APPROVED";
  const counts = data?.counts;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My services"
        description="Everything you offer, and whether customers can see it."
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/provider/services/new">
              <Plus aria-hidden />
              New service
            </Link>
          </Button>
        }
      />

<VerifyReminder />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Filter services by status"
          segments={TABS.map((item, index) => ({
            label: item.label,
            value: index,
            ...(item.status && counts ? { count: counts[item.status] } : {}),
          }))}
          value={tab}
          onChange={(index) => {
            setTab(index);
            setPage(1);
          }}
        />

        <form
          className="sm:ml-auto sm:w-56"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
          role="search"
        >
          <label htmlFor="service-search" className="sr-only">
            Search my services
          </label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="service-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title"
              className="pl-8"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Wrench}
          title={query ? "Nothing matched" : "No services yet"}
          description={
            query
              ? `No listing of yours matches “${query}”.`
              : "A listing is one thing you do, with a price on it. Customers find you through these."
          }
          action={
            query ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                }}
              >
                Clear search
              </Button>
            ) : (
              <Button asChild variant="accent" size="lg">
                <Link href="/provider/services/new">Add your first service</Link>
              </Button>
            )
          }
        />
      ) : (
        <div
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              canPublish={verified}
              onChanged={reload}
            />
          ))}
        </div>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="service" />
    </div>
  );
}

function ServiceRow({
  service,
  canPublish,
  onChanged,
}: {
  service: OwnService;
  canPublish: boolean;
  onChanged: () => void;
}) {
  const { run, pending, error } = useAction();
  const [archiving, setArchiving] = useState(false);
  // Which status change is in flight, so only the button that was pressed
  // shows a spinner rather than both.
  const [changing, setChanging] = useState<ServiceStatus | null>(null);

  const live = service.status === "ACTIVE";
  const archived = service.status === "ARCHIVED";

  async function setStatus(status: ServiceStatus) {
    setChanging(status);
    await run(() => services.update(service.id, { status }), {
      onSuccess: onChanged,
    });
    setChanging(null);
  }

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {service.title}
            </h3>
            <StatusBadge meta={statusMeta.service(service.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {service.category.name} · edited {relativeTime(service.updatedAt)}
          </p>
        </div>

        <div className="text-right">
          <p className="font-heading text-base leading-none font-semibold tabular-nums">
            {priceLine(service)}
          </p>
          {service.durationMinutes ? (
            <p className="text-muted-foreground mt-1 flex items-center justify-end gap-1 text-xs">
              <Clock className="size-3" aria-hidden />
              {formatDuration(service.durationMinutes)}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
        {service.description}
      </p>

      <p className="text-muted-foreground mt-2 text-xs">
        {plural(service._count.bookings, "booking")} ·{" "}
        {plural(service._count.serviceRequests, "request")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {!archived ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/provider/services/${service.id}`}>
              <Pencil aria-hidden />
              Edit
            </Link>
          </Button>
        ) : null}

        {live ? (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/services/${service.id}`}>
                <Eye aria-hidden />
                View as customer
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setStatus("PAUSED")}
              disabled={pending}
            >
              {changing === "PAUSED" ? <Spinner /> : <Pause aria-hidden />}
              Pause
            </Button>
          </>
        ) : null}

        {(service.status === "DRAFT" || service.status === "PAUSED") ? (
          <Button
            variant="accent"
            size="sm"
            onClick={() => void setStatus("ACTIVE")}
            disabled={pending || !canPublish}
            title={
              canPublish
                ? undefined
                : "Your documents have to be approved before a listing can go live."
            }
          >
            {changing === "ACTIVE" ? <Spinner /> : <Play aria-hidden />}
            {service.status === "DRAFT" ? "Publish" : "Resume"}
          </Button>
        ) : null}

        {!archived ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setArchiving(true)}
          >
            <Archive aria-hidden />
            Archive
          </Button>
        ) : null}
      </div>

      <ActionError message={error} />

      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={`Archive “${service.title}”?`}
        description={
          service._count.bookings > 0
            ? `It disappears from the directory. Its ${plural(
                service._count.bookings,
                "booking",
              )} are kept, so your history and any reviews stay intact.`
            : "It disappears from the directory. You can still see it under Archived."
        }
        confirmLabel="Archive listing"
        destructive
        onConfirm={() => services.remove(service.id)}
        onDone={onChanged}
      />
    </article>
  );
}
