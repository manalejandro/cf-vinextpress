import { requireUser } from "@/press/auth";
import { createTerm, listTerms } from "@/press/models/terms";
import { handleRest, json, serializeTerm } from "@/press/rest";
import { revalidateSite } from "@/press/cache";
import type { Taxonomy } from "@/press/types";

/** Shared handlers for /api/v1/categories and /api/v1/tags. */

export function makeTermListHandler(taxonomy: Taxonomy) {
  return async function GET(request: Request): Promise<Response> {
    return handleRest(async () => {
      const url = new URL(request.url);
      const hideEmpty = url.searchParams.get("hide_empty") === "true";
      const terms = await listTerms(taxonomy, { hideEmpty });
      return json(terms.map(serializeTerm));
    });
  };
}

export function makeTermCreateHandler(taxonomy: Taxonomy) {
  return async function POST(request: Request): Promise<Response> {
    return handleRest(async () => {
      await requireUser("editor");
      const body = (await request.json().catch(() => null)) as { name?: string; slug?: string; description?: string } | null;
      const name = body?.name?.trim();
      if (!name) {
        return json({ code: 400, message: "Field 'name' is required" }, { status: 400 });
      }
      const term = await createTerm(taxonomy, name, {
        slug: body?.slug,
        description: body?.description,
      });
      revalidateSite();
      return json(serializeTerm({ ...term, count: 0 }), { status: 201 });
    });
  };
}
