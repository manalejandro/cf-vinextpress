import type { HeaderProps } from "../../press/themes/types";
import { VINEXTPRESS_REPO } from "../../press/version";

/** Broadsheet footer: ruled columns in the newspaper tradition. */
export function SiteFooter({ site }: HeaderProps) {
  const { siteTitle, navMenu } = site.settings;
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-16 border-t-2 border-[var(--vp-ink)] bg-[var(--vp-card)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
        <div>
          <p className="vp-font-head text-xl font-black text-[var(--vp-ink)]">{siteTitle}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--vp-muted)]">
            {site.description || "Stories, notes and dispatches — set in the classic broadsheet manner."}
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <p className="vp-font-mono text-[10px] font-bold tracking-widest text-[var(--vp-muted)] uppercase">Sections</p>
          <ul className="mt-3 space-y-1.5">
            {navMenu.map((item) => (
              <li key={`${item.url}-${item.label}`}>
                <a href={item.url} className="text-sm text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="vp-font-mono text-[10px] font-bold tracking-widest text-[var(--vp-muted)] uppercase">Elsewhere</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <a href="/feed" className="text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                RSS feed
              </a>
            </li>
            <li>
              <a href="/sitemap.xml" className="text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                Sitemap
              </a>
            </li>
            <li>
              <a href="/admin" className="text-[var(--vp-ink)] hover:text-[var(--vp-accent)]">
                Dashboard
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--vp-line)]">
        <p className="mx-auto max-w-6xl px-5 py-4 text-center vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">
          © {year} {siteTitle} · set in{" "}
          <a href={VINEXTPRESS_REPO} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--vp-accent)]">
            VinextPress
          </a>{" "}
          · printed at the edge
        </p>
      </div>
    </footer>
  );
}
