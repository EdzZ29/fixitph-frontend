import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description:
    "Reset your FixItPH password using a six digit code sent to your email address.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lead="We will email you a six digit code. It expires in a few minutes and can only be used once."
      footer={
        <p>
          Need help?{" "}
          <Link href="/help" className="link-lime">
            Contact support
          </Link>
          .
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
