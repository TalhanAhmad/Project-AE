import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../server/current-user.ts";
import { DomainError } from "../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../server/http.ts";
import { deleteMilestone, updateMilestone } from "../../../../modules/milestones/service.ts";
import { milestoneValidationErrors } from "../../../../modules/milestones/schemas.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const milestoneId = z.uuid("Choose a valid milestone.");
type Context = { params: Promise<{ milestoneId: string }> };

function failed(error: unknown): Response {
  if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the milestone fields.", fields: milestoneValidationErrors(error) } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the milestone request." } }, { status: 500, headers });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try { const { milestoneId: value } = await context.params; return Response.json({ data: await updateMilestone(await currentUserResolver.get(), milestoneId.parse(value), await readJsonRequest(request)) }, { headers }); }
  catch (error) { return failed(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try { const { milestoneId: value } = await context.params; await deleteMilestone(await currentUserResolver.get(), milestoneId.parse(value), await readJsonRequest(request)); return Response.json({ data: { id: value } }, { headers }); }
  catch (error) { return failed(error); }
}
