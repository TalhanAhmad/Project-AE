import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.ts";
import { getDatabase } from "../../server/database.ts";

const windowMs = 15 * 60 * 1000;
const maximumFailures = 5;

export function loginLimitKey(identifier: string): string {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex");
}

export async function canAttemptLogin(identifier: string, now = Date.now()): Promise<boolean> {
  if (!identifier.trim()) return false;
  const resetAt = new Date(now);
  const entry = await getDatabase().loginRateLimit.findUnique({ where: { key: loginLimitKey(identifier) } });
  if (!entry || entry.resetAt <= resetAt) return true;
  return entry.failures < maximumFailures;
}

export async function recordLoginFailure(identifier: string, now = Date.now()): Promise<void> {
  if (!identifier.trim()) return;
  const currentTime = new Date(now);
  const nextReset = new Date(now + windowMs);
  await getDatabase().$queryRaw(Prisma.sql`
    INSERT INTO "login_rate_limits" ("key", "failures", "reset_at", "updated_at")
    VALUES (${loginLimitKey(identifier)}, 1, ${nextReset}, ${currentTime})
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "login_rate_limits"."reset_at" <= ${currentTime} THEN 1 ELSE "login_rate_limits"."failures" + 1 END,
      "reset_at" = CASE WHEN "login_rate_limits"."reset_at" <= ${currentTime} THEN ${nextReset} ELSE "login_rate_limits"."reset_at" END,
      "updated_at" = ${currentTime}
  `);
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  if (!identifier.trim()) return;
  await getDatabase().loginRateLimit.deleteMany({ where: { key: loginLimitKey(identifier) } });
}
