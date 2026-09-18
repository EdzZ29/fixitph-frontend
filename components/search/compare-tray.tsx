"use client";

import Link from "next/link";
import { BadgeCheck, Scale, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProviderSummary } from "@/lib/api/client";
import { money, plural } from "@/lib/format";

/**
 * The compare tray: "Compare Services" in the journey.
 *
 * A docked strip rather than a separate page, because comparing is something
 * you do *while* browsing — leaving the results to see a comparison, then
 * coming back to change one of the three, is the version of this that nobody
 * uses. Picking a provider adds a column; the table opens over the page.
 *
 * Capped at three by the caller. Beyond that the columns stop being readable
 * on a phone, which is where most of this traffic is.
 */
export function CompareTray({
  providers,
  onRemove,
  onClear,
}: {
  providers: ProviderSummary[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (!providers.length) return null;

  return (
    <div className="sticky bottom-0 z-40 -mx-4 mt-8 lg:-mx-8">
      <div className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 border-t backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Scale className="size-4" aria-hidden />
              Comparing {providers.length}
            </p>

            <ul className="flex flex-wrap gap-1.5">
              {providers.map((provider) => (
                <li key={provider.id}>
                  <span className="bg-secondary flex items-center gap-1 rounded-4xl py-1 pr-1 pl-2.5 text-sm">
                    <span className="max-w-40 truncate">
                      {provider.businessName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(provider.id)}
                      className="hover:bg-background rounded-full p-0.5"
                      aria-label={`Remove ${provider.businessName} from the comparison`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={onClear}
            >
              Clear
            </Button>
          </div>

          {providers.length > 1 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-md border-collapse text-sm">
                <caption className="sr-only">
                  Side-by-side comparison of the selected providers
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="sr-only">
                      Detail
                    </th>
                    {providers.map((provider) => (
                      <th
                        key={provider.id}
                        scope="col"
                        className="border-border border-b px-2 pb-2 text-left font-medium"
                      >
                        <Link
                          href={`/providers/${provider.slug}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {provider.businessName}
                        </Link>
                        {provider.verificationStatus === "APPROVED" ? (
                          <BadgeCheck
                            className="text-brand-lime-ink ml-1 inline size-3.5 align-[-2px]"
                            aria-label="Verified"
                          />
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Rating"
                    providers={providers}
                    render={(provider) =>
                      provider.ratingCount > 0
                        ? `${Number(provider.ratingAvg).toFixed(1)} ★ (${provider.ratingCount})`
                        : "No reviews"
                    }
                  />
                  <Row
                    label="Jobs done"
                    providers={providers}
                    render={(provider) =>
                      provider.completedJobsCount.toLocaleString("en-PH")
                    }
                  />
                  <Row
                    label="Based in"
                    providers={providers}
                    render={(provider) =>
                      [provider.baseBarangay, provider.baseCity]
                        .filter(Boolean)
                        .join(", ")
                    }
                  />
                  <Row
                    label="From"
                    providers={providers}
                    render={(provider) => {
                      const priced = (provider.services ?? []).filter(
                        (s) => s.pricingType !== "QUOTE_REQUIRED" && s.price,
                      );
                      if (!priced.length) return "Quote only";
                      return money(
                        priced.reduce((low, s) =>
                          Number(s.price) < Number(low.price) ? s : low,
                        ).price,
                      );
                    }}
                  />
                  <Row
                    label="Listings"
                    providers={providers}
                    render={(provider) =>
                      plural(provider.services?.length ?? 0, "service")
                    }
                  />
                  <Row
                    label="Payment"
                    providers={providers}
                    render={(provider) =>
                      provider.paymentMethods.length
                        ? provider.paymentMethods
                            .map((m) => m.replace(/_/g, " ").toLowerCase())
                            .join(", ")
                        : "Not stated"
                    }
                  />
                  <Row
                    label="Taking work"
                    providers={providers}
                    render={(provider) =>
                      provider.isAcceptingBookings ? "Yes" : "Paused"
                    }
                  />
                  <tr>
                    <th scope="row" className="sr-only">
                      Actions
                    </th>
                    {providers.map((provider) => (
                      <td key={provider.id} className="px-2 pt-3">
                        <Button asChild variant="accent" size="sm">
                          <Link href={`/post-job?providerId=${provider.id}`}>
                            Request a quote
                          </Link>
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">
              Pick one more to see them side by side.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  providers,
  render,
}: {
  label: string;
  providers: ProviderSummary[];
  render: (provider: ProviderSummary) => string;
}) {
  return (
    <tr className="border-border/60 border-b last:border-0">
      <th
        scope="row"
        className="text-muted-foreground py-2 pr-3 text-left font-normal whitespace-nowrap"
      >
        {label}
      </th>
      {providers.map((provider) => (
        <td key={provider.id} className="px-2 py-2">
          {render(provider)}
        </td>
      ))}
    </tr>
  );
}
