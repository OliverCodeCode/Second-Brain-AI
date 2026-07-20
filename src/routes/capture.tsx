import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";

export const Route = createFileRoute("/capture")({
  loader: () => getAuth(),
  component: CapturePage,
});

function CapturePage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to capture
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You need an account to capture thoughts and memories.
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
            Capture
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-6">
        {/* Voice Capture */}
        <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-8 text-center dark:border-indigo-800 dark:bg-indigo-950/20">
          <button
            type="button"
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-95"
            aria-label="Start voice capture"
          >
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
          </button>
          <p className="mt-4 text-base font-semibold text-indigo-700 dark:text-indigo-300">
            Tap to record a voice note
          </p>
          <p className="mt-1 text-sm text-indigo-400 dark:text-indigo-500">
            Speak your thoughts — we&apos;ll transcribe and save them
          </p>
        </div>

        {/* Quick Text Note */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <textarea
            placeholder="Jot something down..."
            rows={4}
            className="w-full resize-none bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                📎 Attach
              </button>
              <button
                type="button"
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                📸 Photo
              </button>
            </div>
            <button
              type="button"
              className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Save note
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          All captures are saved to your memory and searchable forever.
        </p>
      </main>

      <BottomNav currentPath="/capture" />
    </div>
  );
}
