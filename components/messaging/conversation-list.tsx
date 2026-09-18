"use client";

import { ImageIcon, MessagesSquare } from "lucide-react";
import { cn } from "cn";

import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import type { MessageThreadRow } from "@/lib/api/client";
import { relativeTime } from "@/lib/format";
import type { QueryError } from "@/lib/use-query";

/**
 * Every conversation, newest first — the thing that was missing.
 *
 * A thread could only be reached from the booking it hangs off, so somebody
 * with three jobs had three pages to check and no way to see that a reply had
 * arrived. This is the inbox: who wrote, about which job, and whether it has
 * been read.
 *
 * Presentational on purpose. The launcher and the full page both render it,
 * and they disagree about how much room there is, so the data and the
 * selection live with the caller.
 */
export function ConversationList({
  threads,
  loading,
  error,
  onRetry,
  selectedKey,
  onSelect,
  className,
}: {
  threads: MessageThreadRow[] | null;
  loading: boolean;
  error: QueryError | null;
  onRetry: () => void;
  /** The thread currently open, as `threadKey` returns it. */
  selectedKey?: string | null;
  onSelect: (thread: MessageThreadRow) => void;
  className?: string;
}) {
  if (loading) return <LoadingRows rows={4} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  if (!threads?.length) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No conversations yet"
        description="Messages about a job appear here, on both sides of it."
      />
    );
  }

  return (
    <ul className={cn("divide-border divide-y", className)}>
      {threads.map((thread) => {
        const key = threadKey(thread);
        const selected = key === selectedKey;
        const isPhoto = thread.lastMessage.messageType === "IMAGE";

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(thread)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "hover:bg-secondary/60 focus-visible:ring-ring/50 w-full px-4 py-3 text-left focus-visible:ring-2 focus-visible:outline-none",
                selected && "bg-secondary",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={cn(
                    "min-w-0 truncate text-sm",
                    thread.unread > 0 ? "font-semibold" : "font-medium",
                  )}
                >
                  {thread.counterpartyName}
                </p>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {relativeTime(thread.lastMessage.createdAt)}
                </span>
              </div>

              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {thread.title}
                {thread.reference ? (
                  <span className="font-mono"> · {thread.reference}</span>
                ) : null}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    thread.unread > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {thread.lastMessage.mine ? "You: " : ""}
                  {isPhoto ? (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3.5 shrink-0" aria-hidden />
                      {thread.lastMessage.body === "Sent a photo"
                        ? "Photo"
                        : thread.lastMessage.body}
                    </span>
                  ) : (
                    thread.lastMessage.body
                  )}
                </p>

                {thread.unread > 0 ? (
                  <span
                    className="bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                    aria-label={`${thread.unread} unread`}
                  >
                    {thread.unread}
                  </span>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A stable identity for a conversation.
 *
 * A thread is anchored to exactly one booking or one request, so whichever id
 * is present is the key. Prefixed, because the two id spaces are separate and
 * a bare uuid would not say which it came from.
 */
export function threadKey(thread: {
  bookingId: string | null;
  serviceRequestId: string | null;
}): string {
  return thread.bookingId
    ? `booking:${thread.bookingId}`
    : `request:${thread.serviceRequestId}`;
}
