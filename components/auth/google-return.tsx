"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HOME_FOR_ROLE, useSession } from "@/lib/auth/session";

/**
 * The half-second between Google and the dashboard.
 *
 * The API has already set the refresh cookie by the time the browser lands
 * here; what it has not got is an access token, which lives in memory and
 * therefore did not survive the trip through Google. `refresh()` fetches one
 * and reads the session back, which is the same thing every new tab does.
 *
 * This page exists rather than redirecting straight to a dashboard because
 * the destination depends on the role, and the role is not known until that
 * call returns. Landing somewhere and bouncing would show a customer the
 * provider dashboard's loading state on the way past.
 */
export function GoogleReturn() {
  const router = useRouter();
  const { state, refresh } = useSession();

  // Effects run twice in development, and this one navigates.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    // replace, not push: Back should return to wherever they set off from,
    // not to a page that signs them in again.
    router.replace(HOME_FOR_ROLE[state.user.role]);
  }, [state, router]);

  /**
   * Derived, not stored. readSession never throws — it turns every failure
   * into an "error" state — so the session itself already says whether this
   * worked, and keeping a second copy in state would only let the two
   * disagree.
   */
  const failed = state.status === "anonymous" || state.status === "error";

  if (failed) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-heading text-xl font-semibold">
          That did not finish
        </h1>
        <p className="text-muted-foreground text-sm">
          Google signed you in, but FixItPH could not pick the session up. This
          is usually a connection that dropped at the wrong moment.
        </p>
        <Button asChild variant="accent">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <LoaderCircle
        className="text-muted-foreground size-6 animate-spin"
        aria-hidden
      />
      <p className="text-muted-foreground text-sm" role="status">
        Signing you in…
      </p>
    </div>
  );
}
