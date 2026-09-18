"use client";

import { useState } from "react";
import { MessagesSquare } from "lucide-react";

import { PageHeader } from "@/components/dashboard/states";
import {
  ConversationList,
  threadKey,
} from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { messages, type MessageThreadRow } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";

/**
 * The full conversation page: the list on the left, the thread on the right.
 *
 * The same two views as the corner bubble, given room. On a phone it is one
 * at a time — picking a conversation replaces the list, and a back button
 * returns to it — because a 24rem sidebar next to a thread is unusable at
 * that width.
 */
export function ConversationsView() {
  const threads = useQuery(() => messages.threads(), []);
  const [active, setActive] = useState<MessageThreadRow | null>(null);

  // The first conversation, once there is one, so the pane is never empty on
  // a wide screen. Derived, so it follows the list rather than going stale.
  const shown =
    (active && threads.data?.find((t) => threadKey(t) === threadKey(active))) ??
    active ??
    threads.data?.[0] ??
    null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        description="Every conversation about your jobs, in one place."
      />

      <div className="ring-foreground/10 grid overflow-hidden rounded-xl ring-1 lg:grid-cols-[22rem_1fr]">
        {/* The list. Hidden on a phone once a conversation is open. */}
        <div
          className={`border-border min-h-0 max-h-[70vh] overflow-y-auto lg:max-h-[75vh] lg:border-r ${
            active ? "hidden lg:block" : "block"
          }`}
        >
          <ConversationList
            threads={threads.data}
            loading={threads.loading}
            error={threads.error}
            onRetry={threads.reload}
            selectedKey={shown ? threadKey(shown) : null}
            onSelect={setActive}
          />
        </div>

        {/* The conversation. */}
        <div
          className={`flex min-h-0 flex-col ${
            active ? "flex" : "hidden lg:flex"
          }`}
          style={{ maxHeight: "75vh" }}
        >
          {active ? (
            <button
              type="button"
              onClick={() => setActive(null)}
              className="border-border text-muted-foreground hover:text-foreground border-b px-4 py-2.5 text-left text-sm lg:hidden"
            >
              ← All conversations
            </button>
          ) : null}

          {shown ? (
            <MessageThread
              key={threadKey(shown)}
              bookingId={shown.bookingId ?? undefined}
              serviceRequestId={shown.serviceRequestId ?? undefined}
              counterpartyName={shown.counterpartyName}
              reference={shown.reference}
              variant="panel"
              onRead={threads.reload}
            />
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm">
              <MessagesSquare className="size-6" aria-hidden />
              <p>
                {threads.loading
                  ? "Loading your conversations…"
                  : "Pick a conversation to read it."}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Messages stay attached to the job they are about, so you can also open
        one from the booking itself.
      </p>
    </div>
  );
}
