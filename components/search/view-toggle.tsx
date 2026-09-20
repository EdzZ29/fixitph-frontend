"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LayoutGrid, Map as MapIcon, Rows3, Table2 } from "lucide-react";
import { cn } from "cn";

/**
 * How a results list is laid out.
 *
 * grid   two cards across — browsing, when the pictures and the blurb matter
 * list   one card across, full width — reading, and what a phone gets anyway
 * table  one row each — comparing, when you want price against price
 * map    pinned where the provider works, for "who is near me"
 */
export type ResultView = "grid" | "list" | "table" | "map";

const VIEWS: { value: ResultView; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: Rows3 },
  { value: "table", label: "Table", icon: Table2 },
  { value: "map", label: "Map", icon: MapIcon },
];

const STORAGE_KEY = "fixitph.resultView";

function isView(value: unknown): value is ResultView {
  return (
    value === "grid" ||
    value === "list" ||
    value === "table" ||
    value === "map"
  );
}

/** Subscribers in this tab, since a storage event does not fire on itself. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Changing it in one tab should change it in the others.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The choice for this session when storage cannot hold it.
 *
 * Without this, a browser with site data blocked would read back the old
 * value on every change and the buttons would simply not respond. The
 * preference is then forgotten when the tab closes, which is the most that
 * can be promised there.
 */
let inMemory: ResultView | null = null;

function readStored(): ResultView {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isView(stored)) return stored;
  } catch {
    // Private browsing, or storage turned off.
  }
  return inMemory ?? "grid";
}

/** The server has no storage to read, so it renders the default. */
function serverSnapshot(): ResultView {
  return "grid";
}

/**
 * Remembers the choice for next time.
 *
 * localStorage rather than the URL: it is how this person likes to read a
 * list, not part of what they searched for, so it should not travel in a
 * shared link or add a history entry every time they change their mind.
 *
 * useSyncExternalStore rather than an effect that copies storage into state.
 * Storage genuinely is an external store, and this is the hook built for one:
 * it gives the server its own snapshot, so the markup matches on hydration
 * without a render pass spent correcting itself.
 */
export function useResultView() {
  const view = useSyncExternalStore(subscribe, readStored, serverSnapshot);

  const choose = useCallback((next: ResultView) => {
    inMemory = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not a reason to refuse the change: inMemory above carries it for
      // this session, and the listeners below make the page follow.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return [view, choose] as const;
}

/**
 * Three buttons rather than a select: there are exactly three, the icons say
 * what they do at a glance, and it is one click instead of two.
 */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ResultView;
  onChange: (next: ResultView) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="How results are laid out"
      className={cn(
        "border-input bg-secondary inline-flex rounded-md border p-0.5",
        className,
      )}
    >
      {VIEWS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            // aria-pressed rather than a radiogroup: these act on what is
            // already on screen, they do not choose a value to submit.
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {/* The label is the accessible name on a phone, where only the
                icon is visible. */}
            <span className="sr-only sm:not-sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
