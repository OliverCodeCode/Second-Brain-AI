/**
 * Shared server function to get the current authenticated user.
 * Can be called from any route loader.
 */
import { createServerFn } from "@tanstack/react-start";

export const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthState } = await import("~/lib/auth-server");
  return getAuthState();
});
