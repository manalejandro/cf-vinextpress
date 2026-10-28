import type { ReactNode } from "react";
import type { User } from "@/press/types";
import { VINEXTPRESS_VERSION } from "@/press/version";
import { AdminNav } from "./nav";
import { logoutAction } from "../actions";

/** Dashboard chrome: sidebar navigation, top bar, footer. */

export function AdminShell({
  user,
  siteTitle,
  children,
}: {
  user: User;
  siteTitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-sm font-black text-white">
            V
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">VinextPress</p>
            <p className="text-[11px] text-slate-400">v{VINEXTPRESS_VERSION}</p>
          </div>
        </div>
        <AdminNav className="flex-1 overflow-y-auto px-3 py-2 text-slate-300" />
        <div className="border-t border-slate-800 px-5 py-4">
          <p className="truncate text-xs text-slate-400">{siteTitle}</p>
          <a
            href="/"
            target="_blank"
            className="mt-1 inline-block text-xs font-medium text-orange-400 hover:text-orange-300"
          >
            View site ↗
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-600 text-xs font-black text-white">
              V
            </span>
            <span className="text-sm font-bold">VinextPress</span>
          </div>
          <div className="hidden text-sm text-slate-500 lg:block">
            Signed in as <span className="font-medium text-slate-800">{user.displayName}</span>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 capitalize">
              {user.role}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 lg:hidden"
            >
              View site ↗
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="lg:hidden">
          <AdminNav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 text-slate-600" horizontal />
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="px-6 pb-6 text-center text-[11px] text-slate-400">
          VinextPress v{VINEXTPRESS_VERSION} — running on Cloudflare Workers
        </footer>
      </div>
    </div>
  );
}
