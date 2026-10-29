import type { HeaderProps } from "../../press/themes/types";
import { VINEXTPRESS_REPO } from "../../press/version";

/** Meridian footer: three columns — brand, menu and utilities. */
export function SiteFooter({ site }: HeaderProps) {
  const { siteTitle, siteTagline, navMenu } = site.settings;
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-20 border-t border-[var(--vp-line)] bg-[var(--vp-card)]">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 sm:grid-cols-3">
        <div>
          <p className="vp-font-head text-lg font-bold text-[var(--vp-ink)]">{siteTitle}</p>
          {siteTagline ? <p className="mt-2 text-sm italic text-[var(--vp-muted)]">{siteTagline}</p> : null}
        </div>

        <nav aria-label="Footer navigation">
          <p className="text-xs font-semibold tracking-widest text-[var(--vp-muted)] uppercase">Menu</p>
          <ul className="mt-3 space-y-2">
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
          <p className="text-xs font-semibold tracking-widest text-[var(--vp-muted)] uppercase">Subscribe</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--vp-ink)]">
            <li>
              <a href="/feed" className="hover:text-[var(--vp-accent)]">
                RSS feed
              </a>
            </li>
            <li>
              <a href="/sitemap.xml" className="hover:text-[var(--vp-accent)]">
                Sitemap
              </a>
            </li>
            <li>
              <a href="/admin" className="hover:text-[var(--vp-accent)]">
                Dashboard
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--vp-line)]">
        <p className="mx-auto max-w-5xl px-6 py-5 text-xs text-[var(--vp-muted)]">
          © {year} {siteTitle}. Published with{" "}
          <a
            href={VINEXTPRESS_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--vp-ink)] transition-colors hover:text-[var(--vp-accent)]"
          >
            VinextPress
          </a>{" "}
          on Cloudflare Workers.
        </p>
      </div>
    </footer>
  );
}
