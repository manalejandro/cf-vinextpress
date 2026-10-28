import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { freshSettings } from "@/press/options";
import { countUsers } from "@/press/models/users";
import { InstallForm } from "../components/auth-forms";

export const metadata: Metadata = { title: "Install" };
export const dynamic = "force-dynamic";

/**
 * The setup wizard. Shown while the site has no users; creates the schema
 * (if needed), the administrator account and starter content, then signs
 * you in. Reads the request origin only to prefill the Site URL field —
 * this page is dynamic anyway.
 */
export default async function InstallPage() {
  const settings = await freshSettings();
  const users = await countUsers();
  if (settings.installed && users > 0) redirect("/admin");

  let defaultSiteUrl = "";
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
    if (host) {
      const proto = headersList.get("x-forwarded-proto") ?? "https";
      defaultSiteUrl = `${proto.split(",")[0]}://${host.split(",")[0]}`;
    }
  } catch {
    // Headers unavailable (e.g. prerender); the field stays empty.
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-xl font-black text-white shadow-lg shadow-orange-600/25">
            V
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to VinextPress</h1>
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            A one-minute installation: pick a name, create your administrator account, and your site is live on
            the edge.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <InstallForm defaultSiteUrl={defaultSiteUrl} />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          The installer seeds a welcome post, an About page and a sample comment.
          <br />
          Everything can be edited or deleted afterwards.
        </p>
      </div>
    </main>
  );
}
