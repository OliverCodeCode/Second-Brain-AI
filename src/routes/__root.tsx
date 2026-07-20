import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Second Brain AI" },
      { name: "theme-color", content: "#4f46e5" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800">
          404
        </h1>
        <p className="mt-2 text-gray-500">Page not found</p>
        <a href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Go home →
        </a>
      </div>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full bg-white font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
