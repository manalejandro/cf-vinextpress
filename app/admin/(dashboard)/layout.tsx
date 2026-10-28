import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/press/auth";
import { freshSettings } from "@/press/options";
import { countUsers } from "@/press/models/users";
import { AdminShell } from "../components/shell";

/**
 * Every page inside this group requires an installed site and an
 * authenticated session; otherwise the visitor is bounced to the
 * installer or the login screen.
 */

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const settings = await freshSettings();
  if (!settings.installed) {
    const users = await countUsers();
    redirect(users === 0 ? "/admin/install" : "/admin/login");
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return (
    <AdminShell user={user} siteTitle={settings.siteTitle}>
      {children}
    </AdminShell>
  );
}
