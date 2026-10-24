import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { currentUserResolver } from "../../../server/current-user.ts";
import { DomainError } from "../../../server/errors.ts";
import { listWorkspace } from "../../../modules/tasks/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function query(url: URL): Record<string, string> { return Object.fromEntries(url.searchParams.entries()); }
export async function GET(request: Request): Promise<Response> {
  try { return Response.json(await listWorkspace(await currentUserResolver.get(), query(new URL(request.url))), { headers }); }
  catch (error) {
    if (error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
    if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the task search options." } }, { status: 422, headers });
    const requestId = randomUUID(); console.error("tasks.workspace.load.failed", { code: "INTERNAL_ERROR", requestId });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to load tasks.", requestId } }, { status: 500, headers: { ...headers, "X-Request-Id": requestId } });
  }
}
