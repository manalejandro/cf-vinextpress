import type { NotFoundProps } from "../../press/themes/types";

/** Kite 404: minimal and calm. */
export function NotFound({ site }: NotFoundProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-32 text-center">
      <span aria-hidden="true" className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-[var(--vp-accent)]" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--vp-ink)]">This page doesn't exist</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-7 text-[var(--vp-muted)]">
        The address may be misspelled, or the entry was removed from {site.settings.siteTitle}.
      </p>
      <div className="mt-8 flex gap-3">
        <a href="/" className="vp-button vp-button-solid">
          Home
        </a>
        <a href="/search" className="vp-button vp-button-ghost">
          Search
        </a>
      </div>
    </div>
  );
}
