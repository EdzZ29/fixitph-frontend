"use client";

import { useState } from "react";
import { Images, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  Spinner,
} from "@/components/dashboard/states";
import { providers, type PortfolioItem } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Past work, shown on the public profile.
 *
 * Text-first on purpose: a plumber who fixed a burst main at 2am can describe
 * it in a sentence, and requiring a photo before the entry can exist would
 * mean most people never add one. Photos attach to an entry afterwards.
 */
export function PortfolioEditor() {
  const { data, loading, error, reload } = useQuery(
    () => providers.portfolio(),
    [],
  );
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PortfolioItem | null>(null);

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading flex items-center gap-2 text-base font-medium">
            <Images className="size-4" aria-hidden />
            Past work
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            A few jobs you are proud of. These sit on your public profile.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Add a job
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingRows rows={2} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={Images}
            title="Nothing here yet"
            description="Describe a job you have done. It is the difference between a profile and a listing."
            action={
              <Button variant="accent" size="lg" onClick={() => setAdding(true)}>
                Add your first
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {data.map((item) => (
              <li
                key={item.id}
                className="border-border flex flex-wrap items-start gap-3 rounded-lg border px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {item.description}
                    </p>
                  ) : null}
                  {item.completedAt ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDate(item.completedAt)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setEditing(item)}
                  >
                    <Pencil aria-hidden />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoving(item)}
                  >
                    <Trash2 aria-hidden />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PortfolioDialog
        open={adding || editing !== null}
        item={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={reload}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => setRemoving(open ? removing : null)}
        title={`Remove “${removing?.title ?? ""}”?`}
        description="It comes off your public profile. This cannot be undone."
        confirmLabel="Remove"
        destructive
        onConfirm={() =>
          removing
            ? providers.removePortfolioItem(removing.id)
            : Promise.resolve(null)
        }
        onDone={reload}
      />
    </section>
  );
}

function PortfolioDialog({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: PortfolioItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const { run, pending, error, clearError } = useAction();

  // Seeded as the dialog opens, during render: derived state off a prop.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(item?.title ?? "");
      setDescription(item?.description ?? "");
      setCompletedAt(item?.completedAt ? item.completedAt.slice(0, 10) : "");
      clearError();
    }
  }

  const tooShort = title.trim().length < 2;

  async function save() {
    if (tooShort) return;
    const result = await run(() =>
      item
        ? providers.updatePortfolioItem(item.id, {
            title: title.trim(),
            // Null clears; the API distinguishes it from "leave alone".
            description: description.trim() || null,
            completedAt: completedAt || null,
          })
        : providers.addPortfolioItem({
            title: title.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(completedAt ? { completedAt } : {}),
          }),
    );
    if (result !== null) {
      onSaved();
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit this job" : "Add a job"}</DialogTitle>
          <DialogDescription>
            What the job was and how it went. Customers read these to decide
            whether you have done their kind of work before.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pf-title">What was the job?</Label>
            <Input
              id="pf-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Replaced a burst main line in Ampayon"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-description">
              Details{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="pf-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What was wrong, what you did, how long it took."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-date">
              When{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="pf-date"
              type="date"
              value={completedAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setCompletedAt(event.target.value)}
              className="sm:w-48"
            />
          </div>
        </div>

        <ActionError message={error} />

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="lg"
            onClick={() => void save()}
            disabled={pending || tooShort}
          >
            {pending ? <Spinner /> : null}
            {item ? "Save changes" : "Add to profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
