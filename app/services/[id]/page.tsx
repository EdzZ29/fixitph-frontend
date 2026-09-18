import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ServiceDetailView } from "@/components/search/service-detail";

export const metadata: Metadata = {
  title: "Service details",
  description:
    "What the job covers, what it costs, and who does it. Rates are shown before you message anyone.",
};

export default async function ServiceDetailPage({
  params,
}: PageProps<"/services/[id]">) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
          <ServiceDetailView serviceId={id} />
      </main>
      <SiteFooter />
    </>
  );
}
