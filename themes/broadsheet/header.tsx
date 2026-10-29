import type { HeaderProps } from "../../press/themes/types";
import { formatDate } from "../../press/utils/dates";

/** Broadsheet masthead: dateline, centered title, ruled navigation. */
export function SiteHeader({ site, path }: HeaderProps) {
  const { siteTitle, siteTagline, navMenu } = site.settings;
  const today = formatDate(new Date().toISOString().replace("T", " ").slice(0, 19), "long");
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <header className="border-b-2 border-[var(--vp-ink)] bg-[var(--vp-card)]">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center justify-between border-b border-[var(--vp-line)] py-1.5 vp-font-mono text-[10px] tracking-widest text-[var(--vp-muted)] uppercase">
          <span>{today}</span>
          <span className="hidden sm:block">{siteTagline || "Independent publishing"}</span>
          <a href="/feed" className="hover:text-[var(--vp-accent)]">
            rss
          </a>
        </div>

        <div className="py-6 text-center">
          <a href="/" className="vp-font-head text-4xl font-black tracking-tight text-[var(--vp-ink)] sm:text-5xl">
            {siteTitle}
          </a>
        </div>

        <nav aria-label="Main navigation" className="flex flex-wrap items-center justify-center gap-x-7 gap-y-1 border-t border-[var(--vp-line)] py-2.5">
          {navMenu.map((item) => (
            <a
              key={`${item.url}-${item.label}`}
              href={item.url}
              aria-current={isActive(item.url) ? "page" : undefined}
              className={`text-[13px] font-bold tracking-wide uppercase transition-colors ${
                isActive(item.url) ? "text-[var(--vp-accent)]" : "text-[var(--vp-ink)] hover:text-[var(--vp-accent)]"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a href="/search" aria-label="Search" className="text-[13px] font-bold text-[var(--vp-muted)] hover:text-[var(--vp-accent)]">
            Search ⌕
          </a>
        </nav>
      </div>
    </header>
  );
}
