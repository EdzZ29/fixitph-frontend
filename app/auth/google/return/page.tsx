import type { Metadata } from "next";

import { GoogleReturn } from "@/components/auth/google-return";

export const metadata: Metadata = {
  title: "Signing you in",
  // Nothing here is worth indexing, and it only ever renders mid-redirect.
  robots: { index: false, follow: false },
};

export default function GoogleReturnPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <GoogleReturn />
    </main>
  );
}
