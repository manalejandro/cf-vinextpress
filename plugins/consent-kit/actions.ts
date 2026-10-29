"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/press/auth";
import { setOption } from "@/press/options";

/** Consent Kit settings persistence. */

export async function saveConsentSettingsAction(formData: FormData): Promise<void> {
  await requireUser("administrator");
  const message = String(formData.get("message") ?? "").trim().slice(0, 400);
  const position = String(formData.get("position") ?? "bottom") === "top" ? "top" : "bottom";
  const expiryDays = Math.min(365, Math.max(1, Number(formData.get("expiry_days") ?? 180) || 180));
  const moreUrl = String(formData.get("more_url") ?? "").trim().slice(0, 300);
  const acceptLabel = String(formData.get("accept_label") ?? "Accept").trim().slice(0, 40) || "Accept";
  const declineLabel = String(formData.get("decline_label") ?? "Decline").trim().slice(0, 40) || "Decline";

  await setOption("consent_message", message);
  await setOption("consent_position", position);
  await setOption("consent_expiry_days", String(expiryDays));
  await setOption("consent_more_url", moreUrl && /^https?:\/\//.test(moreUrl) ? moreUrl : "");
  await setOption("consent_accept_label", acceptLabel);
  await setOption("consent_decline_label", declineLabel);
  redirect("/admin/ext/consent-kit?saved=1");
}
