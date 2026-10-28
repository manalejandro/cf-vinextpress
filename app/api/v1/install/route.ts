import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/press/auth";
import { countUsers } from "@/press/models/users";
import { getUserCredentials } from "@/press/models/users";
import { freshSettings } from "@/press/options";
import { installSite } from "@/press/install";
import { handleRest, json } from "@/press/rest";
import { HttpError } from "@/press/auth";
import { revalidateSite } from "@/press/cache";

/**
 * POST /api/v1/install — scripted installation, mirroring the dashboard
 * wizard. Only available while the site has no users; signs the new
 * administrator in via a session cookie in the response.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const settings = await freshSettings();
    const users = await countUsers();
    return json({ installed: settings.installed && users > 0 });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRest(async () => {
    const settings = await freshSettings();
    const users = await countUsers();
    if (settings.installed || users > 0) {
      throw new HttpError(409, "This site is already installed.");
    }

    const body = (await request.json().catch(() => null)) as {
      site_title?: string;
      site_tagline?: string;
      site_url?: string;
      admin_username?: string;
      admin_email?: string;
      admin_password?: string;
    } | null;

    const siteTitle = body?.site_title?.trim() ?? "";
    const adminUsername = body?.admin_username?.trim() ?? "";
    const adminEmail = body?.admin_email?.trim() ?? "";
    const adminPassword = body?.admin_password ?? "";
    const siteUrl = (body?.site_url ?? "").trim().replace(/\/+$/, "");

    if (!siteTitle) throw new HttpError(400, "site_title is required");
    if (!/^[a-zA-Z0-9 ._@-]{3,60}$/.test(adminUsername)) {
      throw new HttpError(400, "admin_username must be 3–60 characters (letters, numbers, spaces, . _ @ -)");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new HttpError(400, "a valid admin_email is required");
    if (adminPassword.length < 8) throw new HttpError(400, "admin_password must be at least 8 characters");
    if (siteUrl && !/^https?:\/\/[^\s]+$/i.test(siteUrl)) throw new HttpError(400, "site_url must start with http(s)://");

    await installSite({
      siteTitle,
      siteTagline: body?.site_tagline?.trim() || undefined,
      adminUsername,
      adminEmail,
      adminPassword,
      siteUrl: siteUrl || undefined,
    });
    revalidateSite();

    // Sign the new administrator in.
    const headers = new Headers();
    const creds = await getUserCredentials(adminUsername);
    if (creds) {
      const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
      const token = await signSession(creds.id, creds.role, expires);
      headers.append(
        "set-cookie",
        `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly;${
          process.env.NODE_ENV === "production" ? " Secure;" : ""
        } SameSite=Lax`,
      );
    }

    return json({ installed: true, admin: adminUsername }, { status: 201, headers });
  });
}
