import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to FixItPH to post a job, compare quotes, and manage your bookings across Northern Mindanao and Caraga.",
  // A sign in screen has nothing to offer a search engine, and indexing one
  // only creates a phishing-adjacent result to impersonate.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in to FixItPH"
      lead="Post a job, compare quotes, and keep every booking in one place."
      footer={
        <p>
          New here?{" "}
          <Link href="/register" className="link-lime">
            Create an account
          </Link>
          . It is free for customers.
        </p>
      }
    >
      {/* useSearchParams needs a boundary so the rest of the page can still be
          prerendered. */}
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-28 rounded" />
        <div className="bg-muted h-11 rounded-md" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="bg-muted h-11 rounded-md" />
      </div>
      <div className="bg-muted h-12 rounded-md" />
    </div>
  );
}
