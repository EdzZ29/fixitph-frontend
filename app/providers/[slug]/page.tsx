import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ProviderProfileView } from "@/components/search/provider-profile";

export async function generateMetadata({
  params,
}: PageProps<"/providers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // Built from the slug rather than by fetching: the page itself is client
  // rendered behind a session, and a second server fetch here would double
  // the load on every crawl for a title we can already infer.
  const name = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: name,
    description: `Rates, ratings and verified credentials for ${name} on FixItPH. See what they charge before you message anyone.`,
  };
}

export default async function ProviderProfilePage({
  params,
}: PageProps<"/providers/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
          <ProviderProfileView slug={slug} />
      </main>
      <SiteFooter />
    </>
  );
}
