import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../../server/http.ts";
import { addMember, listMembers } from "../../../../../modules/memberships/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const projectIdSchema = z.uuid("Choose a valid project.");

function failed(error: unknown): Response {
  if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the membership fields." } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the membership request." } }, { status: 500, headers });
}

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { projectId } = await context.params;
    return Response.json({ data: await listMembers(await currentUserResolver.get(), projectIdSchema.parse(projectId)) }, { headers });
  } catch (error) { return failed(error); }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { projectId } = await context.params;
    return Response.json({ data: await addMember(await currentUserResolver.get(), projectIdSchema.parse(projectId), await readJsonRequest(request)) }, { status: 201, headers });
  } catch (error) { return failed(error); }
}
