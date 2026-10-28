"use client";

import { useActionState } from "react";
import { installAction, loginAction, type FormState } from "../actions";

/** Client wrappers for auth forms so failures render inline via useActionState. */

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Username or email
        <input
          name="username"
          autoComplete="username"
          required
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
        />
      </label>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function InstallForm({ defaultSiteUrl }: { defaultSiteUrl: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(installAction, {});
  const input =
    "rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Site title
        <input name="site_title" required defaultValue="My VinextPress site" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Tagline <span className="font-normal text-slate-400">(optional)</span>
        <input name="site_tagline" defaultValue="Publishing at the edge" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Site URL <span className="font-normal text-slate-400">(used for feeds, sitemaps and meta tags)</span>
        <input name="site_url" type="url" placeholder="https://example.com" defaultValue={defaultSiteUrl} className={input} />
      </label>
      <div className="my-1 border-t border-slate-200" />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Admin username
        <input name="admin_username" required minLength={3} maxLength={60} autoComplete="username" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Admin email
        <input name="admin_email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Admin password <span className="font-normal text-slate-400">(8 characters minimum)</span>
        <input name="admin_password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </label>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-500 disabled:opacity-60"
      >
        {pending ? "Installing…" : "Install VinextPress"}
      </button>
    </form>
  );
}
