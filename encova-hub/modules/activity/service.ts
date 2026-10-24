import "server-only";
import type { AppUser } from "../auth/types.ts";
import { listProjectActivity } from "./queries.ts";

export function listActivity(actor: AppUser, projectId: string) {
  return listProjectActivity(actor, projectId);
}
