import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../../server/http.ts";
import { createMilestone, listMilestones } from "../../../../../modules/milestones/service.ts";
import { milestoneValidationErrors } from "../../../../../modules/milestones/schemas.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const projectId = z.uuid("Choose a valid project.");
type Context = { params: Promise<{ projectId: string }> };

function failed(error: unknown): Response {
  if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the milestone fields.", fields: milestoneValidationErrors(error) } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the milestone request." } }, { status: 500, headers });
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try { const { projectId: value } = await context.params; return Response.json({ data: await listMilestones(await currentUserResolver.get(), projectId.parse(value)) }, { headers }); }
  catch (error) { return failed(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try { const { projectId: value } = await context.params; return Response.json({ data: await createMilestone(await currentUserResolver.get(), projectId.parse(value), await readJsonRequest(request)) }, { status: 201, headers }); }
  catch (error) { return failed(error); }
}
