"use client";

/**
 * Client-side session for the dashboards.
 *
 * Why this is client-side rather than a server component reading a cookie:
 * the access token is deliberately held in memory only (see lib/api/client),
 * and the refresh token is httpOnly, so a fresh tab has no usable credential
 * until something calls /auth/refresh. `auth.me()` does exactly that, because
 * the client retries once through a refresh on a 401. So the first thing a
 * dashboard does is ask who it is talking to.
 *
 * That means one request before the first paint, which is why every dashboard
 * page has a real loading state instead of pretending to be instant.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, auth, type Me, type UserRole } from "@/lib/api/client";
import { mightBeSignedIn } from "@/lib/auth/session-hint";
import { resetLiveConnection } from "@/lib/live";

export { mightBeSignedIn };

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: Me }
  | { status: "anonymous"; user: null }
  /** The API answered, but not with a session: a network or server fault. */
  | { status: "error"; user: null; message: string };

interface SessionValue {
  state: SessionState;
  /**
   * Re-reads /auth/me and resolves once the new state is in. Awaiting it
   * matters: signing in happens on a page that is already inside this
   * provider, whose state is "anonymous" at that point, so navigating to a
   * dashboard before the re-read lands would bounce straight back to /login.
   */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

/** One place that turns a /auth/me attempt into a SessionState. */
async function readSession(): Promise<SessionState> {
  if (!mightBeSignedIn()) return { status: "anonymous", user: null };

  try {
    return { status: "authenticated", user: await auth.me() };
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthenticated) {
      // Not signed in. Not a failure: the guard turns this into a redirect.
      return { status: "anonymous", user: null };
    }
    /**
     * Anything else — a 429, a 500, the API being down — is an error, not a
     * signed-out state. The distinction matters: treating a rate-limited
     * response as "anonymous" logs the person out of the interface while
     * their session is perfectly valid.
     */
    return {
      status: "error",
      user: null,
      message:
        error instanceof ApiError && error.isRateLimited
          ? "Too many requests from this network. Give it a moment."
          : error instanceof Error
            ? error.message
            : "Could not reach the FixItPH API.",
    };
  }
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
  });

  // The first read, on mount. Anonymous is the expected answer on a public
  // page, so it is a state rather than an error.
  useEffect(() => {
    let active = true;
    void readSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setState(await readSession());
    // Signing in is the usual reason to be here, and the live connection
    // needs a session to open at all — so it is reconsidered now rather than
    // when something next happens to mount.
    resetLiveConnection();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setState({ status: "anonymous", user: null });
      // A full navigation rather than router.push, deliberately: it tears down
      // the router cache, every mounted query and the in-memory access token,
      // so nothing belonging to the account that just left can survive into
      // the next one.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ state, refresh, signOut }),
    [state, refresh, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside a <SessionProvider>.");
  }
  return value;
}

/**
 * The signed-in user, or a throw. For components below a role guard, where an
 * anonymous session is already impossible and the null check is noise.
 */
export function useCurrentUser(): Me {
  const { state } = useSession();
  if (state.status !== "authenticated") {
    throw new Error("useCurrentUser used outside an authenticated subtree.");
  }
  return state.user;
}

/** Where a role's dashboard lives. Single source for every redirect. */
export const HOME_FOR_ROLE: Record<UserRole, string> = {
  CUSTOMER: "/dashboard",
  PROVIDER: "/provider",
  ADMIN: "/admin",
};
