"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  Spinner,
} from "@/components/dashboard/states";
import { notifications } from "@/lib/api/client";
import { relativeTime } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Notifications live in a panel rather than a page.
 *
 * Every role gets the same list from the same endpoint, and the thing a
 * notification is for is going somewhere else — so a full route would be
 * three near-identical pages that each exist to be left. A sheet keeps the
 * page underneath, which is usually the page the notification is about.
 *
 * The unread count loads with the shell; the list itself is only fetched when
 * the panel is opened.
 */
export function NotificationPanel() {
  const [open, setOpen] = useState(false);

  const count = useQuery(() => notifications.list({ limit: 1 }), []);
  const unread = count.data?.unread ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell aria-hidden />
          {unread > 0 ? (
            <span
              aria-hidden
              className="bg-destructive ring-background absolute top-1 right-1 size-2 rounded-full ring-2"
            />
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-left">
            Notifications
            {unread > 0 ? (
              <span className="text-muted-foreground font-sans text-sm font-normal">
                {" "}
                · {unread} unread
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {/* Mounted only while open, so closing the panel stops the request. */}
        {open ? (
          <NotificationList onChanged={count.reload} unread={unread} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function NotificationList({
  onChanged,
  unread,
}: {
  onChanged: () => void;
  unread: number;
}) {
  const { data, loading, error, reload } = useQuery(
    () => notifications.list({ limit: 25 }),
    [],
  );
  const { run, pending, error: actionError } = useAction();

  async function markAllRead() {
    await run(() => notifications.markRead(), {
      onSuccess: () => {
        reload();
        onChanged();
      },
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {unread > 0 ? (
        <div className="px-5 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={pending}
          >
            {pending ? <Spinner /> : <CheckCheck aria-hidden />}
            Mark all read
          </Button>
          <ActionError message={actionError} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data?.items.length ? (
          <EmptyState
            title="Nothing yet"
            description="Quotes, booking changes and messages will show up here."
            icon={Bell}
          />
        ) : (
          <ul className="divide-border divide-y">
            {data.items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "py-3",
                  item.readAt ? "" : "border-l-accent -ml-3 border-l-2 pl-3",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <time
                    className="text-muted-foreground shrink-0 text-xs"
                    dateTime={item.createdAt}
                  >
                    {relativeTime(item.createdAt)}
                  </time>
                </div>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
