/**
 * "Is anyone signed in on this device?", answered without asking the API.
 *
 * The refresh token is httpOnly, which is right and which also means script
 * cannot tell a signed-out visitor from a signed-in one. The API sets this
 * readable flag alongside it, so a public page can skip the /auth/me and
 * /auth/refresh pair that would otherwise 401 twice for every visitor who has
 * never had an account.
 *
 * It is a hint, never a credential: forging it buys nothing but the 401 that
 * would have happened anyway.
 *
 * In its own module because both the session provider and the live connection
 * need it, and having either import the other would be a cycle.
 */

const SESSION_HINT_COOKIE = "fixitph_session=";

/** Fails open: if the cookie cannot be read, ask the API as before. */
export function mightBeSignedIn(): boolean {
  try {
    return document.cookie
      .split(";")
      .some((entry) => entry.trim().startsWith(SESSION_HINT_COOKIE));
  } catch {
    return true;
  }
}
