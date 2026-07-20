/**
 * Server-side auth state reader.
 * Used by server functions and loaders that need to access
 * the current user from the session cookie.
 */
import { getCookie } from "@tanstack/react-start/server";
import { getAuthenticatedUser } from "./auth";

export async function getAuthState() {
  try {
    const token = getCookie("sba_session");
    const user = await getAuthenticatedUser(token ?? null);
    return { user };
  } catch {
    // Not in a request context (e.g., during build)
    return { user: null };
  }
}
