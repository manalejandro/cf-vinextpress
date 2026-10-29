import type { HeaderProps } from "../../press/themes/types";

/** Kite header: a slim, quiet bar with a square mark. */
export function SiteHeader({ site, path }: HeaderProps) {
  const { siteTitle, navMenu } = site.settings;
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--vp-line)] bg-[var(--vp-card)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
        <a href="/" className="flex items-center gap-2.5">
          <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rotate-45 rounded-[3px] bg-[var(--vp-accent)]" />
          <span className="text-[15px] font-semibold tracking-tight text-[var(--vp-ink)]">{siteTitle}</span>
        </a>
        <nav aria-label="Main navigation" className="flex items-center gap-5">
          {navMenu.map((item) => (
            <a
              key={`${item.url}-${item.label}`}
              href={item.url}
              aria-current={isActive(item.url) ? "page" : undefined}
              className={`text-[13px] transition-colors ${
                isActive(item.url) ? "font-semibold text-[var(--vp-accent)]" : "text-[var(--vp-muted)] hover:text-[var(--vp-ink)]"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a href="/search" aria-label="Search" className="text-[var(--vp-muted)] transition-colors hover:text-[var(--vp-accent)]">
            ⌕
          </a>
        </nav>
      </div>
    </header>
  );
}
