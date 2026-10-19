# Week 2 session 3 - Projects and relationship

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-18.

## Goal and task checklist

- [x] Add strict project validation and server-only queries/service.
- [x] Link every project to an existing active client by UUID.
- [x] Implement GET/POST /api/projects with safe responses/errors.
- [x] Add /projects form/list, navigation and all required UI states.
- [x] Verify actual API/browser creation and retained-input failures.

## Work actually completed

Project fields: required client/name, optional description/date-only due date, valid status with PLANNED default. Unknown fields/browser IDs/versions, invalid UUIDs, impossible dates and oversized text are rejected. Database-generated project UUIDs and UTC timestamps are serialized explicitly, with version=1 and only client ID/name in the joined DTO. Client private contact/notes never appear in project responses.

Creation uses a database transaction and parameterized client row lock before checking active state and inserting. Missing client returns 404; archived client 409. Runtime needs PostgreSQL UPDATE privilege on clients for SELECT FOR UPDATE; migration wrapper grants that in addition to reads/inserts while still denying schema creation and migration-history access. No edit/archive/delete API is exposed.

Added responsive /projects page with client choices, loading/empty/pending/success/errors, retained input, failed-refresh recovery and duplicate-submit guards. Project dates display as YYYY-MM-DD without timezone conversion. Navigation links client/project pages. Metadata identifies Projects. No auth or later-week features added.

## Files created or changed

encova-hub/modules/projects/{types,schemas,queries,service}.ts; server/errors.ts; app/api/projects/route.ts; app/projects/page.tsx; components/projects/project-workspace.tsx; client component/navigation and global CSS; scripts/migrate.mts; tests/projects.test.mts, projects.http.test.mts, e2e/projects.spec.ts; package scripts.

## Checks and actual results

- Unit suite expanded to 90 tests: 90/90 passed.
- Combined live HTTP suite: 30/30 passed against PostgreSQL (19 client + 11 project checks).
- Combined headless Chrome suite: 27/27 passed (14 client + 13 project checks), including actual linked project creation/date/status, reload, failures, client choices, duplicate submissions, text escaping and mobile overflow.
- Typecheck and lint passed during project implementation; final consolidated checks remain session 4 work.
- HTTP suites run serially to avoid competing fixture writes affecting invalid-write baseline checks.

## Understanding demonstrated

No independent learner demonstration. A project stores clientId, and the response joins that ID to a client name. The relationship is checked in both the backend transaction and PostgreSQL foreign key.

## Remaining work or problems

Technical project scope complete. Direct database constraint tests, production checks, migration recreation and restart persistence remain sessions 4-5. Use fake data locally; access control remains Week 3.

## Exact resume point

Session 4: isolated real-PostgreSQL integrity tests, repeated full suites, production build/API/browser checks and current dependency audits.
