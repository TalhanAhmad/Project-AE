import "server-only";

type Attempt = { failures: number; resetAt: number };
const windowMs = 15 * 60 * 1000;
const maximumFailures = 5;
const maximumEntries = 10_000;
const attempts = new Map<string, Attempt>();

function prune(now: number): void {
  for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  if (attempts.size > maximumEntries) attempts.clear();
}

export function canAttemptLogin(identifier: string, now = Date.now()): boolean {
  prune(now);
  const entry = attempts.get(identifier);
  return !entry || entry.failures < maximumFailures;
}

export function recordLoginFailure(identifier: string, now = Date.now()): void {
  prune(now);
  const entry = attempts.get(identifier);
  if (!entry) attempts.set(identifier, { failures: 1, resetAt: now + windowMs });
  else entry.failures += 1;
}

export function clearLoginFailures(identifier: string): void {
  attempts.delete(identifier);
}
