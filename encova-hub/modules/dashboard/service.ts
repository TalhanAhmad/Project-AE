import "server-only";
import type { AppUser } from "../auth/types.ts";
import { getDashboardSummary } from "./queries.ts";

export function getDashboard(actor: AppUser, now?: Date) {
  return getDashboardSummary(actor, now);
}
