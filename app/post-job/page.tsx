import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PostJobForm } from "@/components/search/post-job-form";
import { LoadingRows } from "@/components/dashboard/states";

export const metadata: Metadata = {
  title: "Post a job",
  description:
    "Describe what needs fixing and let verified providers near you quote for it. Free, and you are not committed to anything.",
  robots: { index: false, follow: true },
};

export default function PostJobPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {/* The form reads providerId and serviceId from the query. */}
          <Suspense fallback={<LoadingRows rows={4} />}>
              <PostJobForm />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
