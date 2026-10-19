# Week 2 session 1 - Database setup and schema

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-18.
- Approval: Explicit user request to complete Week 2 after the verified Week 1 push.

## Goal and task checklist

- [x] Inspect existing repository and local tools.
- [x] Prepare a loopback PostgreSQL cluster with separate development/test databases.
- [x] Pin Prisma/adapter packages and generate a server-only client.
- [x] Define Client/Project UUIDs, relationship, enum, timestamps/date and restrictive foreign key.
- [x] Apply a versioned migration with database constraints.

## Work actually completed

Downloaded PostgreSQL 17.11 Windows binaries from the EDB link supplied by PostgreSQL's official download page. Extracted only bin/lib/share under ignored .tools; initialized ignored .local/postgres/data on loopback port 55432. No machine service or existing database was replaced. Generated random passwords in ignored local files. Created encova_hub and separate encova_hub_test, plus separate migration, runtime and test roles. Existing .env would be preserved; none existed here.

Pinned Prisma/client/adapter 7.10.1, pg 8.23.1, dotenv 18.0.8 and @types/pg 8.23.1. Generated client is ignored, with explicit .ts ESM imports for Node 24 and Next. Read installed Next docs and official Prisma 7 guidance before implementation. Created schema/migration for clients and projects only; later user/task/comment tables are not implemented. Added nonblank-name/positive-version checks and restrictive deletion.

## Files created or changed

.gitignore, .gitattributes; encova-hub/.gitignore, .env.example, eslint.config.mjs, package.json, pnpm-lock.yaml, prisma.config.ts, prisma/schema.prisma, prisma/migrations/, server/database.ts, scripts/local-postgres.ps1, scripts/migrate.mts; Week 2 plan/progress records.

## Checks and actual results

- PostgreSQL reports 17.11; application connected as encova_app to encova_hub; test account connected to encova_hub_test.
- Prisma generate and schema validate passed.
- Initial migration failed P3018/42601 due to the UTF-8 BOM written by Windows PowerShell. Removed the BOM, kept SQL LF bytes, marked only the failed migration rolled back, and reapplied successfully. No reset/data deletion.
- Database contains clients/projects and Prisma migration history. Reviewed app privileges and tightened setup so runtime receives only SELECT/INSERT on application tables, with no migration-history access; that follow-up privilege command is checked before moving the application to database storage.
- Official binary archive SHA-256: 80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F (local integrity record; vendor download used HTTPS).

## Understanding demonstrated

No independent learner demonstration. A foreign key links a project's client ID to an existing client; a migration is the saved SQL that builds that structure again. Assistant implementation does not verify understanding.

## Remaining work or problems

Technical database foundation complete. Persistent queries, project flow and full integration/recreation checks are upcoming sessions. App data is still memory until session 2.

## Exact resume point

Complete the checked privilege step, then session 2: use PostgreSQL client queries while keeping the existing API contract and isolated test fixtures.
