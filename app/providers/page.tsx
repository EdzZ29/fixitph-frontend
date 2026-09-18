import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SearchView } from "@/components/search/search-view";
import { LoadingRows } from "@/components/dashboard/states";

export const metadata: Metadata = {
  title: "All providers",
  description:
    "Every verified provider on FixItPH, filterable by city, barangay, category, price and rating.",
};

/**
 * The same view as /search. Two URLs because they are two intents — "I know
 * what I need doing" and "show me who is out there" — and both are things
 * people link to.
 */
export default function ProvidersPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
              <LoadingRows rows={4} />
            </div>
          }
        >
            <SearchView initialTab="providers" />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
