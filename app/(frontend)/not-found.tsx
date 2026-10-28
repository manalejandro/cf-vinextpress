import type { Metadata } from "next";
import { getPress } from "@/press/context";
import { NotInstalled } from "@/press/components/NotInstalled";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Themed 404 for the frontend route group. */
export default async function FrontendNotFound() {
  const press = await getPress();
  if (!press.settings.installed) return <NotInstalled />;
  const NotFound = press.theme.templates.NotFound;
  if (!NotFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="text-4xl font-bold">404 — Not found</h1>
        <p className="mt-4 text-[var(--vp-muted)]">The requested path does not exist on this site.</p>
        <a href="/" className="vp-button vp-button-solid mt-8">
          Back home
        </a>
      </div>
    );
  }
  return <NotFound press={press} site={press.site} />;
}
