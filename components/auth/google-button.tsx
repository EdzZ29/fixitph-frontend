"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/api/client";

/**
 * "Continue with Google".
 *
 * A full navigation, not a fetch. The whole point of the flow is that the
 * browser visits Google, and an XHR cannot carry somebody through a consent
 * screen. It also means the session cookie the API sets on the way back
 * arrives on a top-level request, where it is sent without argument.
 *
 * The button sets its busy state and does not clear it: the page is on its
 * way out, and a button that springs back to life while the browser is still
 * navigating invites a second click and a second round trip.
 */
export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const [leaving, setLeaving] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={leaving}
      aria-busy={leaving}
      className="h-12 w-full text-base"
      onClick={() => {
        setLeaving(true);
        window.location.href = auth.googleUrl();
      }}
    >
      <GoogleMark />
      {leaving ? "Taking you to Google" : label}
    </Button>
  );
}

/**
 * Google's mark, inline.
 *
 * Their brand guidelines require the four-colour G, and the colours are fixed
 * rather than themed for the same reason — so it stays recognisable in dark
 * mode, where a tinted version would not be their logo any more.
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="size-4.5" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** A labelled rule, so the two ways in read as alternatives rather than a list. */
export function AuthDivider({ children = "or" }: { children?: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs">{children}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
