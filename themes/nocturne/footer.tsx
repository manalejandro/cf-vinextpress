import type { HeaderProps } from "../../press/themes/types";

/** Nocturne footer: a single quiet bar with mono type. */
export function SiteFooter({ site }: HeaderProps) {
  const { siteTitle } = site.settings;
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-24 border-t border-[var(--vp-line)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="vp-font-mono text-xs text-[var(--vp-muted)]">
          © {year} {siteTitle} — rendered on Cloudflare Workers
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <a href="/feed" className="vp-font-mono text-xs text-[var(--vp-muted)] hover:text-[var(--vp-accent)]">
            rss
          </a>
          <a href="/sitemap.xml" className="vp-font-mono text-xs text-[var(--vp-muted)] hover:text-[var(--vp-accent)]">
            sitemap
          </a>
          <a href="/search" className="vp-font-mono text-xs text-[var(--vp-muted)] hover:text-[var(--vp-accent)]">
            search
          </a>
          <a href="/admin" className="vp-font-mono text-xs text-[var(--vp-muted)] hover:text-[var(--vp-accent)]">
            dashboard
          </a>
        </nav>
      </div>
      <p className="pb-6 text-center vp-font-mono text-[10px] tracking-widest text-[var(--vp-line)] uppercase">
        powered by vinextpress
      </p>
    </footer>
  );
}
