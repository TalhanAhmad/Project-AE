import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { listActivity } from "../../../../../modules/activity/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const id = z.uuid("Choose a valid project.");
type Context = { params: Promise<{ projectId: string }> };

function failed(error: unknown): Response {
  if (error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Choose a valid project." } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to load activity." } }, { status: 500, headers });
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const { projectId } = await context.params;
    return Response.json({ data: await listActivity(await currentUserResolver.get(), id.parse(projectId)) }, { headers });
  } catch (error) { return failed(error); }
}
