import { Fragment, type CSSProperties, type ReactNode } from "react";
import { getPress } from "@/press/context";
import { CoreHooks } from "@/press/hooks";

/**
 * The frontend shell: wraps every public route in the active theme's
 * header/footer and injects the theme palette as CSS custom properties,
 * so switching themes repaints the whole site without a rebuild.
 */
export default async function FrontendLayout({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<{ path?: string[] }>;
}) {
  const press = await getPress();
  const theme = press.theme;

  let pathname = "/";
  try {
    const resolved = params ? await params : undefined;
    const segments = resolved?.path;
    if (segments && segments.length > 0) {
      pathname = `/${segments.map(decodeURIComponent).join("/")}`;
    }
  } catch {
    // Layouts may render without params (e.g. error boundaries); default to "/".
  }

  const { SiteHeader, SiteFooter } = theme.templates;
  const palette = (theme.manifest.palette ?? {}) as CSSProperties;

  // Plugins/themes may contribute end-of-body nodes (consent banners, beacons…).
  const footerExtras = await press.applyFilters<unknown[]>(CoreHooks.DocumentFooter, [], [press]);

  return (
    <div className="vp-theme flex min-h-screen flex-col" data-theme={theme.manifest.slug} style={palette}>
      <a
        href="#vp-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-[var(--vp-accent)] focus:px-3 focus:py-1.5 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader press={press} site={press.site} path={pathname} />
      <main id="vp-main" className="flex-1">
        {children}
      </main>
      <SiteFooter press={press} site={press.site} path={pathname} />
      {footerExtras.map((node, index) => (
        <Fragment key={index}>{node as ReactNode}</Fragment>
      ))}
    </div>
  );
}
