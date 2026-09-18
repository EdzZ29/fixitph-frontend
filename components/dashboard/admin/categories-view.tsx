"use client";

import { useState } from "react";
import { Eye, EyeOff, FolderTree, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import { admin, type CategoryNode } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * The category tree that every listing and request hangs off.
 *
 * Categories are never deleted, only deactivated. A category with services
 * under it cannot be removed without orphaning them — the foreign key is
 * ON DELETE RESTRICT — and `isActive: false` is the supported way to retire
 * one: it disappears from the public tree while existing listings keep their
 * reference intact.
 */
export function AdminCategoriesView() {
  // The admin tree, not the public one: this screen has to show the
  // categories it has hidden, or hiding one makes it unreachable.
  const { data, loading, error, reload } = useQuery(() => admin.categories(), []);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(
    undefined,
  );

  const flat = flatten(data ?? []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="The tree customers browse and providers file their listings under."
        action={
          <Button
            variant="accent"
            size="lg"
            onClick={() => setCreatingUnder(null)}
          >
            <Plus aria-hidden />
            New top-level category
          </Button>
        }
      />

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Add a top-level category to get the directory started."
          action={
            <Button variant="accent" size="lg" onClick={() => setCreatingUnder(null)}>
              Add the first category
            </Button>
          }
        />
      ) : (
        <ul className="space-y-1.5">
          {flat.map(({ node, depth }) => (
            <li
              key={node.id}
              style={{ marginLeft: `${depth * 1.25}rem` }}
            >
              <CategoryRow
                node={node}
                onEdit={() => setEditing(node)}
                onAddChild={() => setCreatingUnder(node.id)}
                onChanged={reload}
              />
            </li>
          ))}
        </ul>
      )}

      {/* One dialog, reused: `editing` decides whether it saves or creates. */}
      <CategoryDialog
        open={editing !== null || creatingUnder !== undefined}
        onClose={() => {
          setEditing(null);
          setCreatingUnder(undefined);
        }}
        category={editing}
        parentId={creatingUnder ?? null}
        options={flat}
        onSaved={reload}
      />
    </div>
  );
}

function CategoryRow({
  node,
  onEdit,
  onAddChild,
  onChanged,
}: {
  node: CategoryNode;
  onEdit: () => void;
  onAddChild: () => void;
  onChanged: () => void;
}) {
  const { run, pending, error } = useAction();
  const active = node.isActive !== false;

  async function toggle() {
    await run(() => admin.updateCategory(node.id, { isActive: !active }), {
      onSuccess: onChanged,
    });
  }

  return (
    <div className="ring-foreground/10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5 ring-1">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">
            {node.icon ? (
              <span className="mr-1.5" aria-hidden>
                {node.icon}
              </span>
            ) : null}
            {node.name}
          </p>
          {!active ? (
            <StatusBadge meta={{ label: "Hidden", tone: "muted" }} />
          ) : null}
          <span className="text-muted-foreground text-xs">
            {plural(node._count?.services ?? 0, "listing")}
          </span>
        </div>
        {node.description ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
            {node.description}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-0.5 font-mono text-xs">
          {node.slug}
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <Button variant="outline" size="xs" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>
        <Button variant="ghost" size="xs" onClick={onAddChild}>
          <Plus aria-hidden />
          Subcategory
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void toggle()}
          disabled={pending}
          title={
            active
              ? "Hide from the public directory. Existing listings keep their category."
              : "Show in the public directory again."
          }
        >
          {pending ? (
            <Spinner />
          ) : active ? (
            <EyeOff aria-hidden />
          ) : (
            <Eye aria-hidden />
          )}
          {active ? "Hide" : "Show"}
        </Button>
      </div>

      <ActionError message={error} />
    </div>
  );
}

function CategoryDialog({
  open,
  onClose,
  category,
  parentId,
  options,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  category: CategoryNode | null;
  parentId: string | null;
  options: { node: CategoryNode; depth: number }[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [parent, setParent] = useState<string>("");
  const [position, setPosition] = useState("");
  const [seeded, setSeeded] = useState(false);
  const { run, pending, error } = useAction();

  // Seeded once per opening rather than in an effect: the dialog is only ever
  // opened with a fixed subject, so there is nothing to keep in sync.
  if (open && !seeded) {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setIcon(category?.icon ?? "");
    setParent(category?.parentId ?? parentId ?? "");
    setPosition(category?.position !== undefined ? String(category.position) : "");
    setSeeded(true);
  }
  if (!open && seeded) setSeeded(false);

  const tooShort = name.trim().length < 2;

  async function save() {
    if (tooShort) return;

    const base = {
      name: name.trim(),
      ...(position ? { position: Number(position) } : {}),
    };

    /**
     * An edit sends every optional field, using null where the input is
     * empty. The API reads undefined as "leave this alone" and null as
     * "clear it", so *omitting* an emptied field is why moving a subcategory
     * back to the top level, or deleting a description, used to report
     * success and change nothing.
     *
     * A create has nothing to clear, so empty fields are left out and take
     * the column default.
     */
    const result = await run(() =>
      category
        ? admin.updateCategory(category.id, {
            ...base,
            parentId: parent || null,
            description: description.trim() || null,
            icon: icon.trim() || null,
          })
        : admin.createCategory({
            ...base,
            ...(parent ? { parentId: parent } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(icon.trim() ? { icon: icon.trim() } : {}),
          }),
    );

    if (result !== null) {
      onSaved();
      onClose();
    }
  }

  // A category cannot be its own parent, nor a parent of its own ancestor.
  const parentOptions = options.filter(
    ({ node }) => !category || node.id !== category.id,
  );

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? `Edit ${category.name}` : "New category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "The slug is generated from the name and does not change once set."
              : "Categories are how customers browse. Keep names short and plain."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Aircon cleaning"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-parent">
                Sits under{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Select
                id="cat-parent"
                value={parent}
                onChange={(event) => setParent(event.target.value)}
              >
                <option value="">Top level</option>
                {parentOptions.map(({ node, depth }) => (
                  <option key={node.id} value={node.id}>
                    {"— ".repeat(depth)}
                    {node.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-position">
                Position{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="cat-position"
                type="number"
                min={0}
                inputMode="numeric"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">
              Icon{" "}
              <span className="text-muted-foreground font-normal">
                (optional, an emoji or icon name)
              </span>
            </Label>
            <Input
              id="cat-icon"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              maxLength={60}
              placeholder="❄️"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="cat-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="What belongs in this category."
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
            {category ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Depth-first walk, so the list renders as an indented tree. */
function flatten(
  nodes: CategoryNode[],
  depth = 0,
): { node: CategoryNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}
