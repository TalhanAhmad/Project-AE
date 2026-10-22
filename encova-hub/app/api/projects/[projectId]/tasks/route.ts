import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../../server/http.ts";
import { createTask, listTasks } from "../../../../../modules/tasks/service.ts";
import { taskValidationErrors } from "../../../../../modules/tasks/schemas.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const id = z.uuid("Choose a valid project.");
type Context = { params: Promise<{ projectId: string }> };
function failed(error: unknown): Response {
  if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the task fields.", fields: taskValidationErrors(error) } }, { status: 422, headers });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the task request." } }, { status: 500, headers });
}
export async function GET(_request: Request, context: Context) { try { const { projectId } = await context.params; return Response.json({ data: await listTasks(await currentUserResolver.get(), id.parse(projectId)) }, { headers }); } catch (error) { return failed(error); } }
export async function POST(request: Request, context: Context) { try { const { projectId } = await context.params; return Response.json({ data: await createTask(await currentUserResolver.get(), id.parse(projectId), await readJsonRequest(request)) }, { status: 201, headers }); } catch (error) { return failed(error); } }
