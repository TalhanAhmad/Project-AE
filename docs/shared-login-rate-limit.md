# Shared login rate limit

Date: 2026-11-07, Asia/Karachi.

Encova Hub now stores failed login attempts in PostgreSQL instead of server memory. This means the five-attempt, fifteen-minute login limit is shared by all Vercel server instances.

- The database stores a SHA-256 fingerprint of the normalized email, never the email itself.
- A single atomic PostgreSQL upsert adds a failed attempt, so concurrent server instances use the same counter.
- A successful login removes its matching limit record.
- When a limit window has expired, the next check safely removes that expired record.
- The runtime database role receives only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on the new table.

The Neon migration `202611070007_shared_login_rate_limits` was applied before the application code using it was pushed. Verification includes the unit suite, real-database integration test, type check, lint, and production build.
