import type { NotFoundProps } from "../../press/themes/types";

/** Meridian 404: quiet, typographic, with a way home. */
export function NotFound({ site }: NotFoundProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-32 text-center">
      <p className="vp-font-head text-8xl font-bold text-[var(--vp-accent)]">404</p>
      <h1 className="vp-font-head mt-4 text-3xl font-bold text-[var(--vp-ink)]">This page has wandered off</h1>
      <p className="mt-3 max-w-md leading-7 text-[var(--vp-muted)]">
        The address may be misspelled, or the entry may have been moved or deleted from {site.settings.siteTitle}.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/" className="vp-button vp-button-solid">
          Back to the front page
        </a>
        <a href="/search" className="vp-button vp-button-ghost">
          Search the site
        </a>
      </div>
    </div>
  );
}
