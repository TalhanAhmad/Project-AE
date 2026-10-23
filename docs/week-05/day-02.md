# Week 5 — Session 2: Atomic activity writes

**Status:** Awaiting learning check (technical work completed).

## Goal

Write task and comment activity in the same database transaction as each change.

## Planned tasks

- Record allowlisted task and comment actions without copying private text.
- Prove an activity-insert failure rolls back the related task change.
- Keep existing authorization and archive rules intact.

## Work completed

Task creation, task status updates, task edits, task deletion, comment creation, comment edits, and comment deletion now write an activity entry through the same database transaction as the original change. The entries record only action names and small safe details. They do not record task titles, descriptions, comment bodies, passwords, or session data.

Comment writes were moved into transactions so comment history follows the same all-or-nothing rule. The focused database test deliberately uses a missing actor so the activity foreign key fails after a task update begins. The database rolls back the task update: its status stays `TODO` and version stays `1`.

## Files created or changed

- `modules/activity/queries.ts`
- `modules/tasks/queries.ts`
- `modules/comments/queries.ts`
- `tests/database.integration.test.mts`
- `docs/progress.md`

## Checks run

TypeScript typecheck passed. ESLint passed for the changed modules and integration test. The separate PostgreSQL integration suite passed 19/19, including activity action ordering, private comment-body exclusion, and activity-insert rollback. The optimized production build passed.

## Learning demonstrated

Not independently demonstrated. The required concept is that a database transaction treats related writes as one unit: if the activity insert fails, it undoes the task update.

## Remaining tasks or problems

The technical work is complete. The learning check remains. The activity history is not visible in the app yet; that belongs to Session 3.

## Resume point

Wait for the learning check and explicit approval before Session 3.
