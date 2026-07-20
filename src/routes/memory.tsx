import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";
import { searchMemory, getUserMemories } from "~/lib/memory";
import type { MemoryEvent } from "~/lib/memory";
import { useState, useEffect, useCallback } from "react";

// ─── Server Functions ───────────────────────────────────────────

const searchMemoriesAction = createServerFn({ method: "GET" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }) => {
    const { getAuthState } = await import("~/lib/auth-server");
    const { user } = await getAuthState();
    if (!user) return [];

    const memories = await searchMemory(user.id, data.query);
    return memories.map((m) => ({ ...m }));
  });

const loadMemoriesAction = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthState } = await import("~/lib/auth-server");
  const { user } = await getAuthState();
  if (!user) return [];

  const memories = await getUserMemories(user.id, { limit: 50 });
  return memories.map((m) => ({ ...m }));
});

// ─── Route ──────────────────────────────────────────────────────

export const Route = createFileRoute("/memory")({
  loader: () => getAuth(),
  component: MemoryPage,
});

function MemoryPage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to view memory
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your memories are private and secure.
        </p>
        <a
          href="/login"
          className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Log in
        </a>
      </div>
    );
  }

  return <MemoryContent />;
}

// ─── Content ─────────────────────────────────────────────────────

function MemoryContent() {
  const [memories, setMemories] = useState<MemoryEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMemoriesAction().then((data) => {
      setMemories(data);
      setIsLoading(false);
    });
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        loadMemoriesAction().then(setMemories);
      } else {
        searchMemoriesAction({ query }).then(setMemories);
      }
    },
    [],
  );

  // Group memories by date
  const grouped = groupByDate(memories);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Memory
          </h1>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {memories.length} items
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search your memories..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && memories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchQuery ? "No matching memories" : "No memories yet"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Try a different search term."
                : "Start chatting with your AI or capturing notes to build your second brain."}
            </p>
            {!searchQuery && (
              <a
                href="/chat"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Go to Chat →
              </a>
            )}
          </div>
        )}

        {/* Timeline */}
        {!isLoading &&
          Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="space-y-2">
                {items.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            </div>
          ))}
      </main>

      <BottomNav currentPath="/memory" />
    </div>
  );
}

// ─── Memory Card ─────────────────────────────────────────────────

function MemoryCard({ memory }: { memory: MemoryEvent }) {
  const typeMeta = getTypeMeta(memory.type);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg" role="img" aria-label={memory.type}>
          {typeMeta.icon}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {typeMeta.label}
        </span>
        <span className="text-[10px] text-gray-300 dark:text-gray-600">
          {formatTime(memory.createdAt)}
        </span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
        {memory.content}
      </p>
      {memory.metadata &&
        Object.keys(memory.metadata).length > 0 &&
        memory.metadata.conversationId && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            From chat conversation
          </div>
        )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

interface TypeMeta {
  icon: string;
  label: string;
}

function getTypeMeta(type: string): TypeMeta {
  switch (type) {
    case "chat":
      return { icon: "💬", label: "Chat" };
    case "note":
      return { icon: "📝", label: "Note" };
    case "voice":
      return { icon: "🎤", label: "Voice" };
    case "photo":
      return { icon: "📸", label: "Photo" };
    case "document":
      return { icon: "📄", label: "Document" };
    case "link":
      return { icon: "🔗", label: "Link" };
    default:
      return { icon: "📌", label: type };
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupByDate(
  memories: MemoryEvent[],
): Record<string, MemoryEvent[]> {
  const grouped: Record<string, MemoryEvent[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const memory of memories) {
    const date = new Date(memory.createdAt);
    const dateStr = date.toDateString();
    let label: string;

    if (dateStr === today) {
      label = "Today";
    } else if (dateStr === yesterday) {
      label = "Yesterday";
    } else if (now.getTime() - date.getTime() < 7 * 86400000) {
      label = date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      label = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }

    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(memory);
  }

  return grouped;
}
