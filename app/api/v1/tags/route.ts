import { makeTermCreateHandler, makeTermListHandler } from "@/press/api/terms";

export const dynamic = "force-dynamic";

const list = makeTermListHandler("tag");
const create = makeTermCreateHandler("tag");

export async function GET(request: Request): Promise<Response> {
  return list(request);
}

export async function POST(request: Request): Promise<Response> {
  return create(request);
}
