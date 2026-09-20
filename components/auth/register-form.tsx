"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
import { ConsentNotice } from "@/components/legal/consent";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { ApiError, auth } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { cn } from "cn";

type Role = "CUSTOMER" | "PROVIDER";

/** Mirrors the server's rules, so the first failure is not a round trip. */
const RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
];

export function RegisterForm() {
  const router = useRouter();
  const { refresh } = useSession();

  const [role, setRole] = useState<Role>("CUSTOMER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  /**
   * Set once the account exists and a code is out. Until it comes back there
   * is no session — the account is inert on the server — so the form becomes
   * the code step rather than navigating anywhere.
   */
  const [pending, setPending] = useState<{
    email: string;
    devCode?: string;
    codeTtlMinutes: number | null;
  } | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);
  const unmet = RULES.filter((r) => !r.test(password));

  /** Where somebody lands once their account is real. */
  async function finish() {
    await refresh();
    router.replace(role === "PROVIDER" ? "/provider/profile" : "/dashboard");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (unmet.length > 0) {
      setError({
        code: "WEAK_PASSWORD",
        message: "Your password does not meet the requirements yet.",
      });
      setFieldErrors(unmet.map((r) => r.label));
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setError(null);
    setFieldErrors([]);
    setSubmitting(true);

    try {
      const created = await auth.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Optional fields are omitted rather than sent empty: the API rejects
        // unknown and malformed values instead of ignoring them.
        ...(phone.trim() ? { phone: normalisePhone(phone) } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        role,
      });

      /**
       * No navigation yet. The account exists but is inert until the code
       * comes back, so sending them to a dashboard would land them on a page
       * that cannot load anything.
       */
      setSubmitting(false);
      setPending({
        email: created.email,
        devCode: created.devCode,
        codeTtlMinutes: created.codeTtlMinutes,
      });
    } catch (e) {
      setSubmitting(false);
      const next = describe(e);
      setError(next.banner);
      setFieldErrors(next.fields);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (pending) {
    return (
      <VerifyStep
        email={pending.email}
        devCode={pending.devCode}
        codeTtlMinutes={pending.codeTtlMinutes}
        onVerified={finish}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Signing up with Google creates a customer account. Becoming a
          provider stays a separate step, with its own profile and documents. */}
      <GoogleButton label="Sign up with Google" />
      <AuthDivider>or use your email</AuthDivider>

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="border-border bg-secondary rounded-md border px-4 py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2"
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

      {/* Role. A radiogroup rather than a select: there are two options and the
          difference between them matters. */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">I am signing up to</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "CUSTOMER",
                title: "Hire someone",
                body: "Post a job and compare quotes.",
              },
              {
                value: "PROVIDER",
                title: "Offer my services",
                body: "List your trade and take bookings.",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "border-border hover:border-foreground cursor-pointer rounded-md border-2 p-4 transition-colors",
                role === option.value && "border-foreground bg-secondary",
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                disabled={submitting}
                className="sr-only"
              />
              <span className="block font-semibold">{option.title}</span>
              <span className="text-muted-foreground mt-1 block text-sm">
                {option.body}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
            maxLength={100}
            disabled={submitting}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
            maxLength={100}
            disabled={submitting}
            className="h-11 text-base"
          />
        </div>
      </div>

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
          required
          disabled={submitting}
          className="h-11 text-base"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">
            Mobile number{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="phone"
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0917 123 4567"
            autoComplete="tel"
            disabled={submitting}
            aria-describedby="phone-hint"
            className="h-11 text-base"
          />
          <p id="phone-hint" className="text-muted-foreground text-xs">
            Used for booking updates. 09 or +63 both work.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">
            City{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            id="city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Butuan City"
            autoComplete="address-level2"
            disabled={submitting}
            className="h-11 text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={submitting}
            aria-describedby="password-rules"
            className="h-11 pr-11 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={submitting}
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

        <ul id="password-rules" className="mt-2 grid gap-1.5 sm:grid-cols-2">
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
                <Check
                  className={cn("size-3.5 shrink-0", !met && "opacity-30")}
                  aria-hidden
                />
                {rule.label}
                <span className="sr-only">{met ? " met" : " not met yet"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Creating the account is itself the agreement, so this is a statement
          rather than a checkbox. Booking flows use the checkbox instead. */}
      <ConsentNotice action="creating an account" />

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
            Creating your account
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="link-lime">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/** Accepts 09171234567, 0917 123 4567 or +639171234567 and sends E.164. */
function normalisePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+63")) return digits;
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return digits;
}

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
    case "ACCOUNT_EXISTS":
      return {
        banner: {
          code: e.code,
          message: `${e.message} Try signing in instead, or use a different address.`,
        },
        fields: [],
      };
    case "VALIDATION_ERROR":
      return {
        banner: { code: e.code, message: "Check the details below." },
        fields: e.errors ?? [],
      };
    case "RATE_LIMIT_EXCEEDED":
      return {
        banner: {
          code: e.code,
          message:
            "Too many sign up attempts from this device. Wait a few minutes and try again.",
        },
        fields: [],
      };
    default:
      return { banner: { code: e.code, message: e.message }, fields: [] };
  }
}

/** Matches the reset flow's cooldown, and the API's own resend window. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * The second half of signing up: proving the address exists.
 *
 * The account is already created but PENDING_VERIFICATION, which every
 * authenticated route refuses, so there is nothing to navigate to until the
 * code comes back. Kept on the same screen rather than emailing a link: a
 * code typed into the tab they are already in survives a webmail client that
 * rewrites links, and works on a phone where the mail app opens its own
 * browser.
 *
 * Deliberately the same shape as the password reset code step — the notice,
 * the six slots, the lock hint, the resend countdown. Somebody meeting a
 * six-digit code twice on one site should not have to work out twice what
 * they are looking at.
 */
function VerifyStep({
  email,
  devCode,
  codeTtlMinutes,
  onVerified,
}: {
  email: string;
  devCode?: string;
  codeTtlMinutes: number | null;
  onVerified: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  /** Set when the code is locked out, so the OTP input is disabled. */
  const [locked, setLocked] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);

  // Countdown for the resend link.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const showError = useCallback((e: unknown) => {
    const next = describe(e);
    setError(next.banner);
    setLocked(next.banner.code === "EMAIL_CODE_LOCKED");
    requestAnimationFrame(() => errorRef.current?.focus());
  }, []);

  /**
   * Fired by the input the moment six digits are in, so nobody has to find a
   * button after typing the last one.
   */
  const verify = useCallback(
    async (value: string) => {
      if (submitting || locked) return;

      setError(null);
      setSubmitting(true);
      try {
        await auth.verifyRegistration({ email, code: value });
        await onVerified();
      } catch (e) {
        showError(e);
        setCode("");
        setSubmitting(false);
      }
      // No finally: a success navigates away, and clearing the flag on a
      // unmounting form is a React warning for no benefit.
    },
    [email, locked, onVerified, showError, submitting],
  );

  async function resend() {
    if (submitting || cooldown > 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await auth.resendRegistrationCode(email);
      setCode("");
      setLocked(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      showError(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-border bg-secondary flex gap-3 rounded-md border px-4 py-3">
        <MailCheck
          className="text-brand-lime-ink mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <p className="text-sm leading-relaxed">
          A six digit code is on its way to{" "}
          <span className="font-medium">{email}</span>.
          {codeTtlMinutes ? <> It expires in {codeTtlMinutes} minutes.</> : null}{" "}
          Your account is not usable until you enter it.
        </p>
      </div>

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="border-border bg-secondary rounded-md border px-4 py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <p className="flex items-start gap-2 text-sm font-medium">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error.message}
          </p>
        </div>
      ) : null}

      {/* Development only: the API returns the code when there is no mailbox
          to send it to, so a local sign-up does not need one. */}
      {devCode ? (
        <p className="ring-foreground/10 text-muted-foreground rounded-md px-4 py-2.5 text-sm ring-1">
          Development: your code is{" "}
          <span className="text-foreground font-mono font-medium">
            {devCode}
          </span>
        </p>
      ) : null}

      <div className="space-y-3">
        {/* Not a <label for>: the control is six inputs, so the group gets a
            caption and the component labels each digit itself. */}
        <p id="signup-code-label" className="text-sm font-medium">
          Enter the code
        </p>
        <OtpInput
          length={6}
          value={code}
          onChange={setCode}
          onComplete={verify}
          status={error ? "error" : "idle"}
          disabled={submitting || locked}
          autoFocus
          aria-labelledby="signup-code-label"
          aria-describedby="signup-code-hint"
          // Themed to the design system rather than the component's own
          // hardcoded greys.
          className="text-foreground"
          slotClassName="bg-secondary border border-input focus-visible:ring-ring focus-visible:ring-2"
        />
        <p id="signup-code-hint" className="text-muted-foreground text-sm">
          {locked
            ? "This code is locked. Send a new one to try again."
            : "Five incorrect attempts will lock the code."}
        </p>
      </div>

      {submitting ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Checking the code
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to sign in
        </Link>

        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0 || submitting}
          className={cn(
            "rounded-sm",
            cooldown > 0 ? "text-muted-foreground" : "link-lime",
          )}
        >
          {cooldown > 0
            ? `Send another code in ${cooldown}s`
            : "Send another code"}
        </button>
      </div>
    </div>
  );
}
