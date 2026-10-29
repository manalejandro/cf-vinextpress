import type { HeaderProps } from "../../press/themes/types";
import { VINEXTPRESS_REPO } from "../../press/version";

/** Kite footer: one centered, quiet line. */
export function SiteFooter({ site }: HeaderProps) {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--vp-line)]">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 py-10 text-center">
        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-[var(--vp-accent)]" />
        <p className="text-sm text-[var(--vp-muted)]">
          © {year} {site.settings.siteTitle}
          {site.description ? ` — ${site.description}` : ""}
        </p>
        <p className="text-xs text-[var(--vp-muted)]/80">
          <a href="/feed" className="hover:text-[var(--vp-accent)]">RSS</a>
          {" · "}
          <a href="/sitemap.xml" className="hover:text-[var(--vp-accent)]">Sitemap</a>
          {" · "}
          <a href={VINEXTPRESS_REPO} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--vp-accent)]">
            VinextPress
          </a>
        </p>
      </div>
    </footer>
  );
}
