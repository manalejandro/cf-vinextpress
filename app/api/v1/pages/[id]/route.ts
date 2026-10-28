import { deletePostFromRequest, getPostResponse, updatePostFromRequest } from "@/press/api/posts";
import { handleRest } from "@/press/rest";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(() => getPostResponse(id, "page"));
}

export async function PUT(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(() => updatePostFromRequest(request, id, "page"));
}

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(() => updatePostFromRequest(request, id, "page"));
}

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
  const { id } = await ctx.params;
  return handleRest(() => deletePostFromRequest(new URL(request.url), id, "page"));
}
