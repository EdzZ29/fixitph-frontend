"use client";

import { useState } from "react";
import { Clock, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ActionError,
  ErrorState,
  LoadingRows,
  Spinner,
} from "@/components/dashboard/states";
import { providers, type AvailabilityDay, type DayOfWeek } from "@/lib/api/client";
import { humanise } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * The week a provider works.
 *
 * Edited and saved as one thing, because that is how people think about a
 * schedule — you change Tuesday and Saturday and save once. The API replaces
 * the whole week for the same reason, so a partial save can never leave
 * someone bookable at hours they just removed.
 *
 * Times are plain HH:MM strings all the way to the database, which stores them
 * in a time-only column. A weekly pattern has no date, and giving it one would
 * drag a timezone into something that does not have one.
 */
const DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

type Row = { dayOfWeek: DayOfWeek; startTime: string; endTime: string; isClosed: boolean };

const DEFAULT_ROW = (day: DayOfWeek): Row => ({
  dayOfWeek: day,
  startTime: "08:00",
  endTime: "17:00",
  // Sunday closed by default, which is the common case here.
  isClosed: day === "SUNDAY",
});

export function AvailabilityEditor() {
  const { data, loading, error, reload } = useQuery(
    () => providers.availability(),
    [],
  );
  const { run, pending, error: saveError } = useAction();

  const [rows, setRows] = useState<Row[] | null>(null);
  const [saved, setSaved] = useState(false);

  // Seeded from the server once it answers, during render rather than in an
  // effect, so the fields are never briefly blank over loaded data.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && data) {
    setSeeded(true);
    setRows(DAYS.map((day) => toRow(day, data)));
  }

  if (loading) return <LoadingRows rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!rows) return null;

  const set = (day: DayOfWeek, patch: Partial<Row>) => {
    setSaved(false);
    setRows((current) =>
      (current ?? []).map((row) =>
        row.dayOfWeek === day ? { ...row, ...patch } : row,
      ),
    );
  };

  // Mirrors the API's own check, so a bad range is caught before the round trip.
  const problems = rows.filter(
    (row) => !row.isClosed && row.startTime >= row.endTime,
  );

  async function save() {
    if (problems.length) return;
    const result = await run(() =>
      providers.setAvailability(
        // Closed days are still sent: the week is replaced wholesale, and a
        // missing day would read as "not set" rather than "closed".
        (rows ?? []).map(({ dayOfWeek, startTime, endTime, isClosed }) => ({
          dayOfWeek,
          startTime,
          endTime,
          isClosed,
        })),
      ),
    );
    if (result !== null) {
      setSaved(true);
      reload();
    }
  }

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <Clock className="size-4" aria-hidden />
        Working hours
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Shown on your public profile, and used by the &ldquo;open right
        now&rdquo; filter customers search with.
      </p>

      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const invalid = !row.isClosed && row.startTime >= row.endTime;
          return (
            <li
              key={row.dayOfWeek}
              className="flex flex-wrap items-center gap-x-3 gap-y-2"
            >
              <span className="w-24 shrink-0 text-sm font-medium">
                {humanise(row.dayOfWeek)}
              </span>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={row.isClosed}
                  onCheckedChange={(checked) =>
                    set(row.dayOfWeek, { isClosed: checked === true })
                  }
                />
                Closed
              </label>

              {!row.isClosed ? (
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`start-${row.dayOfWeek}`}>
                    {humanise(row.dayOfWeek)} opens
                  </label>
                  <Input
                    id={`start-${row.dayOfWeek}`}
                    type="time"
                    value={row.startTime}
                    onChange={(event) =>
                      set(row.dayOfWeek, { startTime: event.target.value })
                    }
                    aria-invalid={invalid || undefined}
                    className="w-32"
                  />
                  <span className="text-muted-foreground text-sm" aria-hidden>
                    to
                  </span>
                  <label className="sr-only" htmlFor={`end-${row.dayOfWeek}`}>
                    {humanise(row.dayOfWeek)} closes
                  </label>
                  <Input
                    id={`end-${row.dayOfWeek}`}
                    type="time"
                    value={row.endTime}
                    onChange={(event) =>
                      set(row.dayOfWeek, { endTime: event.target.value })
                    }
                    aria-invalid={invalid || undefined}
                    className="w-32"
                  />
                </div>
              ) : null}

              {invalid ? (
                <p className="text-destructive text-sm">
                  Closes before it opens.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ActionError message={saveError} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="accent"
          size="lg"
          onClick={() => void save()}
          disabled={pending || problems.length > 0}
        >
          {pending ? <Spinner /> : <Save aria-hidden />}
          Save hours
        </Button>
        {saved && !pending ? (
          <p className="text-muted-foreground text-sm">Saved.</p>
        ) : null}
      </div>
    </section>
  );
}

function toRow(day: DayOfWeek, saved: AvailabilityDay[]): Row {
  const match = saved.find((row) => row.dayOfWeek === day);
  if (!match) return DEFAULT_ROW(day);
  return {
    dayOfWeek: day,
    // The API returns a time-only column, which serialises as a full
    // timestamp; only the clock part is meaningful.
    startTime: clock(match.startTime) ?? "08:00",
    endTime: clock(match.endTime) ?? "17:00",
    isClosed: match.isClosed,
  };
}

/** "1970-01-01T08:00:00.000Z" or "08:00:00" -> "08:00". */
function clock(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : null;
}
