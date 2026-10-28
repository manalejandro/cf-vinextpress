import { getCurrentUser } from "@/press/auth";
import { createPostFromRequest, listPostsResponse } from "@/press/api/posts";
import { handleRest } from "@/press/rest";

export const dynamic = "force-dynamic";

/** GET /api/v1/pages — public listing of published pages. */
export async function GET(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    return listPostsResponse(new URL(request.url), "page", user);
  });
}

/** POST /api/v1/pages — create a page (authenticated). */
export async function POST(request: Request): Promise<Response> {
  return handleRest(() => createPostFromRequest(request, "page"));
}
