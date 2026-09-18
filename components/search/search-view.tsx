"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Wrench } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { ProviderCard } from "@/components/search/provider-card";
import { ServiceCard } from "@/components/search/service-card";
import { CompareTray } from "@/components/search/compare-tray";
import {
  categories as categoriesApi,
  providers as providersApi,
  services as servicesApi,
  type CategoryNode,
  type ProviderSearchParams,
  type ProviderSummary,
} from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";

/**
 * The results page: steps two through four of the customer journey — browse
 * providers, compare services, pick one to look at properly.
 *
 * Two tabs over one filter set, because "aircon cleaning" is a sensible thing
 * to search for as a *listing with a price* and as a *person who does it*,
 * and which one you want depends on whether you already know what the job is.
 *
 * Filter state lives in the URL. That is what makes a filtered search
 * shareable, survive a reload, and work with the browser's back button —
 * which matters here more than anywhere, because a customer bouncing between
 * a profile and their results is the whole shape of this page.
 */

type Tab = "providers" | "services";

const SORTS: { label: string; value: NonNullable<ProviderSearchParams["sort"]> }[] =
  [
    { label: "Most relevant", value: "relevance" },
    { label: "Best rated", value: "rating" },
    { label: "Most jobs done", value: "jobs" },
    { label: "Fastest to reply", value: "response" },
    { label: "Newest", value: "newest" },
  ];

const SERVICE_SORTS = [
  { label: "Most relevant", value: "relevance" },
  { label: "Cheapest first", value: "price_asc" },
  { label: "Dearest first", value: "price_desc" },
];

const MAX_COMPARE = 3;

