import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Root dashboard layout. The auth guard lives in the (dashboard) group so
 * /admin/login and /admin/install stay reachable; every admin page is
 * dynamic and never cached.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Dashboard – VinextPress",
    template: "%s – VinextPress",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="vp-admin min-h-screen bg-slate-100 text-slate-900">{children}</div>;
}
