"use client";

import { useState } from "react";
import { ClipboardList, Coins, MapPin, Send } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  GateCard,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  categories as categoriesApi,
  quotes,
  serviceRequests,
  type CategoryNode,
  type FeedRequest,
} from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { formatDate, money, moneyRange, plural, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Open jobs a provider can quote for.
 *
 * Served by the open_service_request_feed view rather than the requests table,
 * which is why the fields are snake_case and why there is no customer name,
 * street address or coordinates on a row: the view omits them by design, so a
 * provider sees the work and the general area before anyone has committed to
 * anything. The identity and address arrive only once a booking is confirmed.
 */
export function RequestFeed() {
  const user = useCurrentUser();

  const [city, setCity] = useState(user.profile?.city ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);

  const categories = useQuery(() => categoriesApi.tree(), []);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      serviceRequests.feed({
        city: city || undefined,
        categoryId: categoryId || undefined,
        page,
        limit: 20,
      }),
    [city, categoryId, page],
  );

  // Own quotes, so a row already quoted is not offered again.
  const mine = useQuery(() => serviceRequests.list({ limit: 50 }), []);
  const quotedIds = new Set((mine.data?.items ?? []).map((row) => row.id));

  if (!user.provider) {
    return (
      <GateCard
        title="Create your provider profile first"
        description="Open requests are only shown to providers. Set up a profile to start quoting."
        href="/provider"
        cta="Go to my dashboard"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Open requests"
        description="Jobs posted near you. Send a price and the customer decides."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="feed-city">City</Label>
          <Input
            id="feed-city"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setPage(1);
            }}
            placeholder="Any city"
          />
        </div>
        <div className="space-y-1.5 sm:w-64">
          <Label htmlFor="feed-category">Category</Label>
          <Select
            id="feed-category"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any category</option>
            {flatten(categories.data ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No open requests"
          description={
            city || categoryId
              ? "Nothing matches those filters right now. Try widening them."
              : "When customers post jobs you can quote for, they show up here."
          }
          action={
            city || categoryId ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setCity("");
                  setCategoryId("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={cn("space-y-3", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((request) => (
            <FeedRow
              key={request.id}
              request={request}
              alreadyQuoted={quotedIds.has(request.id)}
              onQuoted={() => {
                reload();
                mine.reload();
              }}
            />
          ))}
        </div>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="request" />
    </div>
  );
}

function FeedRow({
  request,
  alreadyQuoted,
  onQuoted,
}: {
  request: FeedRequest;
  alreadyQuoted: boolean;
  onQuoted: () => void;
}) {
  const [quoting, setQuoting] = useState(false);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");

  const amountValue = Number(amount);
  const amountValid = !!amount && Number.isFinite(amountValue) && amountValue >= 1;

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {request.title}
            </h3>
            <StatusBadge meta={statusMeta.urgency(request.urgency)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Posted {relativeTime(request.created_at)}
            {request.pending_quote_count > 0 ? (
              <>
                {" "}
                · {plural(request.pending_quote_count, "quote")} already in
              </>
            ) : (
              <> · no quotes yet</>
            )}
          </p>
        </div>
        <p className="text-right text-sm">
          <span className="text-muted-foreground block text-xs">Budget</span>
          <span className="tabular-nums">
            {moneyRange(request.budget_min, request.budget_max)}
          </span>
        </p>
      </div>

      <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
        {request.description_preview}
      </p>

      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Area</dt>
          <dd>{[request.barangay, request.city].filter(Boolean).join(", ")}</dd>
        </div>
        {request.preferred_at ? (
          <div>
            <dt className="sr-only">Preferred date</dt>
            <dd>Prefers {formatDate(request.preferred_at)}</dd>
          </div>
        ) : null}
        {request.expires_at ? (
          <div>
            <dt className="sr-only">Closes</dt>
            <dd>Closes {relativeTime(request.expires_at)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-muted-foreground mt-3 text-xs">
        The customer&rsquo;s name and exact address are shared once a booking is
        confirmed.
      </p>

      <div className="mt-4">
        {alreadyQuoted ? (
          <p className="text-muted-foreground text-sm">
            You have already quoted for this job.
          </p>
        ) : (
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              setAmount("");
              setDuration("");
              setQuoting(true);
            }}
          >
            <Send aria-hidden />
            Send a quote
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={quoting}
        onOpenChange={setQuoting}
        title={`Quote for “${request.title}”`}
        description="The customer sees your price, your note and your rating. You can withdraw a quote before it is accepted."
        confirmLabel={amountValid ? `Send ${money(amountValue)}` : "Send quote"}
        reason={{
          label: "Note for the customer",
          placeholder:
            "What the price covers, what it excludes, when you could come.",
          optional: true,
        }}
        onConfirm={(notes) =>
          quotes.create({
            serviceRequestId: request.id,
            amount: amountValue,
            ...(notes ? { notes } : {}),
            ...(duration ? { estimatedDurationMinutes: Number(duration) } : {}),
          })
        }
        onDone={onQuoted}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`amount-${request.id}`}>Your price</Label>
            <div className="relative">
              <Coins
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id={`amount-${request.id}`}
                type="number"
                min={1}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="pl-8"
                placeholder="1500"
                autoFocus
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Their budget: {moneyRange(request.budget_min, request.budget_max)}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`duration-${request.id}`}>
              How long{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id={`duration-${request.id}`}
              type="number"
              min={15}
              max={10080}
              step={15}
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="Minutes"
            />
          </div>
        </div>
        {!amountValid && amount ? (
          <p className="text-destructive text-sm">
            A quote has to be at least ₱1.
          </p>
        ) : null}
      </ConfirmDialog>
    </article>
  );
}

function flatten(
  nodes: CategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}
