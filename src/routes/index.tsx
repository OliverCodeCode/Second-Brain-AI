import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";
import {
  MorningBrief,
  DailyFocus,
  QuickCapture,
} from "~/components/HomeWidgets";

export const Route = createFileRoute("/")({
  loader: () => getAuth(),
  component: Home,
});

function Home() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Second Brain
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hello, {user.name.split(" ")[0]}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        <MorningBrief />
        <DailyFocus />
        <QuickCapture />
      </main>

      <BottomNav currentPath="/" />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 py-4 dark:border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Second Brain AI
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
            <span className="text-base">🧠</span>
            Your personal AI memory
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            Your memory, planner,
            <br />
            and personal assistant
          </h1>
          <p className="mt-6 max-w-lg text-lg text-gray-600 dark:text-gray-400">
            An AI that remembers everything — every note, meeting, document, and
            conversation — and surfaces the right information at the right time.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <a
              href="/signup"
              className="rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700"
            >
              Start for free
            </a>
            <a
              href="/login"
              className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Already have an account? Log in →
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-3xl">📝</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                Persistent Memory
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Every note, voice clip, and document is saved and searchable
                forever.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-3xl">🎯</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                Smart Planning
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                AI-generated tasks and reminders that adapt to your schedule.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-3xl">🔍</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                Instant Recall
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Surface the right information at the right time with contextual
                search.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-600">
        © {new Date().getFullYear()} Second Brain AI. Built for your mind.
      </footer>
    </div>
  );
}
