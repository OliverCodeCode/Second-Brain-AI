/**
 * Memory system for Second Brain AI.
 * In-memory store that swaps to PostgreSQL when DATABASE_URL is available.
 *
 * All functions keep the same signature regardless of backend —
 * only the implementation changes when DB is connected.
 */
import { randomUUID } from "node:crypto";
import { isDatabaseAvailable } from "~/db";

export interface MemoryEvent {
  id: string;
  userId: string;
  type: "note" | "voice" | "photo" | "document" | "link" | "chat";
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── In-memory stores ───────────────────────────────────────────
const memoryById = new Map<string, MemoryEvent>();
const userMemoryIds = new Map<string, string[]>(); // userId → memory IDs

// ─── Public API ─────────────────────────────────────────────────

export async function saveMemory(
  userId: string,
  content: string,
  type: string,
  metadata: Record<string, unknown> = {},
): Promise<MemoryEvent> {
  if (isDatabaseAvailable()) {
    return saveMemoryDB(userId, content, type, metadata);
  }

  const event: MemoryEvent = {
    id: randomUUID(),
    userId,
    type: type as MemoryEvent["type"],
    content,
    metadata,
    createdAt: new Date().toISOString(),
  };

  memoryById.set(event.id, event);
  const ids = userMemoryIds.get(userId) ?? [];
  ids.push(event.id);
  userMemoryIds.set(userId, ids);

  return event;
}

export async function searchMemory(
  userId: string,
  query: string,
): Promise<MemoryEvent[]> {
  if (isDatabaseAvailable()) {
    return searchMemoryDB(userId, query);
  }

  const ids = userMemoryIds.get(userId) ?? [];
  if (!query.trim()) {
    return getUserMemoriesList(userId);
  }

  const lowerQuery = query.toLowerCase();
  const results: MemoryEvent[] = [];

  for (const id of ids) {
    const m = memoryById.get(id);
    if (!m) continue;
    if (
      m.content.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(m.metadata).toLowerCase().includes(lowerQuery)
    ) {
      results.push(m);
    }
  }

  results.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return results;
}

export async function getRelevantMemories(
  userId: string,
  context: string,
  limit: number = 5,
): Promise<MemoryEvent[]> {
  if (isDatabaseAvailable()) {
    return getRelevantMemoriesDB(userId, context, limit);
  }

  const ids = userMemoryIds.get(userId) ?? [];
  const words = context
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const scored: { memory: MemoryEvent; score: number }[] = [];

  for (const id of ids) {
    const m = memoryById.get(id);
    if (!m) continue;
    let score = 0;
    const contentLower = m.content.toLowerCase();
    for (const word of words) {
      if (contentLower.includes(word)) score++;
      // Boost recent memories
      const ageHours =
        (Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) score += 0.5;
      if (ageHours < 1) score += 1;
    }
    if (score > 0) scored.push({ memory: m, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.memory);
}

export async function getUserMemories(
  userId: string,
  options?: { type?: string; limit?: number; offset?: number },
): Promise<MemoryEvent[]> {
  if (isDatabaseAvailable()) {
    return getUserMemoriesDB(userId, options);
  }

  let results = getUserMemoriesList(userId);

  if (options?.type) {
    results = results.filter((m) => m.type === options.type);
  }
  if (options?.offset) {
    results = results.slice(options.offset);
  }
  if (options?.limit) {
    results = results.slice(0, options.limit);
  }
  return results;
}

// ─── Internal helpers ───────────────────────────────────────────

function getUserMemoriesList(userId: string): MemoryEvent[] {
  const ids = userMemoryIds.get(userId) ?? [];
  return ids
    .map((id) => memoryById.get(id)!)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

// ─── PostgreSQL implementations (stubs — wired when DATABASE_URL is set) ──

async function saveMemoryDB(
  userId: string,
  content: string,
  type: string,
  metadata: Record<string, unknown>,
): Promise<MemoryEvent> {
  const { sql } = await import("~/db");
  const rows = await sql()`
    INSERT INTO memory_events (user_id, type, content, metadata)
    VALUES (${userId}, ${type}, ${content}, ${JSON.stringify(metadata)})
    RETURNING id, user_id, type, content, metadata, created_at
  `;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    content: r.content,
    metadata: r.metadata,
    createdAt: String(r.created_at),
  };
}

async function searchMemoryDB(
  userId: string,
  query: string,
): Promise<MemoryEvent[]> {
  const { sql } = await import("~/db");
  const rows = await sql()`
    SELECT id, user_id, type, content, metadata, created_at
    FROM memory_events
    WHERE user_id = ${userId}
      AND content ILIKE ${"%" + query + "%"}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.map(mapRow);
}

async function getRelevantMemoriesDB(
  userId: string,
  context: string,
  limit: number,
): Promise<MemoryEvent[]> {
  const { sql } = await import("~/db");
  // Use Postgres full-text search with plainto_tsquery
  const rows = await sql()`
    SELECT id, user_id, type, content, metadata, created_at,
           ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${context})) AS rank
    FROM memory_events
    WHERE user_id = ${userId}
      AND to_tsvector('english', content) @@ plainto_tsquery('english', ${context})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
  return rows.map(mapRow);
}

async function getUserMemoriesDB(
  userId: string,
  options?: { type?: string; limit?: number; offset?: number },
): Promise<MemoryEvent[]> {
  const { sql } = await import("~/db");

  let query = sql()`
    SELECT id, user_id, type, content, metadata, created_at
    FROM memory_events
    WHERE user_id = ${userId}
  `;

  // The typed sql tag helper doesn't support dynamic query building easily,
  // so we filter in JS for type if needed (acceptable for MVP)
  const rows = await sql()`
    SELECT id, user_id, type, content, metadata, created_at
    FROM memory_events
    WHERE user_id = ${userId}
      ${options?.type ? sql()`AND type = ${options.type}` : sql()``}
    ORDER BY created_at DESC
    ${options?.limit ? sql()`LIMIT ${options.limit}` : sql()``}
    ${options?.offset ? sql()`OFFSET ${options.offset}` : sql()``}
  `;
  return rows.map(mapRow);
}

function mapRow(r: Record<string, unknown>): MemoryEvent {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    type: r.type as MemoryEvent["type"],
    content: String(r.content),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  };
}
