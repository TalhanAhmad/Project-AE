import { currentUserResolver } from "../../../server/current-user.ts";
import { DomainError } from "../../../server/errors.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await currentUserResolver.get();
    return Response.json({ data: { id: user.id, email: user.email, name: user.name, role: user.role } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the current user." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
