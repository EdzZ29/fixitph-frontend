"use client";

import { useState, type FormEvent } from "react";
import { MessagesSquare, Send } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  Spinner,
} from "@/components/dashboard/states";
import { messages } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * The message thread for one booking or one request — requirement eight.
 *
 * A thread is anchored to exactly one of the two, which is a CHECK constraint
 * as well as an API rule, and that anchor is what decides who can read it:
 * the RLS policy on `messages` limits every row to its sender and recipient,
 * so there is no thread id to guess and no participant list to get wrong.
 *
 * Opening the thread marks the caller's inbound messages read, server-side.
 * That is why the unread badge in the header is refetched after a load.
 */
export function MessageThread({
  bookingId,
  serviceRequestId,
  counterpartyName,
  onRead,
}: {
  bookingId?: string;
  serviceRequestId?: string;
  /** Who the other side is, for the empty state and the labels. */
  counterpartyName: string;
  /** Called after a load, so a header unread count can refresh. */
  onRead?: () => void;
}) {
  const me = useCurrentUser();
  const [body, setBody] = useState("");

  const anchor = bookingId
    ? { bookingId }
    : serviceRequestId
      ? { serviceRequestId }
      : null;

  const { data, loading, error, reload } = useQuery(
    () =>
      anchor
        ? messages.thread({ ...anchor, page: 1 }).then((result) => {
            onRead?.();
            return result;
          })
        : Promise.resolve(null),
    [bookingId, serviceRequestId],
  );

  const { run, pending, error: sendError } = useAction();

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !anchor) return;

    const result = await run(() => messages.send({ ...anchor, body: text }));
    if (result !== null) {
      setBody("");
      reload();
    }
  }

  if (!anchor) return null;

  return (
    <section className="ring-foreground/10 rounded-xl ring-1">
      <h2 className="font-heading border-border flex items-center gap-2 border-b px-4 py-3 text-base font-medium">
        <MessagesSquare className="size-4" aria-hidden />
        Messages with {counterpartyName}
      </h2>

      <div className="max-h-96 overflow-y-auto px-4 py-4">
        {loading ? (
          <LoadingRows rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            description={`Anything you send here goes to ${counterpartyName} and stays attached to this job.`}
          />
        ) : (
          <ol className="space-y-3">
            {data.items.map((message) => {
              const mine = message.senderId === me.id;
              return (
                <li
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3.5 py-2.5",
                      mine
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <p className="text-sm whitespace-pre-line">{message.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        mine ? "text-accent-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      <time
                        dateTime={message.createdAt}
                        title={formatDateTime(message.createdAt)}
                      >
                        {relativeTime(message.createdAt)}
                      </time>
                      {mine && message.readAt ? " · read" : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form onSubmit={send} className="border-border border-t px-4 py-3">
        <label htmlFor="message-body" className="sr-only">
          Write a message to {counterpartyName}
        </label>
        <Textarea
          id="message-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={`Message ${counterpartyName}…`}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Keep it on the platform. Moving off it is how people get scammed,
            and it leaves you with no record.
          </p>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={pending || !body.trim()}
          >
            {pending ? <Spinner /> : <Send aria-hidden />}
            Send
          </Button>
        </div>
        <ActionError message={sendError} />
      </form>
    </section>
  );
}
