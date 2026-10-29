"use server";

import { redirect } from "next/navigation";
import { can, requireUser } from "@/press/auth";
import { db } from "@/press/db/client";
import { setOption } from "@/press/options";
import { revalidateSite } from "@/press/cache";

/** Dashboard mutations for Formsmith (entries + form schemas). */

const BACK = "/admin/ext/formsmith";

export async function setEntryStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser("editor");
  if (!can(user, "moderate_comments")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  const status = String(formData.get("status") ?? "new");
  if (!["new", "read", "trash"].includes(status)) throw new Error("Invalid status.");
  await db().prepare("UPDATE vp_form_entries SET status = ?1 WHERE id = ?2").bind(status, id).run();
  const back = String(formData.get("back") ?? BACK);
  redirect(back.startsWith(BACK) ? back : BACK);
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser("editor");
  if (!can(user, "moderate_comments")) throw new Error("Insufficient permissions.");
  const id = Number(formData.get("id") ?? 0);
  await db().prepare("DELETE FROM vp_form_entries WHERE id = ?1").bind(id).run();
  redirect(`${BACK}?deleted=1`);
}

/** Save the form-schema JSON (option `formsmith_forms`). */
export async function saveFormsSchemaAction(formData: FormData): Promise<void> {
  await requireUser("administrator");
  const raw = String(formData.get("schema") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect(`${BACK}?schema=invalid-json`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    redirect(`${BACK}?schema=invalid-shape`);
  }
  await setOption("formsmith_forms", JSON.stringify(parsed));
  revalidateSite();
  redirect(`${BACK}?schema=saved`);
}
