import { getCurrentUser } from "@/press/auth";
import { handleRest, json } from "@/press/rest";

export const dynamic = "force-dynamic";

/** GET /api/v1/users/me — the authenticated user, or 401. */
export async function GET(): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    if (!user) return json({ code: 401, message: "Not authenticated" }, { status: 401 });
    const { serializeUser } = await import("@/press/rest");
    return json(serializeUser(user));
  });
}
