"use client";

/**
 * A minimal data hook for the dashboards.
 *
 * Not a cache and not SWR. Every dashboard screen reads auth-scoped data that
 * the API itself refuses to cache, and most of them are one request behind a
 * filter the user just changed. What they actually need is four things done
 * correctly, which is what this does:
 *
 *   - a real loading state on first load, and a quieter one on refetch, so a
 *     filter change does not blank the table the user is reading;
 *   - an error that survives long enough to be read, with a retry;
 *   - no write from a request the user has already navigated away from;
 *   - `reload()`, because almost every action here changes the list it was
 *     started from.
 *
 * "Pending" is derived rather than stored: state carries the key it was
 * settled for, and anything whose key does not match the current one is by
 * definition still in flight. That removes the usual setPending(true) at the
 * top of the effect, and with it a render pass on every single fetch.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { onChange, type ChangeResource } from "@/lib/live";

export interface QueryError {
  message: string;
  code: string;
  status: number;
}

export interface QueryResult<T> {
  data: T | null;
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** True while a reload runs over data that is already on screen. */
  refreshing: boolean;
  error: QueryError | null;
  reload: () => void;
}

interface Settled<T> {
  /** The key this result belongs to. `null` means nothing has settled yet. */
  key: string | null;
  data: T | null;
  error: QueryError | null;
  /**
   * Whether anything has ever come back, which is not the same as data being
   * non-null: several fetchers here legitimately resolve null (a non-admin
   * asking for admin stats, a create form with nothing to load). Keying the
   * full-skeleton state off `data === null` put those back into it on every
   * reload.
   */
  settledOnce: boolean;
}

export interface QueryOptions {
  /**
   * Whether this query refetches when the API says something changed.
   *
   * On by default, because a page nobody has to refresh is the point of the
   * change feed. `false` is for a screen where a refetch under the user's
   * hands would be worse than being a few seconds behind — anything that
   * seeds an editable form from what it loaded. Naming resources instead
   * narrows it to those, which is worth doing on a heavy query.
   */
  live?: boolean | ChangeResource[];
}

/**
 * How long to wait after a change before refetching.
 *
 * One action often touches several resources — accepting a quote closes the
 * request and opens a booking — and a screen listening to all of them would
 * otherwise fetch once per event. The API coalesces its side of this too; the
 * two together mean one action produces one refetch.
 */
const REFETCH_DEBOUNCE_MS = 400;

/**
 * `deps` works like useEffect's: change it and the query re-runs. The fetcher
 * is deliberately not a dependency, because it is almost always an inline
 * closure that would be a new function on every render.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
  options: QueryOptions = {},
): QueryResult<T> {
  // Bumped by reload(), and part of the key, so a manual refresh is just
  // another key change.
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([nonce, ...deps]);

  const [settled, setSettled] = useState<Settled<T>>({
    key: null,
    data: null,
    error: null,
    settledOnce: false,
  });

  // Guards against a slow request landing after a faster later one.
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;
    let active = true;

    void (async () => {
      try {
        const data = await fetcher();
        if (!active || latest.current !== key) return;
        setSettled({ key, data, error: null, settledOnce: true });
      } catch (thrown) {
        if (!active || latest.current !== key) return;
        // The previous data is kept alongside the error, so a failed refresh
        // shows a message over the table instead of wiping it.
        setSettled((current) => ({
          key,
          data: current.data,
          error: describe(thrown),
          settledOnce: true,
        }));
      }
    })();

    return () => {
      active = false;
    };
    // fetcher is intentionally omitted; see the note on `deps` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const pending = settled.key !== key;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  /**
   * Live updates.
   *
   * The event says only which kind of thing changed, so the answer is always
   * to refetch through the same call this hook already makes — which is
   * scoped to whoever is asking. Nothing arrives over the wire that the user
   * could not have requested themselves.
   */
  const live = options.live ?? true;
  const watched = Array.isArray(live) ? live.join(",") : "";

  useEffect(() => {
    if (!live) return;

    const wanted = watched ? new Set(watched.split(",")) : null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onChange((resource) => {
      if (wanted && !wanted.has(resource)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        reload();
      }, REFETCH_DEBOUNCE_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [live, watched, reload]);

  /**
   * Coming back to the tab.
   *
   * The stream is closed while a tab is hidden, and a phone may have closed
   * it long before that, so anything that happened in between was missed.
   * Refetching on return costs one request and removes the whole class of
   * "it was stale because I had been away".
   */
  useEffect(() => {
    if (!live) return;

    const revalidate = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [live, reload]);

  return {
    data: settled.data,
    loading: pending && !settled.settledOnce,
    refreshing: pending && settled.settledOnce,
    // An error from a superseded key is not this render's error.
    error: pending ? null : settled.error,
    reload,
  };
}

function describe(thrown: unknown): QueryError {
  if (thrown instanceof ApiError) {
    return {
      message: thrown.message,
      code: thrown.code,
      status: thrown.status,
    };
  }
  return {
    message:
      thrown instanceof Error
        ? thrown.message
        : "Something went wrong loading this.",
    code: "NETWORK_ERROR",
    status: 0,
  };
}

/**
 * The write-side companion. Tracks one in-flight action so a button can
 * disable itself and show what went wrong, without every screen hand-rolling
 * the same three pieces of state.
 */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(
      work: () => Promise<T>,
      options: { onSuccess?: (result: T) => void } = {},
    ): Promise<T | null> => {
      setPending(true);
      setError(null);
      try {
        const result = await work();
        options.onSuccess?.(result);
        return result;
      } catch (thrown) {
        setError(describe(thrown).message);
        return null;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}
