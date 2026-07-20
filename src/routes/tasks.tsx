import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";

export const Route = createFileRoute("/tasks")({
  loader: () => getAuth(),
  component: TasksPage,
});

function TasksPage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to manage tasks
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your tasks sync across all your memories.
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
            Tasks
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {/* Quick-add task */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a task..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add
          </button>
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI will soon help generate tasks from your memories and schedule.
          </p>
        </div>

        {/* AI tasks teaser */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                AI Task Generation
              </p>
              <p className="text-xs text-purple-500 dark:text-purple-400">
                Coming soon: tasks auto-generated from your conversations and
                notes.
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav currentPath="/tasks" />
    </div>
  );
}
