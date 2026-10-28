import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/press/auth";
import { freshSettings } from "@/press/options";
import { LoginForm } from "../components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await freshSettings();
  if (!settings.installed) redirect("/admin/install");
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-xl font-black text-white shadow-lg shadow-orange-600/25">
            V
          </span>
          <h1 className="text-xl font-bold text-slate-900">VinextPress</h1>
          <p className="text-sm text-slate-500">Sign in to {settings.siteTitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600">
            ← Back to {settings.siteTitle}
          </Link>
        </p>
      </div>
    </main>
  );
}
