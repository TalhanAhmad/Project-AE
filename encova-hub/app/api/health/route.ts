import { randomUUID } from "node:crypto";
import { getDatabase } from "../../../server/database.ts";
import { logFailure, writeLog } from "../../../server/logger.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  try {
    await getDatabase().$queryRaw`SELECT 1`;
    writeLog("info", { action: "health.checked", durationMs: Date.now() - startedAt, code: "OK" });
    return Response.json({ status: "ok" }, { headers });
  } catch {
    const requestId = randomUUID();
    logFailure("health.failed", requestId, "DEPENDENCY_UNAVAILABLE", startedAt);
    return Response.json({ error: { code: "DEPENDENCY_UNAVAILABLE", message: "Service temporarily unavailable.", requestId } }, { status: 503, headers: { ...headers, "X-Request-Id": requestId } });
  }
}
