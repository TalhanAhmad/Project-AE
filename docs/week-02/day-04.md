# Week 2 session 4 - Database integration checks

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-18.

## Goal and task checklist

- [x] Test actual PostgreSQL constraints and relationships, not mocked Prisma.
- [x] Verify rejected input causes no writes and private client data stays out of project DTOs.
- [x] Check concurrent project writes, date boundaries and database-role separation.
- [x] Repeat unit, HTTP and browser suites; run production build/typecheck/lint/audits.
- [x] Diagnose and fix observed failures.

## Work actually completed

Added guarded integration tests that require a separate local _test database distinct from the development database. Apply migrations there, create only synthetic fixtures and delete only this run's fixture client/project IDs. No truncation or development reset. Tests exercise foreign keys, restrictive deletion, duplicate primary keys, nonblank names, positive versions, enums/lengths, archived/missing clients, concurrent project creation, dates, parameterized joins and denied runtime permissions.

The first real-database run passed 13/14 and caught a five-hour timestamp mismatch. The installed Prisma adapter formats timestamps without an offset and normalizes returned timezone text, while the cluster session default was Asia/Karachi. API/Prisma values appeared correct while raw stored instants were wrong. Inspected installed adapter source and independently queried PostgreSQL. Set options=-c timezone=UTC for every runtime pool connection; restarted the app to replace its cached pool. Integration tests now check both connection timezone and actual stored timestamps, plus project createdAt against wall time. Two final runs passed 14/14 each. Date-only boundaries also passed.

Built the production app and ran it on port 3100 using the separate test database. Both final production rounds passed full HTTP/browser suites. Development during session 3 also passed the full 30 HTTP/27 browser set; the final database tests verify the UTC fix directly. Desktop/mobile pages were inspected; an early screenshot taken before hydration caused a transient caret-style warning, so recaptured only after the workspace was loaded. Final browser-error capture was empty. No application code workaround or lint suppression was used for that screenshot timing.

## Files created or changed

encova-hub/tests/database.integration.test.mts, projects.http.test.mts; server/database.ts; package.json. Existing unit/HTTP/browser files supply the broader regression coverage. No later-week feature added.

## Checks and actual results

- Unit final rounds 1 and 2: 90/90 each (180 executions).
- Integration initial: 13/14; fixed UTC issue; final rounds 1 and 2: 14/14 each (28 executions).
- Final production HTTP rounds 1 and 2: 30/30 each (60 executions), including createdAt wall-time check.
- Final production Chrome rounds 1 and 2: 27/27 each (54 executions), zero retries.
- Typecheck, lint and production build passed. Both client/project APIs are dynamic; pages are static shells using browser API calls.
- Production dependency audit: exit 0, zero known advisories across 251 entries. Full audit: exit 1, same one high unpatched development-only braces advisory across 577 entries. No suppression.
- Runtime lacks schema-create and migration-history read access; connecting with runtime credentials to the test database is denied. Client UPDATE privilege supports required row locks; no update/delete API exists.

## Understanding demonstrated

No independent learner explanation. The UTC diagnosis and SQL were assistant-written; passing tests verify behavior, not independent understanding.

## Remaining work or problems

Technical session 4 complete. Seed/join/setup documentation, recreation and restart persistence checks remain session 5. The known development-only advisory remains open. Earlier synthetic development fixtures created before the UTC fix may retain their earlier timestamp offsets; no existing rows were rewritten automatically.

## Exact resume point

Session 5: add repeatable fake seed and parameterized join commands, recreate a fresh isolated database from migrations, verify app restart persistence and current setup, then finish report/docs. Week 2 is not automatically pushed.
