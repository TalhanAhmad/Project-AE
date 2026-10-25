import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../../server/http.ts";
import { setTaskMilestone } from "../../../../../modules/milestones/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const taskId = z.uuid("Choose a valid task.");
type Context = { params: Promise<{ taskId: string }> };

function failed(error: unknown): Response {
  if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the task milestone request." } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to change the task milestone." } }, { status: 500, headers });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try { const { taskId: value } = await context.params; return Response.json({ data: await setTaskMilestone(await currentUserResolver.get(), taskId.parse(value), await readJsonRequest(request)) }, { headers }); }
  catch (error) { return failed(error); }
}
