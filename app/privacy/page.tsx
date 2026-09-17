import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { privacyDocument } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FixItPH collects, uses, shares, and protects personal information, and your rights under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "FixItPH Privacy Policy",
    description:
      "What personal information FixItPH collects, why, who it is shared with, and the rights you have over it.",
    type: "article",
    locale: "en_PH",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <LegalDocumentView
          document={privacyDocument}
          counterpart={{ href: "/terms", label: "our Terms and Conditions" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
