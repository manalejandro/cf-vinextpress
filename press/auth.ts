import { cache } from "react";
import { cookies } from "next/headers";
import { getSecretKey } from "./options";
import { getUserById, roleAtLeast } from "./models/users";
import type { User, UserRole } from "./types";

/**
 * Authentication primitives built entirely on WebCrypto, so they run
 * identically in local dev and on Workers:
 * - Passwords: PBKDF2-SHA256, 100k iterations, per-user salt.
 * - Sessions: stateless cookies signed with HMAC-SHA256 using the
 *   per-installation site secret stored in the options table.
 */

export const SESSION_COOKIE = "vinextpress_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const PBKDF2_ITERATIONS = 100_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64Url(parts[2]!);
  const expected = fromBase64Url(parts[3]!);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  const derived = new Uint8Array(bits);
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i]! ^ expected[i]!;
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(userId: number, role: UserRole, expiresAt: number): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ uid: userId, role, exp: expiresAt })));
  const key = await hmacKey(await getSecretKey());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string): Promise<{ uid: number; role: UserRole; exp: number } | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  try {
    const key = await hmacKey(await getSecretKey());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { uid: number; role: UserRole; exp: number };
    if (!data?.uid || typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** The signed-in user for the current request, or null. Memoized per request. */
export const getCurrentUser: () => Promise<User | null> = cache(async () => {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await verifySession(token);
    if (!session) return null;
    return getUserById(session.uid);
  } catch {
    return null;
  }
});

/** Error carrying an HTTP status, translated to JSON by the REST helpers. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser(minimumRole: UserRole = "author"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Authentication required");
  if (!roleAtLeast(user, minimumRole)) {
    throw new HttpError(403, "Insufficient permissions");
  }
  return user;
}

/** Capability matrix, deliberately small and readable. */
export function can(user: Pick<User, "role"> | null, capability: string): boolean {
  if (!user) return false;
  switch (capability) {
    case "manage_options":
    case "manage_plugins":
    case "switch_themes":
    case "manage_users":
    case "delete_users":
      return roleAtLeast(user, "administrator");
    case "moderate_comments":
    case "edit_others_posts":
    case "delete_others_posts":
    case "publish_pages":
      return roleAtLeast(user, "editor");
    case "edit_posts":
    case "upload_files":
    case "publish_posts":
      return roleAtLeast(user, "author");
    default:
      return false;
  }
}

export function canEditPost(user: User, post: { authorId: number }): boolean {
  return roleAtLeast(user, "editor") || post.authorId === user.id;
}
