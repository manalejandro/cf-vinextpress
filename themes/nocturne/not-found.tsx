import type { NotFoundProps } from "../../press/themes/types";

/** Nocturne 404: terminal-flavored. */
export function NotFound({ site }: NotFoundProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-6 py-32">
      <p className="vp-font-mono text-sm text-[var(--vp-accent)]">
        $ curl -I {site.settings.siteUrl || "this-site"}/…
      </p>
      <p className="vp-font-mono mt-2 text-sm text-[var(--vp-muted)]">HTTP/2 404 not found</p>
      <h1 className="mt-8 text-6xl font-bold tracking-tight text-[var(--vp-ink)]">Lost in the void</h1>
      <p className="mt-4 max-w-md leading-7 text-[var(--vp-muted)]">
        Nothing is routed here. The path may be misspelled, or the entry no longer exists.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/" className="vp-button vp-button-solid">
          ./home
        </a>
        <a href="/search" className="vp-button vp-button-ghost">
          grep the site
        </a>
      </div>
    </div>
  );
}
