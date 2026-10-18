import { randomUUID } from "node:crypto";
import { listClients } from "../../../modules/clients/service.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const clients = await listClients();

    return Response.json(
      { data: clients },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    const requestId = randomUUID();
    // Correlate failures without recording input, storage details, or stacks.
    console.error("clients.list.failed", { code: "INTERNAL_ERROR", requestId });

    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load clients. Please try again.",
          requestId,
        },
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
      },
    );
  }
}
