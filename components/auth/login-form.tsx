"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, auth } from "@/lib/api/client";

/** Where to land after signing in, per role. */
const HOME_FOR_ROLE: Record<string, string> = {
  CUSTOMER: "/",
  PROVIDER: "/provider",
  ADMIN: "/admin",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const errorRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Only ever an internal path. A `next` of https://evil.example.com would
  // otherwise turn this form into an open redirect.
  const nextPath = safeInternalPath(params.get("next"));
  const justRegistered = params.get("registered") === "1";
  const sessionExpired = params.get("expired") === "1";
  const passwordReset = params.get("reset") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setFieldErrors([]);
    setSubmitting(true);

    try {
      await auth.login(email.trim(), password);
      const me = await auth.me();
      router.replace(nextPath ?? HOME_FOR_ROLE[me.role] ?? "/");
      // Not resetting `submitting`: the button stays busy through navigation
      // rather than flickering back to "Sign in" on a page that is leaving.
      router.refresh();
    } catch (e) {
      setSubmitting(false);
      const next = describe(e);
      setError(next.banner);
      setFieldErrors(next.fields);
      // Move focus to the message so a screen reader reaches it immediately.
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  const invalidCredentials = error?.code === "INVALID_CREDENTIALS";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {justRegistered && !error ? (
        <p className="border-border bg-secondary rounded-md border px-4 py-3 text-sm">
          Your account is ready. Sign in to finish setting up.
        </p>
      ) : null}

      {passwordReset && !error ? (
        <p className="border-border bg-secondary rounded-md border px-4 py-3 text-sm">
          Your password has been updated. Sign in with your new password.
        </p>
      ) : null}

      {sessionExpired && !error ? (
        <p className="border-border bg-secondary rounded-md border px-4 py-3 text-sm">
          You were signed out because the session expired. Please sign in again.
        </p>
      ) : null}

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="border-destructive/70 bg-destructive/5 text-destructive rounded-md border px-4 py-3 focus-visible:outline-destructive focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <p className="flex items-start gap-2 text-sm font-medium">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error.message}
          </p>
          {fieldErrors.length > 0 ? (
            <ul className="mt-2 ml-6 list-disc space-y-1 text-sm">
              {fieldErrors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          ref={emailRef}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          required
          disabled={submitting}
          aria-invalid={invalidCredentials || undefined}
          className="h-11 text-base"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="link-lime text-sm">
            Forgot password?
          </Link>
        </div>

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
            aria-invalid={invalidCredentials || undefined}
            className="h-11 pr-11 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={submitting}
            // aria-pressed, not a label swap: the control is the same control
            // whether the password is visible or not.
            aria-pressed={showPassword}
            aria-controls="password"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-4.5" aria-hidden />
            ) : (
              <Eye className="size-4.5" aria-hidden />
            )}
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Checkbox id="stay" name="stay" defaultChecked disabled={submitting} />
        <Label htmlFor="stay" className="text-muted-foreground font-normal">
          Keep me signed in on this device
        </Label>
      </div>

      <Button
        type="submit"
        variant="accent"
        disabled={submitting}
        aria-busy={submitting}
        className="h-12 w-full text-base"
      >
        {submitting ? (
          <>
            <LoaderCircle className="size-4.5 animate-spin" aria-hidden />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

/**
 * Turns an API failure into something worth reading. The server's codes are
 * stable; its messages are written for developers, so a few are rewritten here
 * where a person can actually act on the difference.
 */
function describe(e: unknown): {
  banner: { message: string; code: string };
  fields: string[];
} {
  if (!(e instanceof ApiError)) {
    return {
      banner: {
        code: "NETWORK_ERROR",
        message:
          "Could not reach FixItPH. Check your connection and try again.",
      },
      fields: [],
    };
  }

  switch (e.code) {
    case "INVALID_CREDENTIALS":
      return {
        banner: {
          code: e.code,
          message: "That email and password do not match an account.",
        },
        fields: [],
      };

    case "ACCOUNT_LOCKED":
      return {
        banner: { code: e.code, message: lockoutMessage(e.message) },
        fields: [],
      };

    case "ACCOUNT_SUSPENDED":
      return {
        banner: {
          code: e.code,
          message:
            "This account is suspended. Email hello@fixitph.com if you think that is a mistake.",
        },
        fields: [],
      };

    case "ACCOUNT_DEACTIVATED":
      return {
        banner: {
          code: e.code,
          message: "This account has been deactivated and cannot sign in.",
        },
        fields: [],
      };

    case "RATE_LIMIT_EXCEEDED":
      return {
        banner: {
          code: e.code,
          message: "Too many attempts from this device. Wait a few minutes and try again.",
        },
        fields: [],
      };

    case "VALIDATION_ERROR":
      return {
        banner: { code: e.code, message: "Check the details below." },
        fields: e.errors ?? [],
      };

    default:
      return { banner: { code: e.code, message: e.message }, fields: [] };
  }
}

/**
 * The API reports lockout as an ISO timestamp, which is accurate and useless
 * to read. Turn it into a duration.
 */
function lockoutMessage(raw: string): string {
  const match = /(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/.exec(raw);
  if (!match) return "Too many failed attempts. Try again in a few minutes.";

  const minutes = Math.ceil((Date.parse(match[1]) - Date.now()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "Too many failed attempts. You can try again now.";
  }
  if (minutes === 1) {
    return "Too many failed attempts. Try again in about a minute.";
  }
  return `Too many failed attempts. Try again in about ${minutes} minutes.`;
}

/**
 * Accepts only a same-origin path. Anything protocol-relative or absolute is
 * dropped, so `?next=//evil.example.com` cannot redirect off the site.
 */
function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}
