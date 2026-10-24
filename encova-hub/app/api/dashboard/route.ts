import { randomUUID } from "node:crypto";
import { currentUserResolver } from "../../../server/current-user.ts";
import { DomainError } from "../../../server/errors.ts";
import { getDashboard } from "../../../modules/dashboard/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    return Response.json({ data: await getDashboard(await currentUserResolver.get()) }, { headers });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
    const requestId = randomUUID();
    console.error("dashboard.load.failed", { code: "INTERNAL_ERROR", requestId });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the dashboard.", requestId } }, { status: 500, headers: { ...headers, "X-Request-Id": requestId } });
  }
}
