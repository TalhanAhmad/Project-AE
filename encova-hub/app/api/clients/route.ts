import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { clientValidationErrors } from "../../../modules/clients/schemas.ts";
import { createClient, listClients } from "../../../modules/clients/service.ts";
import { readJsonRequest, RequestError } from "../../../server/http.ts";
import { currentUserResolver } from "../../../server/current-user.ts";
import { DomainError } from "../../../server/errors.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const clients = await listClients(await currentUserResolver.get());

    return Response.json(
      { data: clients },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
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

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readJsonRequest(request);
    const client = await createClient(await currentUserResolver.get(), input);
    return Response.json(
      { data: client },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestError || error instanceof DomainError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof ZodError) {
      const fields = clientValidationErrors(error);
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Check the client fields.", fields } },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }

    const requestId = randomUUID();
    console.error("clients.create.failed", { code: "INTERNAL_ERROR", requestId });
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to create the client. Please try again.",
          requestId,
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }
}
