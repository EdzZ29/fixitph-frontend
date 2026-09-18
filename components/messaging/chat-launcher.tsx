"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessagesSquare, X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  ConversationList,
  threadKey,
} from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { messages, type MessageThreadRow } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { useQuery } from "@/lib/use-query";

/**
 * The chat bubble in the corner, and what opens out of it.
 *
 * Messaging used to live only inside a booking, which meant a customer had to
 * remember which job a conversation belonged to and navigate back into it to
 * reply. This follows them around the site instead — including the public
 * pages, where somebody is often comparing providers while waiting on an
 * answer from one of them.
 *
 * Two views in one panel, the way a phone does it: the list of conversations,
 * and one conversation with a way back. No routing, because opening a chat
 * should not lose the page somebody is reading.
 */
export function ChatLauncher() {
  const { state } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MessageThreadRow | null>(null);

  const signedIn = state.status === "authenticated";

  /**
   * The unread count is polled by the live query layer already — it refetches
   * when the change feed reports a message, and when the tab regains focus.
   * Asking only while signed in keeps it off every anonymous page view.
   */
  const unread = useQuery(
    () => (signedIn ? messages.unreadCount() : Promise.resolve({ unread: 0 })),
    [signedIn],
  );

  const threads = useQuery(
    () =>
      signedIn && open
        ? messages.threads()
        : Promise.resolve<MessageThreadRow[]>([]),
    [signedIn, open],
  );

  // Escape closes the panel, or steps back out of a conversation first.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (active) setActive(null);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active]);

  // Nothing for a visitor who is not signed in: there is no inbox to show.
  if (!signedIn) return null;

  // And nothing on the page that already is the inbox — a bubble floating
  // over a full-size copy of itself is just something in the way.
  if (pathname.endsWith("/messages")) return null;

  const count = unread.data?.unread ?? 0;

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Messages"
          className="bg-background ring-foreground/10 fixed right-4 bottom-4 z-50 flex h-[min(34rem,calc(100dvh-2rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl shadow-2xl ring-1"
        >
          <header className="border-border flex items-center gap-2 border-b px-3 py-2.5">
            {active ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to conversations"
                onClick={() => setActive(null)}
              >
                <ArrowLeft aria-hidden />
              </Button>
            ) : (
              <MessagesSquare
                className="text-muted-foreground ml-1 size-4"
                aria-hidden
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="font-heading truncate text-sm font-medium">
                {active ? active.counterpartyName : "Messages"}
              </p>
              {active ? (
                <p className="text-muted-foreground truncate text-xs">
                  {active.title}
                  {active.reference ? (
                    <span className="font-mono"> · {active.reference}</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Close messages"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden />
            </Button>
          </header>

          {active ? (
            <MessageThread
              key={threadKey(active)}
              bookingId={active.bookingId ?? undefined}
              serviceRequestId={active.serviceRequestId ?? undefined}
              counterpartyName={active.counterpartyName}
              reference={active.reference}
              variant="panel"
              showHeader={false}
              onRead={() => {
                unread.reload();
                threads.reload();
              }}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConversationList
                threads={threads.data}
                loading={threads.loading}
                error={threads.error}
                onRetry={threads.reload}
                onSelect={setActive}
              />
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
        className={cn(
          "bg-accent text-accent-foreground focus-visible:ring-ring/50 fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none",
          open && "pointer-events-none opacity-0",
        )}
      >
        <MessagesSquare className="size-6" aria-hidden />
        {count > 0 ? (
          <span className="bg-foreground text-background absolute -top-0.5 -right-0.5 min-w-5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
    </>
  );
}
