import type { NotFoundProps } from "../../press/themes/types";

/** Broadsheet 404: a front-page-style correction notice. */
export function NotFound({ site }: NotFoundProps) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <p className="vp-font-mono text-[10px] font-bold tracking-[0.25em] text-[var(--vp-accent)] uppercase">Correction</p>
      <h1 className="vp-font-head mt-3 text-5xl font-black text-[var(--vp-ink)]">404 — nothing on the wire</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-[var(--vp-muted)]">
        The page you asked for was never set in type at {site.settings.siteTitle}. It may have moved sections, or
        never existed at all.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <a href="/" className="vp-button vp-button-solid">
          Front page
        </a>
        <a href="/search" className="vp-button vp-button-ghost">
          Search the archive
        </a>
      </div>
    </div>
  );
}
