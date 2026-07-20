/**
 * Auth actions as server functions.
 * Called from client components for signup, login, logout.
 */
import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { signup, login, logout } from "./auth";

const SESSION_COOKIE = "sba_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const signupAction = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string; name: string }) => input)
  .handler(async ({ data }) => {
    const result = await signup(data);
    setCookie(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return { user: result.user };
  });

export const loginAction = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const result = await login(data.email, data.password);
    setCookie(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return { user: result.user };
  });

export const logoutAction = createServerFn({ method: "POST" }).handler(
  async () => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const token = getCookie(SESSION_COOKIE);
    if (token) {
      await logout(token);
    }
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return { success: true };
  },
);
