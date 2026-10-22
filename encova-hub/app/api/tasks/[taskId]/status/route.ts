import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../../server/current-user.ts";
import { DomainError } from "../../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../../server/http.ts";
import { changeTaskStatus } from "../../../../../modules/tasks/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failed(error: unknown): Response { if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers }); if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the task status." } }, { status: 422, headers }); return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to update the task." } }, { status: 500, headers }); }
export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) { try { const { taskId } = await context.params; return Response.json({ data: await changeTaskStatus(await currentUserResolver.get(), z.uuid().parse(taskId), await readJsonRequest(request)) }, { headers }); } catch (error) { return failed(error); } }
