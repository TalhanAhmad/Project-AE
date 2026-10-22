import { z } from "zod";
import { isDatabaseText, databaseTextMessage } from "../shared/text.ts";

export const commentFields = ["body"] as const;
export const createCommentSchema = z.strictObject({ body: z.string().trim().min(1, "Enter a comment.").max(2000).refine(isDatabaseText, databaseTextMessage) });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
