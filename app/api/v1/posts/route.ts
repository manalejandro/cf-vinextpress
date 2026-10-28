import { getCurrentUser } from "@/press/auth";
import { createPostFromRequest, listPostsResponse } from "@/press/api/posts";
import { handleRest } from "@/press/rest";

export const dynamic = "force-dynamic";

/** GET /api/v1/posts — public listing of published posts (filters: search, category, author, status*, page, per_page). */
export async function GET(request: Request): Promise<Response> {
  return handleRest(async () => {
    const user = await getCurrentUser();
    return listPostsResponse(new URL(request.url), "post", user);
  });
}

/** POST /api/v1/posts — create a post (authenticated). */
export async function POST(request: Request): Promise<Response> {
  return handleRest(() => createPostFromRequest(request, "post"));
}
