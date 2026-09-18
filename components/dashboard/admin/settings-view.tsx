"use client";

import { useState } from "react";
import { Globe, Lock, Save, Settings as SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionError,
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import { admin, type SettingRow } from "@/lib/api/client";
import { humanise, relativeTime } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Platform configuration.
 *
 * Settings are key/value rows rather than a column per setting, so adding one
 * is an INSERT and not a migration. Each row carries its own type, which is
 * what this screen renders the right control from — and what the API validates
 * the submitted value against, since nothing in the request body says whether
 * `booking.cancellation_window_hours` is a number.
 *
 * Saving is per group and sends only what actually changed. Every change that
 * lands writes an admin_actions row with the before and after values, so a
 * setting that turns out to have broken something can be traced to a person
 * and a time.
 */
export function AdminSettingsView() {
  const { data, loading, error, reload } = useQuery(() => admin.settings(), []);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" />
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const groups = groupBy(data?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform configuration. Every change is written to the audit log with its previous value."
      />

      {!groups.length ? (
        <EmptyState
          icon={SettingsIcon}
          title="No settings defined"
          description="The platform_settings table is empty. Seed rows are added by migration."
        />
      ) : (
        groups.map(([group, rows]) => (
          <SettingGroup
            key={group}
            group={group}
            rows={rows}
            onSaved={reload}
          />
        ))
      )}
    </div>
  );
}

function SettingGroup({
  group,
  rows,
  onSaved,
}: {
  group: string;
  rows: SettingRow[];
  onSaved: () => void;
}) {
  // Only keys the user has touched go in here, which is also exactly what
  // gets sent: an untouched setting is never part of the request.
  const [edits, setEdits] = useState<Record<string, unknown>>({});
  const { run, pending, error } = useAction();

  const dirty = Object.keys(edits).filter(
    (key) =>
      JSON.stringify(edits[key]) !==
      JSON.stringify(rows.find((row) => row.key === key)?.value),
  );

  /**
   * Fields the user has emptied but which need a value. Blocked rather than
   * sent: Number("") is 0, and a cleared cancellation window silently stored
   * as zero is worse than a refused save.
   */
  const blank = dirty.filter((key) => {
    const row = rows.find((item) => item.key === key);
    // Numbers only: a cleared maintenance notice is a meaningful value, a
    // cleared cancellation window is a mistake.
    if (row?.valueType !== "NUMBER") return false;
    const value = edits[key];
    return typeof value === "string" && value.trim() === "";
  });

  async function save() {
    if (!dirty.length || blank.length) return;
    const result = await run(() =>
      admin.updateSettings(dirty.map((key) => ({ key, value: edits[key] }))),
    );
    if (result !== null) {
      setEdits({});
      onSaved();
    }
  }

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-medium">{humanise(group)}</h2>
        {dirty.length ? (
          <p className="text-muted-foreground text-sm">
            {dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((row) => (
          <SettingField
            key={row.key}
            row={row}
            value={row.key in edits ? edits[row.key] : row.value}
            onChange={(value) =>
              setEdits((current) => ({ ...current, [row.key]: value }))
            }
          />
        ))}
      </div>

      {blank.length ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {blank.length === 1
            ? "One field is empty and needs a number."
            : `${blank.length} fields are empty and need a number.`}{" "}
          Leaving a number blank is not the same as setting it to zero.
        </p>
      ) : null}

      <ActionError message={error} />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="accent"
          size="lg"
          onClick={() => void save()}
          disabled={pending || !dirty.length || blank.length > 0}
        >
          {pending ? <Spinner /> : <Save aria-hidden />}
          Save {humanise(group).toLowerCase()}
        </Button>
        {dirty.length ? (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setEdits({})}
            disabled={pending}
          >
            Discard changes
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function SettingField({
  row,
  value,
  onChange,
}: {
  row: SettingRow;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `setting-${row.key}`;
  const disabled = !row.isEditable;

  return (
    <div className="border-border border-t pt-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Label htmlFor={id}>{row.label}</Label>
        {row.isPublic ? (
          <span
            className="text-muted-foreground flex items-center gap-1 text-xs"
            title="Readable by anyone, signed in or not."
          >
            <Globe className="size-3" aria-hidden />
            public
          </span>
        ) : null}
        {disabled ? (
          <span
            className="text-muted-foreground flex items-center gap-1 text-xs"
            title="Fixed by the deployment; not editable from here."
          >
            <Lock className="size-3" aria-hidden />
            locked
          </span>
        ) : null}
      </div>

      {row.description ? (
        <p className="text-muted-foreground mt-0.5 mb-2 text-sm">
          {row.description}
        </p>
      ) : (
        <div className="mb-2" />
      )}

      {row.valueType === "BOOLEAN" ? (
        <label className="flex w-fit items-center gap-2.5 text-sm">
          <Checkbox
            id={id}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {value === true ? "On" : "Off"}
        </label>
      ) : row.valueType === "NUMBER" ? (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className="sm:w-40"
          disabled={disabled}
          value={typeof value === "number" ? value : String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : row.valueType === "JSON" ? (
        <JsonField
          id={id}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      ) : isLongText(row.key) ? (
        <Textarea
          id={id}
          rows={2}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Leave empty to hide"
        />
      ) : (
        <Input
          id={id}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      <p className="text-muted-foreground mt-1.5 font-mono text-xs">
        {row.key}
        {row.updatedBy ? (
          <span className="font-sans">
            {" "}
            · last set by {row.updatedBy.email} {relativeTime(row.updatedAt)}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * A JSON setting.
 *
 * Keeps the text the user is typing in local state and only lifts the parsed
 * value once it is valid. Feeding the raw string back through the lifted
 * value — which is what this used to do — meant every keystroke that left the
 * text momentarily invalid re-rendered the field as a quoted, escaped blob,
 * and saving in that state wrote a *string* into the JSONB column.
 */
function JsonField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);

  return (
    <>
      <Textarea
        id={id}
        rows={4}
        disabled={disabled}
        className="font-mono text-xs"
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-json`}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          try {
            const parsed: unknown = JSON.parse(next);
            setInvalid(false);
            onChange(parsed);
          } catch {
            // Held back deliberately: an unparseable draft is a moment in
            // typing, not a value to store.
            setInvalid(true);
          }
        }}
      />
      <p
        id={`${id}-json`}
        className={invalid ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
      >
        {invalid
          ? "Not valid JSON yet. The last valid version is what will be saved."
          : "A JSON object or array."}
      </p>
    </>
  );
}

/** A notice or a blurb wants a textarea; a name or an email does not. */
function isLongText(key: string): boolean {
  return key.includes("notice") || key.includes("message");
}

function groupBy(rows: SettingRow[]): [string, SettingRow[]][] {
  const map = new Map<string, SettingRow[]>();
  for (const row of rows) {
    map.set(row.group, [...(map.get(row.group) ?? []), row]);
  }
  return [...map.entries()];
}
