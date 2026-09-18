"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, Loader2 } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { ActionError } from "@/components/dashboard/states";
import { providers } from "@/lib/api/client";
import { initials } from "@/lib/format";
import { useAction } from "@/lib/use-query";

/**
 * The profile photo and cover image.
 *
 * Uploaded straight away rather than held until the form is saved: they are
 * multipart and the rest of the form is JSON, and a provider who picks a photo
 * expects to see it, not to wonder whether Save will include it.
 *
 * Checked in the browser before sending — type and size — so the common
 * mistakes fail instantly instead of after a slow upload on a phone
 * connection. The server checks the leading bytes regardless, which is the
 * check that actually counts; this one is only about feedback.
 */
/**
 * A plain <img> rather than next/image: these are short-lived signed URLs on
 * a bucket host, so the optimiser cannot cache them and the signature would
 * expire inside its cache anyway.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ProfileImages({
  name,
  avatarUrl,
  coverUrl,
  onUploaded,
}: {
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  onUploaded: (next: { avatarUrl: string | null; coverUrl: string | null }) => void;
}) {
  return (
    <div className="ring-foreground/10 overflow-hidden rounded-xl ring-1">
      <div className="relative">
        <CoverSlot coverUrl={coverUrl} onUploaded={onUploaded} />

        <div className="absolute -bottom-10 left-5">
          <AvatarSlot name={name} avatarUrl={avatarUrl} onUploaded={onUploaded} />
        </div>
      </div>

      <div className="px-5 pt-12 pb-4">
        <p className="text-muted-foreground text-sm">
          A photo of you or your team, and a cover showing your work. Customers
          scroll past profiles without them.
        </p>
      </div>
    </div>
  );
}

function CoverSlot({
  coverUrl,
  onUploaded,
}: {
  coverUrl: string | null;
  onUploaded: (next: { avatarUrl: string | null; coverUrl: string | null }) => void;
}) {
  const { upload, pending, error } = useImageUpload("cover", onUploaded);
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <div
        className={cn(
          "bg-secondary relative h-36 w-full sm:h-44",
          coverUrl ? "" : "flex items-center justify-center",
        )}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Cover image"
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="text-muted-foreground text-sm">No cover image yet</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-3 bottom-3"
          onClick={() => input.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <ImageUp aria-hidden />
          )}
          {coverUrl ? "Change cover" : "Add cover"}
        </Button>

        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so picking the same file twice still fires a change.
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      {error ? (
        <div className="px-5 pt-2">
          <ActionError message={error} />
        </div>
      ) : null}
    </>
  );
}

function AvatarSlot({
  name,
  avatarUrl,
  onUploaded,
}: {
  name: string;
  avatarUrl: string | null;
  onUploaded: (next: { avatarUrl: string | null; coverUrl: string | null }) => void;
}) {
  const { upload, pending, error } = useImageUpload("avatar", onUploaded);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={avatarUrl ? "Change profile photo" : "Add a profile photo"}
        className="ring-background focus-visible:ring-ring/50 group bg-brand-panel text-brand-panel-foreground relative flex size-20 items-center justify-center overflow-hidden rounded-full ring-4 focus-visible:outline-none"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-heading text-xl font-semibold">
            {initials(name || "?")}
          </span>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {pending ? (
            <Loader2 className="size-5 animate-spin text-white" aria-hidden />
          ) : (
            <Camera className="size-5 text-white" aria-hidden />
          )}
        </span>
      </button>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <ActionError message={error} />
    </div>
  );
}

function useImageUpload(
  kind: "avatar" | "cover",
  onUploaded: (next: { avatarUrl: string | null; coverUrl: string | null }) => void,
) {
  const { run, pending, error } = useAction();
  const [localError, setLocalError] = useState<string | null>(null);

  async function upload(file: File) {
    setLocalError(null);

    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("That image is over 8MB. Try a smaller one.");
      return;
    }

    await run(() => providers.uploadImage(kind, file), {
      onSuccess: (result) =>
        onUploaded({ avatarUrl: result.avatarUrl, coverUrl: result.coverUrl }),
    });
  }

  return { upload, pending, error: localError ?? error };
}
