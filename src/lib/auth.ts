/**
 * Auth utilities: password hashing and session management.
 * Uses Bun.password for bcrypt-like hashing.
 */
import type { User } from "./auth-store";
import {
  createSession,
  createUser,
  deleteSession,
  getUserByEmail,
  getUserById,
  getSessionByToken,
} from "./auth-store";

const SESSION_COOKIE = "sba_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthResult {
  user: Omit<User, "passwordHash">;
  sessionToken: string;
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  if (!input.email || !input.password || !input.name) {
    throw new Error("Email, password, and name are required");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser(input.email, passwordHash, input.name);
  const session = await createSession(user.id);

  return { user: sanitizeUser(user), sessionToken: session.token };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const session = await createSession(user.id);
  return { user: sanitizeUser(user), sessionToken: session.token };
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}

export async function getAuthenticatedUser(
  token: string | null,
): Promise<Omit<User, "passwordHash"> | null> {
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return sanitizeUser(user);
}

export function setSessionCookie(
  headers: Headers,
  token: string,
): void {
  headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
  );
}

export function clearSessionCookie(headers: Headers): void {
  headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  );
}

export function getSessionTokenFromCookies(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name === SESSION_COOKIE) {
      return valueParts.join("=");
    }
  }
  return null;
}

function sanitizeUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
