import type { HeaderProps } from "../../press/themes/types";

/** Nocturne header: a compact sticky bar with a signal-dot brand. */
export function SiteHeader({ site, path }: HeaderProps) {
  const { siteTitle, navMenu } = site.settings;
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--vp-line)] bg-[var(--vp-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--vp-accent)] shadow-[0_0_12px_var(--vp-accent)]"
          />
          <span className="text-sm font-bold tracking-[0.2em] text-[var(--vp-ink)] uppercase">{siteTitle}</span>
        </a>

        <nav aria-label="Main navigation" className="flex items-center gap-5">
          {navMenu.map((item) => (
            <a
              key={`${item.url}-${item.label}`}
              href={item.url}
              aria-current={isActive(item.url) ? "page" : undefined}
              className={`vp-font-mono text-xs tracking-wider uppercase transition-colors ${
                isActive(item.url) ? "text-[var(--vp-accent)]" : "text-[var(--vp-muted)] hover:text-[var(--vp-ink)]"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/search"
            aria-label="Search"
            className="vp-font-mono text-xs text-[var(--vp-muted)] transition-colors hover:text-[var(--vp-accent)]"
          >
            [⌕]
          </a>
        </nav>
      </div>
    </header>
  );
}
