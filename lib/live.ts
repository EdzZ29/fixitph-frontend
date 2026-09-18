"use client";

import { events } from "@/lib/api/client";
import { mightBeSignedIn } from "@/lib/auth/session-hint";

/**
 * One connection to the API's change feed, shared by every screen.
 *
 * The API says only that a kind of thing changed — "bookings", "messages" —
 * and never what changed or whose it was. Pages react by refetching through
 * the endpoints they already use, which are scoped to whoever is asking. That
 * is the point: a live update cannot show somebody data they could not have
 * asked for, because it is their own request that fetches it.
 *
 * One EventSource for the whole tab, not one per screen. A dashboard has
 * several lists open at once and each would otherwise hold its own
 * connection, against a browser limit of six per origin.
 */

export type ChangeResource =
  | "bookings"
  | "categories"
  | "disputes"
  | "messages"
  | "notifications"
  | "providers"
  | "quotes"
  | "reports"
  | "requests"
  | "reviews"
  | "services"
  | "settings"
  | "users"
  | "verification";

type Listener = (resource: ChangeResource) => void;

interface Frame {
  kind: "change" | "ping";
  resource?: ChangeResource;
}

const listeners = new Set<Listener>();

let source: EventSource | null = null;
let connecting = false;
/** Consecutive failures, for the backoff. */
let attempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Backoff between reconnections.
 *
 * EventSource retries on its own, but it retries the same URL — and that URL
 * carries a ticket that is good for sixty seconds, so its retry is guaranteed
 * to fail once the ticket lapses. So the connection is managed here instead:
 * closed on error, and reopened with a ticket fetched fresh.
 */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

function backoff(): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

function clearRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

async function connect(): Promise<void> {
  if (source || connecting || !listeners.size) return;
  if (typeof window === "undefined" || !("EventSource" in window)) return;

  /**
   * A ticket needs a session. A signed-out visitor simply has no stream, and
   * falls back to refetching when the tab is focused — which is the whole of
   * what a public page needs, since nobody is waiting on a message there.
   */
  if (!mightBeSignedIn()) return;

  connecting = true;
  try {
    const { ticket } = await events.ticket();
    if (!listeners.size) return;

    const stream = new EventSource(events.streamUrl(ticket));
    source = stream;

    stream.onopen = () => {
      attempts = 0;
    };

    stream.onmessage = (message: MessageEvent<string>) => {
      let frame: Frame;
      try {
        frame = JSON.parse(message.data) as Frame;
      } catch {
        return;
      }
      if (frame.kind !== "change" || !frame.resource) return;

      const resource = frame.resource;
      listeners.forEach((listener) => listener(resource));
    };

    stream.onerror = () => {
      // Managed here rather than left to the browser, for the reason above.
      stream.close();
      if (source === stream) source = null;
      attempts += 1;
      scheduleReconnect();
    };
  } catch {
    attempts += 1;
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

function scheduleReconnect(): void {
  if (retryTimer || !listeners.size) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connect();
  }, backoff());
}

function disconnect(): void {
  clearRetry();
  source?.close();
  source = null;
  attempts = 0;
}

/**
 * A tab nobody is looking at does not need a live connection, and on a phone
 * it is a connection the browser will close anyway. It reopens on return, and
 * the queries revalidate then too, so nothing is missed by having been away.
 */
function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    disconnect();
  } else {
    void connect();
  }
}

/** Returns an unsubscribe function. */
export function onChange(listener: Listener): () => void {
  listeners.add(listener);

  if (listeners.size === 1 && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  void connect();

  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      disconnect();
    }
  };
}

/** Used after signing in or out, when the session behind the stream changed. */
export function resetLiveConnection(): void {
  disconnect();
  if (listeners.size) void connect();
}
