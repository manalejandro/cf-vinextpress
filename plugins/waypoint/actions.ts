"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/press/auth";
import { db, first, num } from "@/press/db/client";

/** Waypoint dashboard mutations. */

const BACK = "/admin/ext/waypoint";

function normalizePath(value: string): string {
  let path = value.trim();
  if (!path) return "";
  if (!path.startsWith("/") && !path.startsWith("http")) path = `/${path}`;
  if (path.startsWith("/") && path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

export async function addRedirectAction(formData: FormData): Promise<void> {
  await requireUser("editor");
  const source = normalizePath(String(formData.get("source") ?? ""));
  const target = String(formData.get("target") ?? "").trim();
  const status = String(formData.get("status") ?? "301") === "302" ? 302 : 301;

  if (!source || !target) redirect(`${BACK}?error=source-and-target-are-required`);
  if (source === target) redirect(`${BACK}?error=source-and-target-are-identical`);
  if (!target.startsWith("/") && !/^https?:\/\//i.test(target)) redirect(`${BACK}?error=target-must-be-a-path-or-url`);

  const existing = await first(
    db().prepare("SELECT id FROM vp_redirects WHERE source = ?1").bind(source),
    (r) => num(r, "id"),
  );
  if (existing) redirect(`${BACK}?error=source-already-exists`);

  await db()
    .prepare("INSERT INTO vp_redirects (source, target, status_code, hits, active) VALUES (?1, ?2, ?3, 0, 1)")
    .bind(source, target.slice(0, 500), status)
    .run();
  redirect(`${BACK}?added=1`);
}

export async function toggleRedirectAction(formData: FormData): Promise<void> {
  await requireUser("editor");
  const id = Number(formData.get("id") ?? 0);
  await db().prepare("UPDATE vp_redirects SET active = 1 - active WHERE id = ?1").bind(id).run();
  redirect(BACK);
}

export async function deleteRedirectAction(formData: FormData): Promise<void> {
  await requireUser("editor");
  const id = Number(formData.get("id") ?? 0);
  await db().prepare("DELETE FROM vp_redirects WHERE id = ?1").bind(id).run();
  redirect(BACK);
}
