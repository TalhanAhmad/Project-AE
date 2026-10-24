# Week 5 — Session 4: Concurrent edits

**Status:** Completed (technical work; independent learning not verified).

## Goal

Prove stale task edits are rejected and concurrent updates preserve data integrity.

## Planned tasks

- Test two updates using the same expected version.
- Verify one succeeds and the other returns `409 STALE_VERSION`.
- Test transaction rollback and access rules under the new history flow.

## Work completed

Changed all mutable task and comment writes to match the record ID and `expectedVersion` in one database write. A write that no longer matches returns `409 STALE_VERSION` instead of overwriting the newer value.

## Files created or changed

- `modules/tasks/queries.ts`
- `modules/comments/queries.ts`
- `tests/database.integration.test.mts`

## Checks run

TypeScript typecheck and ESLint passed. The separate PostgreSQL integration suite passed 20/20. The new concurrent-edit check starts two task updates and two comment edits with the same expected version. For each pair, exactly one succeeds, exactly one returns `409 STALE_VERSION`, and the saved version is `2`.

## Learning demonstrated

Not independently demonstrated. A version is a small counter that detects whether someone else saved a newer change before this request.

## Remaining tasks or problems

No Session 4 technical tasks remain. Final full verification and report are underway in Session 5.

## Resume point

Completed. Resume with Session 5 final verification.
