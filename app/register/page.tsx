import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a free FixItPH account to post a job, compare quotes, and book verified local service providers across Northern Mindanao and Caraga.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your FixItPH account"
      lead="Free for customers. Post a job, compare quotes, and keep every booking in one place."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="link-lime">
            Sign in
          </Link>
          .
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
