import { z, ZodError } from "zod";
import { currentUserResolver } from "../../../../server/current-user.ts";
import { DomainError } from "../../../../server/errors.ts";
import { readJsonRequest, RequestError } from "../../../../server/http.ts";
import { deleteComment, editComment } from "../../../../modules/comments/service.ts";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failed(error: unknown): Response { if (error instanceof RequestError || error instanceof DomainError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers }); if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the comment request." } }, { status: 422, headers }); return Response.json({ error: { code: "INTERNAL_ERROR", message: "Unable to complete the comment request." } }, { status: 500, headers }); }
export async function PATCH(request: Request, context: { params: Promise<{ commentId: string }> }) { try { const { commentId } = await context.params; return Response.json({ data: await editComment(await currentUserResolver.get(), z.uuid().parse(commentId), await readJsonRequest(request)) }, { headers }); } catch (error) { return failed(error); } }
export async function DELETE(request: Request, context: { params: Promise<{ commentId: string }> }) { try { const { commentId } = await context.params; await deleteComment(await currentUserResolver.get(), z.uuid().parse(commentId), await readJsonRequest(request)); return Response.json({ data: { id: commentId } }, { headers }); } catch (error) { return failed(error); } }
