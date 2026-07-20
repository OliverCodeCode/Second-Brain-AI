import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";

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

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Memory
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
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
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        {/* Empty state */}
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
            No memories yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Start capturing notes, voice clips, and documents to build your
            second brain.
          </p>
          <a
            href="/capture"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Go to Capture →
          </a>
        </div>
      </main>

      <BottomNav currentPath="/memory" />
    </div>
  );
}
