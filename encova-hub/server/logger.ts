import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";
type SafeLogFields = { action: string; requestId?: string; actorId?: string; durationMs?: number; code?: string };
const priority: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  return value === "debug" || value === "info" || value === "warn" || value === "error" ? value : "info";
}

export function writeLog(level: LogLevel, fields: SafeLogFields): void {
  if (priority[level] < priority[configuredLevel()]) return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, ...fields });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export function logFailure(action: string, requestId: string, code = "INTERNAL_ERROR", startedAt?: number): void {
  writeLog("error", { action, requestId, code, ...(startedAt === undefined ? {} : { durationMs: Date.now() - startedAt }) });
}
