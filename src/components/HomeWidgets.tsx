import type { ReactNode } from "react";

export function MorningBrief() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">☀️</span>
        <h2 className="text-lg font-semibold">Morning Brief</h2>
      </div>
      <p className="text-sm text-indigo-100">
        Your AI is ready to summarize your day. Start capturing notes, tasks, and
        reminders to build your personal brief.
      </p>
      <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs">
        <span className="font-medium">Coming soon:</span> AI-generated daily
        summaries based on your memory events and schedule.
      </div>
    </div>
  );
}

export function DailyFocus() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          Daily Focus Score
        </h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Beta
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          —
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">/ 100</span>
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Start capturing tasks and memories to unlock your focus score.
      </p>
    </div>
  );
}

export function QuickCapture({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-6 text-center dark:border-indigo-800 dark:bg-indigo-950/20">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
        <svg
          className="h-7 w-7 text-indigo-600 dark:text-indigo-400"
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
      </div>
      <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
        Tap to capture a thought
      </p>
      <p className="mt-1 text-xs text-indigo-400 dark:text-indigo-500">
        Voice, text, or photo — we'll remember it all
      </p>
      {children}
    </div>
  );
}
