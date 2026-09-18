"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { ApiError, favorites } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";

/**
 * The save-a-provider heart.
 *
 * Optimistic, and deliberately quiet about failure: saving a shortlist is a
 * convenience, so a dropped request reverts the heart rather than throwing a
 * banner across a page the person is trying to read. The one failure worth
 * saying something about is not being signed in, which is a thing they can
 * act on.
 *
 * `initial` lets a page that already knows the state (the saved-providers
 * list) render the filled heart without another request.
 */
export function FavouriteButton({
  providerId,
  initial = false,
  onRemoved,
}: {
  providerId: string;
  initial?: boolean;
  onRemoved?: () => void;
}) {
  const { state } = useSession();
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const signedIn = state.status === "authenticated";

  async function toggle() {
    if (!signedIn) {
      setNeedsAuth(true);
      return;
    }

    const next = !saved;
    setSaved(next);
    setPending(true);

    try {
      await (next ? favorites.add(providerId) : favorites.remove(providerId));
      if (!next) onRemoved?.();
    } catch (error) {
      setSaved(!next);
      if (error instanceof ApiError && error.isUnauthenticated) {
        setNeedsAuth(true);
      }
    } finally {
      setPending(false);
    }
  }

  if (needsAuth) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="shrink-0"
      >
        <a href={`/login?next=${encodeURIComponent("/providers")}`}>
          Sign in to save
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved providers" : "Save this provider"}
    >
      <Heart
        className={cn(
          "size-4.5",
          saved ? "fill-accent text-brand-lime-ink" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </Button>
  );
}