export function SearchView({ initialTab = "providers" }: { initialTab?: Tab }) {
  const router = useRouter();
  const params = useSearchParams();

  const [tab, setTab] = useState<Tab>(
    (params.get("tab") as Tab) || initialTab,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compared, setCompared] = useState<ProviderSummary[]>([]);

  // Read straight from the URL rather than mirroring it into state: one
  // source of truth, so the back button cannot disagree with the inputs.
  const q = params.get("q") ?? "";
  const city = params.get("city") ?? "";
  const barangay = params.get("barangay") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const minRating = params.get("minRating") ?? "";
  const acceptsEmergency = params.get("acceptsEmergency") === "true";
  const availableNow = params.get("availableNow") === "true";
  const sort = params.get("sort") ?? "relevance";
  const page = Number(params.get("page") ?? "1") || 1;

  /** Writes a patch back into the URL, resetting to page one as it goes. */
  const setParams = useCallback(
    (patch: Record<string, string | null>, keepPage = false) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (!keepPage) next.delete("page");
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const categories = useQuery(() => categoriesApi.tree(), []);

  const providerResults = useQuery(
    () =>
      tab === "providers"
        ? providersApi.search({
            q: q || undefined,
            city: city || undefined,
            barangay: barangay || undefined,
            categoryId: categoryId || undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            minRating: minRating ? Number(minRating) : undefined,
            acceptsEmergency: acceptsEmergency || undefined,
            availableNow: availableNow || undefined,
            sort: sort as ProviderSearchParams["sort"],
            page,
            limit: 12,
          })
        : Promise.resolve(null),
    [
      tab,
      q,
      city,
      barangay,
      categoryId,
      minPrice,
      maxPrice,
      minRating,
      acceptsEmergency,
      availableNow,
      sort,
      page,
    ],
  );

  const serviceResults = useQuery(
    () =>
      tab === "services"
        ? servicesApi.list({
            q: q || undefined,
            city: city || undefined,
            categoryId: categoryId || undefined,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
            sort: (sort === "price_asc" || sort === "price_desc"
              ? sort
              : "relevance") as string,
            page,
            limit: 12,
          })
        : Promise.resolve(null),
    [tab, q, city, categoryId, minPrice, maxPrice, sort, page],
  );

  const active = tab === "providers" ? providerResults : serviceResults;
  const flatCategories = useMemo(
    () => flatten(categories.data ?? []),
    [categories.data],
  );

  const appliedCount = [
    city,
    barangay,
    categoryId,
    minPrice,
    maxPrice,
    minRating,
    acceptsEmergency ? "1" : "",
    availableNow ? "1" : "",
  ].filter(Boolean).length;

  function toggleCompare(provider: ProviderSummary, next: boolean) {
    setCompared((current) =>
      next
        ? current.length < MAX_COMPARE
          ? [...current, provider]
          : current
        : current.filter((item) => item.id !== provider.id),
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <SearchBar
        q={q}
        city={city}
        onSubmit={(next) => setParams(next)}
      />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Filters: a rail on desktop, a disclosure on a phone. */}
        <div className="lg:w-64 lg:shrink-0">
          <Button
            variant="outline"
            className="h-10 w-full justify-between lg:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
            </span>
            {appliedCount ? (
              <span className="bg-accent text-accent-foreground rounded-4xl px-2 text-xs font-medium tabular-nums">
                {appliedCount}
              </span>
            ) : null}
          </Button>

          <div className={cn("mt-3 lg:mt-0 lg:block", !filtersOpen && "hidden")}>
            <Filters
              tab={tab}
              categories={flatCategories}
              values={{
                city,
                barangay,
                categoryId,
                minPrice,
                maxPrice,
                minRating,
                acceptsEmergency,
                availableNow,
              }}
              appliedCount={appliedCount}
              onChange={setParams}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              label="Search providers or services"
              segments={[
                { label: "Providers", value: "providers" as Tab },
                { label: "Services", value: "services" as Tab },
              ]}
              value={tab}
              onChange={(next) => {
                setTab(next);
                // The two tabs accept different sorts, so a sort carried
                // across would be rejected by the API.
                setParams({ tab: next, sort: null });
              }}
            />

            <div className="sm:w-52">
              <label htmlFor="sort" className="sr-only">
                Sort results
              </label>
              <Select
                id="sort"
                value={sort}
                onChange={(event) => setParams({ sort: event.target.value })}
              >
                {(tab === "providers" ? SORTS : SERVICE_SORTS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-5">
            {active.loading ? (
              <LoadingRows rows={4} />
            ) : active.error ? (
              <ErrorState error={active.error} onRetry={active.reload} />
            ) : !active.data?.items.length ? (
              <EmptyState
                icon={Search}
                title="Nothing matched that"
                description={
                  appliedCount || q
                    ? "Try fewer filters, a nearby city, or a broader word for the job."
                    : "No providers are listed yet."
                }
                action={
                  appliedCount || q ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() =>
                        router.push(tab === "services" ? "?tab=services" : "?")
                      }
                    >
                      Clear everything
                    </Button>
                  ) : undefined
                }
              />
            ) : tab === "providers" ? (
              <ul className="grid gap-5 sm:grid-cols-2">
                {providerResults.data?.items.map((provider) => (
                  <li key={provider.id}>
                    <ProviderCard
                      provider={provider}
                      compared={compared.some((item) => item.id === provider.id)}
                      compareDisabled={
                        compared.length >= MAX_COMPARE &&
                        !compared.some((item) => item.id === provider.id)
                      }
                      onCompareChange={(next) => toggleCompare(provider, next)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2">
                {serviceResults.data?.items.map((service) => (
                  <li key={service.id}>
                    <ServiceCard service={service} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <Pagination
              page={page}
              result={active.data}
              onPageChange={(next) => setParams({ page: String(next) }, true)}
              unit={tab === "providers" ? "provider" : "service"}
            />
          </div>
        </div>
      </div>

      <CompareTray
        providers={compared}
        onRemove={(id) =>
          setCompared((current) => current.filter((item) => item.id !== id))
        }
        onClear={() => setCompared([])}
      />
    </div>
  );
}

function SearchBar({
  q,
  city,
  onSubmit,
}: {
  q: string;
  city: string;
  onSubmit: (patch: Record<string, string | null>) => void;
}) {
  // Local state here, unlike the filters: typing should not push a history
  // entry per keystroke. It commits on submit.
  const [service, setService] = useState(q);
  const [where, setWhere] = useState(city);

  return (
    <form
      role="search"
      aria-label="Refine your search"
      className="border-foreground bg-card rounded-lg border-2 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ q: service.trim(), city: where.trim() });
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-[1.4]">
          <Label htmlFor="q" className="sr-only">
            What do you need done
          </Label>
          <Wrench
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="q"
            value={service}
            onChange={(event) => setService(event.target.value)}
            placeholder="Aircon cleaning, tubero, CCTV"
            className="h-12 rounded-md border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>

        <div className="bg-border h-px w-full shrink-0 sm:h-auto sm:w-px" aria-hidden />

        <div className="relative flex-1">
          <Label htmlFor="city" className="sr-only">
            Which city
          </Label>
          <Input
            id="city"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
            placeholder="Butuan, Cagayan de Oro"
            className="h-12 rounded-md border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </div>

        <Button type="submit" variant="accent" className="h-12 px-6 text-base">
          <Search aria-hidden />
          Search
        </Button>
      </div>
    </form>
  );
}

function Filters({
  tab,
  categories,
  values,
  appliedCount,
  onChange,
}: {
  tab: Tab;
  categories: { id: string; label: string }[];
  values: {
    city: string;
    barangay: string;
    categoryId: string;
    minPrice: string;
    maxPrice: string;
    minRating: string;
    acceptsEmergency: boolean;
    availableNow: boolean;
  };
  appliedCount: number;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  return (
    <div className="border-border space-y-5 rounded-lg border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-medium">Filters</h2>
        {appliedCount ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            onClick={() =>
              onChange({
                city: null,
                barangay: null,
                categoryId: null,
                minPrice: null,
                maxPrice: null,
                minRating: null,
                acceptsEmergency: null,
                availableNow: null,
              })
            }
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-category">Category</Label>
        <Select
          id="f-category"
          value={values.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="">Any category</option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-barangay">Barangay</Label>
        <Input
          id="f-barangay"
          defaultValue={values.barangay}
          onBlur={(event) => onChange({ barangay: event.target.value.trim() })}
          placeholder="Any barangay"
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">Price range</legend>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="f-min" className="sr-only">
              Lowest price
            </Label>
            <Input
              id="f-min"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={values.minPrice}
              onBlur={(event) => onChange({ minPrice: event.target.value })}
              placeholder="Min"
            />
          </div>
          <span className="text-muted-foreground text-sm" aria-hidden>
            –
          </span>
          <div className="flex-1">
            <Label htmlFor="f-max" className="sr-only">
              Highest price
            </Label>
            <Input
              id="f-max"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={values.maxPrice}
              onBlur={(event) => onChange({ maxPrice: event.target.value })}
              placeholder="Max"
            />
          </div>
        </div>
      </fieldset>

      {/* Rating and availability only narrow a provider search: a service
          listing carries neither. */}
      {tab === "providers" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="f-rating">Minimum rating</Label>
            <Select
              id="f-rating"
              value={values.minRating}
              onChange={(event) => onChange({ minRating: event.target.value })}
            >
              <option value="">Any rating</option>
              <option value="4.5">4.5 and up</option>
              <option value="4">4.0 and up</option>
              <option value="3">3.0 and up</option>
            </Select>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="mb-1.5 text-sm font-medium">Availability</legend>

            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={values.availableNow}
                onCheckedChange={(checked) =>
                  onChange({ availableNow: checked === true ? "true" : null })
                }
                className="mt-0.5"
              />
              <span>
                Open right now
                <span className="text-muted-foreground block text-xs">
                  Within their posted working hours
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={values.acceptsEmergency}
                onCheckedChange={(checked) =>
                  onChange({
                    acceptsEmergency: checked === true ? "true" : null,
                  })
                }
                className="mt-0.5"
              />
              <span>
                Takes emergencies
                <span className="text-muted-foreground block text-xs">
                  Same-day and after-hours callouts
                </span>
              </span>
            </label>
          </fieldset>
        </>
      ) : null}

      <p className="text-muted-foreground border-border border-t pt-4 text-xs">
        Every provider shown has had their ID and trade permits checked.{" "}
        <Link href="/#how-it-works" className="underline underline-offset-4">
          How verification works
        </Link>
      </p>
    </div>
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
