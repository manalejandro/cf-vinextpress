import type { HeaderProps } from "../../press/themes/types";

/** Meridian masthead: a newspaper-style brand block with a hairline rule. */
export function SiteHeader({ site, path }: HeaderProps) {
  const { siteTitle, siteTagline, navMenu } = site.settings;
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <header className="border-b-4 border-double border-[var(--vp-line)] bg-[var(--vp-card)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <a href="/" className="group">
          <span className="vp-font-head block text-3xl font-bold tracking-tight text-[var(--vp-ink)]">
            {siteTitle}
          </span>
          {siteTagline ? (
            <span className="mt-1 block text-sm italic text-[var(--vp-muted)]">{siteTagline}</span>
          ) : null}
        </a>

        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {navMenu.map((item) => (
            <a
              key={`${item.url}-${item.label}`}
              href={item.url}
              aria-current={isActive(item.url) ? "page" : undefined}
              className={`vp-font-body text-sm font-medium tracking-wide uppercase transition-colors ${
                isActive(item.url)
                  ? "text-[var(--vp-accent)]"
                  : "text-[var(--vp-muted)] hover:text-[var(--vp-ink)]"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/search"
            aria-label="Search"
            className="text-lg text-[var(--vp-muted)] transition-colors hover:text-[var(--vp-accent)]"
          >
            ⌕
          </a>
        </nav>
      </div>
    </header>
  );
}
