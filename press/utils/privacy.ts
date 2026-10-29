import { getSecretKey } from "../options";

/**
 * Privacy helpers: one-way pseudonymization of visitor IPs so plugins can
 * rate-limit and de-duplicate without storing personal data.
 */
export async function hashIp(ip: string, context = ""): Promise<string> {
  if (!ip) return "";
  const secret = await getSecretKey();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${context}|${ip}`));
  const bytes = new Uint8Array(sig).slice(0, 12);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}
