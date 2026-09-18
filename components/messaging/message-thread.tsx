"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, MessagesSquare, Send, X } from "lucide-react";
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
/** Images only, and small enough that a phone upload finishes. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];

export function MessageThread({
  bookingId,
  serviceRequestId,
  counterpartyName,
  /** The short booking reference, shown so the thread says which job it is. */
  reference,
  /** "panel" drops the outer ring and grows to its container, for the chat
   * launcher and the two-pane conversation page. */
  variant = "card",
  /**
   * False where the surrounding chrome already names the conversation. The
   * launcher's own header does, and two headers saying "Saavedra Aircon
   * Services" one under the other is just noise in a 23rem panel.
   */
  showHeader = true,
  onRead,
}: {
  bookingId?: string;
  serviceRequestId?: string;
  /** Who the other side is, for the empty state and the labels. */
  counterpartyName: string;
  reference?: string | null;
  variant?: "card" | "panel";
  showHeader?: boolean;
  /** Called after a load, so a header unread count can refresh. */
  onRead?: () => void;
}) {
  const me = useCurrentUser();
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

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
    // A photo on its own is a message; text on its own is too. Nothing at all
    // is not.
    if (!anchor || (!text && !photo)) return;

    // A photo with a caption is one message, not two: the caption is the
    // body of the message the image hangs off.
    const result = await run(() =>
      photo
        ? messages.sendImage({ ...anchor, file: photo, body: text })
        : messages.send({ ...anchor, body: text }),
    );

    if (result !== null) {
      setBody("");
      setPhoto(null);
      setPhotoError(null);
      reload();
    }
  }

  function choose(file: File) {
    setPhotoError(null);

    if (!ACCEPTED_IMAGES.includes(file.type)) {
      setPhotoError("Send a JPEG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPhotoError("That photo is over 8MB. Try a smaller one.");
      return;
    }
    setPhoto(file);
  }

  /**
   * Stay at the newest message.
   *
   * A thread that opens at the top makes the reader scroll to find what they
   * came for, and a reply that lands off-screen looks like it was not sent.
   */
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [data]);

  if (!anchor) return null;

  return (
    <section
      className={
        variant === "card"
          ? "ring-foreground/10 flex flex-col rounded-xl ring-1"
          : "flex min-h-0 flex-1 flex-col"
      }
    >
      {showHeader ? (
        <h2 className="font-heading border-border flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-3 text-base font-medium">
          <MessagesSquare className="size-4 shrink-0" aria-hidden />
          Messages with {counterpartyName}
          {/*
            Which job this is about. A provider with four on the go needs to
            know that before reading, and it is the same eight characters the
            booking screens print, so the two can be matched up.
          */}
          {reference ? (
            <span className="text-muted-foreground font-mono text-xs font-normal">
              booking {reference}
            </span>
          ) : null}
        </h2>
      ) : null}

      <div
        className={
          variant === "card"
            ? "max-h-96 overflow-y-auto px-4 py-4"
            : "min-h-0 flex-1 overflow-y-auto px-4 py-4"
        }
      >
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
                    {/*
                      The image first, then the caption. "Sent a photo" is the
                      body the API writes when there is no caption, so it is
                      not repeated under a picture that speaks for itself.
                    */}
                    {message.attachments.map((attachment) =>
                      attachment.url ? (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-1.5 block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachment.url}
                            alt={attachment.originalFilename}
                            className="max-h-64 w-auto rounded-lg"
                          />
                        </a>
                      ) : (
                        <p
                          key={attachment.id}
                          className="mb-1.5 text-xs italic opacity-80"
                        >
                          {attachment.originalFilename} could not be loaded.
                        </p>
                      ),
                    )}

                    {message.attachments.length &&
                    message.body === "Sent a photo" ? null : (
                      <p className="text-sm whitespace-pre-line">
                        {message.body}
                      </p>
                    )}
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        mine
                          ? "text-accent-foreground/70"
                          : "text-muted-foreground",
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
        <div ref={bottom} />
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
        {photo ? (
          <div className="border-border mt-2 flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(photo)}
              alt=""
              className="size-12 shrink-0 rounded object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-xs">
              {photo.name}
              <span className="text-muted-foreground block">
                {Math.round(photo.size / 1024)} KB · sends with your message
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove photo"
              onClick={() => setPhoto(null)}
            >
              <X aria-hidden />
            </Button>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground min-w-0 flex-1 text-xs">
            Keep it on the platform. Moving off it is how people get scammed,
            and it leaves you with no record.
          </p>

          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_IMAGES.join(",")}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Reset, so picking the same file twice still fires.
                event.target.value = "";
                if (file) choose(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus aria-hidden />
              Photo
            </Button>

            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={pending || (!body.trim() && !photo)}
            >
              {pending ? <Spinner /> : <Send aria-hidden />}
              Send
            </Button>
          </div>
        </div>
        <ActionError message={photoError ?? sendError} />
      </form>
    </section>
  );
}
