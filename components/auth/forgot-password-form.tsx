"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { ApiError, auth } from "@/lib/api/client";
import { cn } from "cn";

type Step = "email" | "code" | "password";

const RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
];

/** How long before the "send another code" link becomes available again. */
const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [ttlMinutes, setTtlMinutes] = useState(10);
  const [cooldown, setCooldown] = useState(0);
  /** Set when the code is locked out, so the OTP input is disabled. */
  const [locked, setLocked] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const unmet = RULES.filter((r) => !r.test(password));

  // Countdown for the resend link.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const showError = useCallback((e: unknown) => {
    const next = describe(e);
    setError(next.banner);
    setFieldErrors(next.fields);
    setLocked(next.banner.code === "RESET_CODE_LOCKED");
    requestAnimationFrame(() => errorRef.current?.focus());
  }, []);

  // -- step 1 ---------------------------------------------------------------

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submitting) return;

    setError(null);
    setFieldErrors([]);
    setSubmitting(true);

    try {
      const result = await auth.forgotPassword(email.trim());
      setTtlMinutes(result.codeTtlMinutes ?? 10);
      setCode("");
      setLocked(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("code");

      // Outside production the API returns the code, because there is no mail
      // server locally. It is never present once NODE_ENV is production.
      if (result.devCode) {
        console.info(`[dev] password reset code: ${result.devCode}`);
      }
    } catch (e) {
      showError(e);
    } finally {
      setSubmitting(false);
    }
  }

  // -- step 2 ---------------------------------------------------------------

  const verifyCode = useCallback(
    async (value: string) => {
      if (submitting || locked) return;

      setError(null);
      setSubmitting(true);

      try {
        const result = await auth.verifyResetCode(email.trim(), value);
        setResetToken(result.resetToken);
        setStep("password");
      } catch (e) {
        showError(e);
        setCode("");
      } finally {
        setSubmitting(false);
      }
    },
    [email, locked, showError, submitting],
  );

  // -- step 3 ---------------------------------------------------------------

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (unmet.length > 0) {
      setError({ code: "WEAK_PASSWORD", message: "Your password does not meet the requirements yet." });
      setFieldErrors(unmet.map((r) => r.label));
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setError(null);
    setFieldErrors([]);
    setSubmitting(true);

    try {
      await auth.resetPassword(resetToken, password);
      router.replace("/login?reset=1");
    } catch (e) {
      setSubmitting(false);
      showError(e);
    }
  }

  // -------------------------------------------------------------------------

  const banner = error ? (
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
  ) : null;

  if (step === "email") {
    return (
      <form onSubmit={requestCode} noValidate className="space-y-5">
        {banner}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
            disabled={submitting}
            className="h-11 text-base"
          />
          <p className="text-muted-foreground text-sm">
            We will send a six digit code to this address if it has an account.
          </p>
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
              Sending the code
            </>
          ) : (
            "Send code"
          )}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Remembered it?{" "}
          <Link href="/login" className="link-lime">
            Back to sign in
          </Link>
        </p>
      </form>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-5">
        <div className="border-border bg-secondary flex gap-3 rounded-md border px-4 py-3">
          <MailCheck className="text-brand-lime-ink mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            If <span className="font-medium">{email}</span> has an account, a six
            digit code is on its way. It expires in {ttlMinutes} minutes.
          </p>
        </div>

        {banner}

        <div className="space-y-3">
          {/* Not a <label for>: the control is six inputs, so the group gets a
              caption and the component labels each digit itself. */}
          <p id="code-label" className="text-sm font-medium">
            Enter the code
          </p>
          <OtpInput
            length={6}
            value={code}
            onChange={setCode}
            onComplete={verifyCode}
            status={error ? "error" : "idle"}
            disabled={submitting || locked}
            autoFocus
            aria-labelledby="code-label"
            aria-describedby="code-hint"
            // Themed to the design system rather than the component's own
            // hardcoded greys.
            className="text-foreground"
            slotClassName="bg-secondary border border-input focus-visible:ring-ring focus-visible:ring-2"
          />
          <p id="code-hint" className="text-muted-foreground text-sm">
            {locked
              ? "This code is locked. Send a new one to try again."
              : "Three incorrect attempts will lock the code."}
          </p>
        </div>

        {submitting ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Checking the code
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
              setCode("");
              setLocked(false);
            }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Use a different email
          </button>

          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={cooldown > 0 || submitting}
            className={cn(
              "rounded-sm",
              cooldown > 0 ? "text-muted-foreground" : "link-lime",
            )}
          >
            {cooldown > 0 ? `Send another code in ${cooldown}s` : "Send another code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitPassword} noValidate className="space-y-5">
      <div className="border-border bg-secondary flex gap-3 rounded-md border px-4 py-3">
        <Check className="text-brand-lime-ink mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm leading-relaxed">
          Code confirmed. Choose a new password for{" "}
          <span className="font-medium">{email}</span>.
        </p>
      </div>

      {banner}

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            required
            disabled={submitting}
            aria-describedby="new-password-rules"
            className="h-11 pr-11 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={submitting}
            aria-pressed={showPassword}
            aria-controls="new-password"
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

        <ul id="new-password-rules" className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  met ? "text-brand-lime-ink" : "text-muted-foreground",
                )}
              >
                <Check className={cn("size-3.5 shrink-0", !met && "opacity-30")} aria-hidden />
                {rule.label}
                <span className="sr-only">{met ? " met" : " not met yet"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-muted-foreground text-sm">
        Changing your password signs you out everywhere else.
      </p>

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
            Updating your password
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}

function describe(e: unknown): {
  banner: { message: string; code: string };
  fields: string[];
} {
  if (!(e instanceof ApiError)) {
    return {
      banner: {
        code: "NETWORK_ERROR",
        message: "Could not reach FixItPH. Check your connection and try again.",
      },
      fields: [],
    };
  }

  switch (e.code) {
    case "RESET_CODE_LOCKED":
      return {
        banner: {
          code: e.code,
          message:
            "Too many incorrect codes. This code is now locked. Send a new one to try again.",
        },
        fields: [],
      };
    case "RESET_CODE_EXPIRED":
      return {
        banner: { code: e.code, message: "That code has expired. Send a new one." },
        fields: [],
      };
    case "RESET_CODE_ALREADY_USED":
      return {
        banner: {
          code: e.code,
          message: "That code has already been used. Send a new one.",
        },
        fields: [],
      };
    case "INVALID_RESET_CODE":
      // The API counts down the remaining attempts, which is worth showing.
      return { banner: { code: e.code, message: e.message }, fields: [] };
    case "INVALID_RESET_TOKEN":
      return {
        banner: {
          code: e.code,
          message: "That reset session has expired. Start again from your email address.",
        },
        fields: [],
      };
    case "PASSWORD_UNCHANGED":
      return {
        banner: {
          code: e.code,
          message: "Choose a password you have not used on this account before.",
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
