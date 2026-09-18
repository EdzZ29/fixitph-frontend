import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SearchView } from "@/components/search/search-view";
import { LoadingRows } from "@/components/dashboard/states";

export const metadata: Metadata = {
  title: "Find a provider",
  description:
    "Search verified plumbers, electricians, aircon technicians and computer repair across Northern Mindanao and Caraga. Compare rates and ratings before you message anyone.",
};

export default function SearchPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* SearchView reads its filters from the URL, so it needs a boundary. */}
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
              <LoadingRows rows={4} />
            </div>
          }
        >
            <SearchView />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
