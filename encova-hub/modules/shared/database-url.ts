const localHosts = new Set(["127.0.0.1", "localhost"]);
const ambiguousSslModes = new Set(["prefer", "require", "verify-ca"]);

/**
 * Keep local PostgreSQL unchanged. Remote database URLs must explicitly retain
 * certificate and hostname verification when node-postgres changes its defaults.
 */
export function requireVerifiedRemoteTls(connectionString: string): string {
  const url = new URL(connectionString.trim());
  if (
    !localHosts.has(url.hostname) &&
    ambiguousSslModes.has(url.searchParams.get("sslmode") ?? "")
  ) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
