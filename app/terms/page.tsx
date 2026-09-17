import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { termsDocument } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "The terms that govern use of FixItPH, the marketplace connecting customers with independent local service providers across Northern Mindanao and Caraga.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "FixItPH Terms and Conditions",
    description:
      "What FixItPH does, what it does not do, and what is expected of customers and service providers.",
    type: "article",
    locale: "en_PH",
  },
  // Unlike the sign in screen, these are meant to be found.
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <LegalDocumentView
          document={termsDocument}
          counterpart={{ href: "/privacy", label: "our Privacy Policy" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
