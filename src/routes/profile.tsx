import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "~/lib/get-auth";
import { BottomNav } from "~/components/BottomNav";
import { logoutAction } from "~/lib/auth-actions";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  loader: () => getAuth(),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useLoaderData() ?? { user: null };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">🔒</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Sign in to view profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account and subscription.
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
            Profile
          </h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {/* User info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Plan
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900 capitalize dark:text-white">
                {user.subscriptionTier}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.subscriptionTier === "free"
                  ? "Limited memory, basic search, daily brief"
                  : user.subscriptionTier === "pro"
                    ? "Unlimited memory, OCR, AI planner, CRM"
                    : "Shared memory, team CRM, meeting recording"}
              </p>
            </div>
            {user.subscriptionTier === "free" && (
              <a
                href="#"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Upgrade
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              0
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Memories
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              0
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              0
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Contacts
            </p>
          </div>
        </div>

        {/* Logout */}
        <LogoutButton />
      </main>

      <BottomNav currentPath="/profile" />
    </div>
  );
}

function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutAction();
      window.location.href = "/";
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
    >
      {loading ? "Logging out..." : "Log out"}
    </button>
  );
}
