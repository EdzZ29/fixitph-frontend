"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { ActionError } from "@/components/dashboard/states";
import { ApiError, auth } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Step one of verification: proving the email address reaches you.
 *
 * This is the only badge a provider can earn without an administrator, which
 * is why it is worth doing well — it is the first thing on the screen and the
 * only part of verification that finishes in under a minute.
 *
 * The state here is deliberately derived from the API rather than kept
 * locally. A code that is still live survives a reload, a closed tab, or the
 * provider coming back tomorrow, so `codePending` decides whether to show the
 * "send" button or the code entry. Keeping that in component state would ask
 * somebody who already has a code in their inbox to request a second one.
 */

/** Matches EMAIL_RESEND_COOLDOWN_SECONDS on the API. */
const RESEND_COOLDOWN_SECONDS = 60;

interface Status {
  email: string;
  verified: boolean;
  verifiedAt: string | null;
  codePending: boolean;
}

export function EmailStep({ onVerified }: { onVerified?: () => void }) {
  const user = useCurrentUser();
  const { data, loading, reload } = useQuery(() => auth.emailStatus(), []);

  /**
   * What this component has changed since the last fetch, layered over it.
   *
   * Sending or confirming knows the new state immediately, and waiting for a
   * refetch to show it would leave the six boxes a second behind the button
   * that summoned them.
   */
  const [override, setOverride] = useState<Partial<Status>>({});

  const status: Status | null =
    data || !loading
      ? {
          // The session already knows the address, so a failed status read
          // still renders something the provider can act on.
          email: data?.email ?? user.email,
          verified: data?.verified ?? user.emailVerifiedAt !== null,
          verifiedAt: data?.verifiedAt ?? user.emailVerifiedAt,
          codePending: data?.codePending ?? false,
          ...override,
        }
      : null;

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  /** Set by EMAIL_CODE_LOCKED, so the entry stops taking guesses. */
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await auth.sendEmailCode();
      setCode("");
      setLocked(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice(result.message);
      setOverride((o) => ({ ...o, codePending: true }));

      // No mail server locally, so outside production the API hands the code
      // back. It is never present once NODE_ENV is production.
      if (result.devCode) {
        console.info(`[dev] email verification code: ${result.devCode}`);
      }
    } catch (thrown) {
      if (
        thrown instanceof ApiError &&
        thrown.code === "EMAIL_ALREADY_VERIFIED"
      ) {
        setOverride((o) => ({ ...o, verified: true, codePending: false }));
        reload();
        onVerified?.();
      } else {
        setError(describe(thrown));
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirm(value: string) {
    if (busy || locked) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await auth.confirmEmail(value);
      setOverride((o) => ({
        ...o,
        verified: true,
        verifiedAt: result.verifiedAt,
        codePending: false,
      }));
      onVerified?.();
    } catch (thrown) {
      if (thrown instanceof ApiError) {
        setLocked(thrown.code === "EMAIL_CODE_LOCKED");
        if (
          thrown.code === "EMAIL_CODE_EXPIRED" ||
          thrown.code === "EMAIL_CODE_NOT_REQUESTED"
        ) {
          // The code is gone, so put the send button back rather than
          // leaving six boxes that cannot succeed.
          setOverride((o) => ({ ...o, codePending: false }));
          setCooldown(0);
        }
      }
      setError(describe(thrown));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return (
      <StepShell done={false}>
        <p className="text-muted-foreground text-sm">
          Checking your email address…
        </p>
      </StepShell>
    );
  }

  if (status.verified) {
    return (
      <StepShell done>
        <p className="text-sm">
          <span className="font-medium">{status.email}</span> is confirmed
          {status.verifiedAt ? ` — ${formatDate(status.verifiedAt)}` : ""}.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          That earns the Email Verified badge. The remaining checks are done by
          an administrator.
        </p>
      </StepShell>
    );
  }

  return (
    <StepShell done={false}>
      <p className="text-muted-foreground text-sm">
        We send a six digit code to{" "}
        <span className="text-foreground font-medium">{status.email}</span>. It
        proves the address reaches you, and it is what earns the Email Verified
        badge.
      </p>

      {status.codePending ? (
        <div className="mt-4 space-y-3">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={(value) => void confirm(value)}
            disabled={busy || locked}
            status={error ? "error" : "idle"}
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button
              type="button"
              variant="accent"
              onClick={() => void confirm(code)}
              disabled={busy || locked || code.length !== 6}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Confirm
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => void send()}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0
                ? `Send another in ${cooldown}s`
                : "Send another code"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="accent"
          size="lg"
          className="mt-4"
          onClick={() => void send()}
          disabled={busy || cooldown > 0}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Mail aria-hidden />
          )}
          {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the code"}
        </Button>
      )}

      <ActionError message={error} />

      {notice && !error ? (
        <p className="text-muted-foreground mt-3 text-center text-sm">
          {notice}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-3 text-xs">
        Nothing in the inbox after a minute? Check spam, then send another code.
      </p>
    </StepShell>
  );
}

function StepShell({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <StepNumber done={done}>1</StepNumber>
        Confirm your email
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function StepNumber({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        done
          ? "bg-accent text-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          : "bg-foreground/5 text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      }
      aria-hidden
    >
      {done ? <BadgeCheck className="size-3.5" /> : children}
    </span>
  );
}

/** The API's message is written for the person reading it, so prefer it. */
function describe(thrown: unknown): string {
  if (thrown instanceof ApiError) {
    return thrown.message || "That did not work. Try again.";
  }
  return "We could not reach FixItPH. Check your connection and try again.";
}
