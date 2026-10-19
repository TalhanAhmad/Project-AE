# Week 2 session 2 - Persistent clients

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-18.

## Goal and task checklist

- [x] Replace default application memory storage with PostgreSQL queries.
- [x] Keep service validation, explicit client fields and ISO timestamps.
- [x] Keep fake memory fixtures only for isolated unit tests.
- [x] Verify the client API/form against the real database.

## Work actually completed

Added server-only client queries using one lazy, reused Prisma pool. Service methods now await the repository and use PostgreSQL by default; there is no memory fallback. Existing API fields and errors remain compatible. Null optional database fields are omitted in DTOs, timestamps become UTC strings, and newest-first ordering is deterministic by createdAt/id. Updated UI ordering and fake-data notice.

Kept the Week 1 memory factory in its existing file for isolated tests, with comments explaining its historical/test-only use. Tests mock the repository boundary rather than switching the running app back to memory. Added migration wrapper that applies migrations and grants runtime only client/project SELECT/INSERT. No schema-create or migration-history access for runtime.

## Files created or changed

encova-hub/modules/clients/queries.ts, service.ts, store.ts; server/database.ts; components/clients/client-workspace.tsx; app/globals.css; tests/clients.test.mts, create-clients.test.mts; scripts/migrate.mts, local-postgres.ps1 and package scripts.

## Checks and actual results

- Existing unit suite: 64/64 passed; strict typecheck passed.
- Real client HTTP suite: 19/19 passed against PostgreSQL.
- Existing client browser suite: 14/14 passed with real successful creations and controlled failure cases.
- A separate Node process queried a fake client created through POST and confirmed its stored name/version=1 in real PostgreSQL.
- App privileges checked: client read/insert true; migration-history read false; schema creation false.
- Migration wrapper initially failed resolving the Prisma package's non-CLI default export; corrected to its explicit installed build/index.js path. Rerun passed with no pending migrations and explicit grants.

## Understanding demonstrated

No independent demonstration. Previously records disappeared with process memory; now an API-created row is readable through a separate database connection. Full restart persistence will be checked in session 5.

## Remaining work or problems

Client persistence is verified. Project UI/API, integration checks and clean recreation remain upcoming. Only synthetic fixtures are stored locally.

## Exact resume point

Session 3: add strict client-linked project creation/listing, safe DTOs and minimal responsive interface. Authentication remains Week 3.
