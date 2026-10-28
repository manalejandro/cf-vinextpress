import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found – VinextPress",
};

/** Root fallback 404 — themed 404s live inside the frontend route group. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-7xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <a href="/" className="text-sm underline underline-offset-4">
        Back to the front page
      </a>
    </main>
  );
}
