import { z } from "zod";

export const addProjectMemberSchema = z.strictObject({ userId: z.uuid("Choose a valid team member.") });
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
