import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { listProjects, createProject } from "../../../modules/projects/service.ts";
import { projectValidationErrors } from "../../../modules/projects/schemas.ts";
import { DomainError } from "../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../server/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

function failed(error: unknown, action: "list" | "create"): Response {
  if (error instanceof RequestError || error instanceof DomainError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the project fields.", fields: projectValidationErrors(error) } }, { status: 422, headers });
  }
  const requestId = randomUUID();
  console.error(`projects.${action}.failed`, { code: "INTERNAL_ERROR", requestId });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the project request. Please try again.", requestId } }, { status: 500, headers: { ...headers, "X-Request-Id": requestId } });
}

export async function GET(): Promise<Response> {
  try { return Response.json({ data: await listProjects() }, { headers }); }
  catch (error) { return failed(error, "list"); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const data = await createProject(await readJsonRequest(request));
    return Response.json({ data }, { status: 201, headers });
  } catch (error) { return failed(error, "create"); }
}
