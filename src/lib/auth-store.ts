/**
 * In-memory auth store for preview/development.
 * Switches to PostgreSQL when DATABASE_URL is available.
 */
import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  subscriptionTier: "free" | "pro" | "teams";
}

interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

// In-memory stores (survive hot-reloads in dev but reset on publish)
const users = new Map<string, User>(); // id -> User
const usersByEmail = new Map<string, string>(); // email -> id
const sessions = new Map<string, Session>(); // token -> Session

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createUser(
  email: string,
  passwordHash: string,
  name: string,
): Promise<User> {
  const normalized = normalizeEmail(email);

  if (usersByEmail.has(normalized)) {
    throw new Error("A user with this email already exists");
  }

  const user: User = {
    id: randomUUID(),
    email: normalized,
    passwordHash,
    name,
    createdAt: new Date().toISOString(),
    subscriptionTier: "free",
  };

  users.set(user.id, user);
  usersByEmail.set(normalized, user.id);

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const id = usersByEmail.get(normalized);
  if (!id) return null;
  return users.get(id) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  return users.get(id) ?? null;
}

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    token: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
  };
  sessions.set(session.token, session);
  return session;
}

export async function getSessionByToken(
  token: string,
): Promise<Session | null> {
  return sessions.get(token) ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  sessions.delete(token);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  for (const [token, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(token);
    }
  }
}
