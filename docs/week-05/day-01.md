# Week 5 — Session 1: Activity data foundation

**Status:** Completed (technical work; independent learning not verified).

## Goal

Create the database structure required for safe project activity history, without yet changing task behavior.

## Checklist

- [x] Read the Week 5 architecture rules and existing task version handling.
- [x] Add an append-only activity-log model with restrictive foreign keys.
- [x] Ensure a task-linked activity entry must belong to the same project as its task.
- [x] Add the application database permission needed to insert activity rows.
- [x] Generate the Prisma client and apply the migration to the separate local test database.
- [x] Run the new focused activity-constraint check and record its actual result.

## Work completed

Added the `activity_logs` database model and migration. Each entry records its project, optional task, actor, short action name, small JSON details, and UTC creation time. The database rejects an activity row that pairs a task with the wrong project. Task, project, and user deletion remains restrictive so history is retained.

Added a small allowlist of activity action names. It documents the kinds of events the app may record and makes it clear that comment bodies and credentials must never be copied into history details.

## Files created or changed

- `prisma/schema.prisma`
- `prisma/migrations/202610230004_activity_logs/migration.sql`
- `scripts/migrate.mts`
- `modules/activity/types.ts`
- `tests/database.integration.test.mts`
- `docs/week-5-plan.md`

## Checks run

`prisma validate` passed. Prisma Client generation passed. TypeScript typecheck and ESLint passed. The separate local test database applied migration `202610230004_activity_logs` successfully. The database integration suite passed 18/18, including the new test that rejects an activity row using a task from another project. A repeated unit suite passed 105/105. The optimized production build passed.

The older authenticated HTTP suite did not run its protected checks: 29/30 tests stopped before making a request because `TEST_AUTH_EMAIL` and `TEST_AUTH_PASSWORD` are not configured on this computer. The one independent TRACE-rejection test passed. This is an environment configuration gap, not evidence that the protected HTTP behavior passed or failed.

## Learning demonstrated

Not independently demonstrated. The explanation is recorded for review: a composite foreign key prevents a log from associating a task with the wrong project.

## Remaining work

The technical work is complete. The learning check remains: explain why storing both task and project IDs lets the database reject a task/project mismatch.

## Resume point

Wait for the learning check. With approval to continue afterward, Session 2 will make task and comment changes write activity records in the same transaction.
