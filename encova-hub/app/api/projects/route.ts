import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { listProjects, createProject } from "../../../modules/projects/service.ts";
import { projectValidationErrors } from "../../../modules/projects/schemas.ts";
import { DomainError } from "../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../server/http.ts";
import { currentUserResolver } from "../../../server/current-user.ts";
import { logFailure } from "../../../server/logger.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

function failed(error: unknown, action: "list" | "create", startedAt: number): Response {
  if (error instanceof RequestError || error instanceof DomainError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the project fields.", fields: projectValidationErrors(error) } }, { status: 422, headers });
  }
  const requestId = randomUUID();
  logFailure(`projects.${action}.failed`, requestId, "INTERNAL_ERROR", startedAt);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the project request. Please try again.", requestId } }, { status: 500, headers: { ...headers, "X-Request-Id": requestId } });
}

export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  try { return Response.json({ data: await listProjects(await currentUserResolver.get()) }, { headers }); }
  catch (error) { return failed(error, "list", startedAt); }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  try {
    const data = await createProject(await currentUserResolver.get(), await readJsonRequest(request));
    return Response.json({ data }, { status: 201, headers });
  } catch (error) { return failed(error, "create", startedAt); }
}
