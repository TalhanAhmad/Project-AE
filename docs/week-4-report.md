# Week 4 completion report

Date: 2026-10-22, Asia/Karachi.

Week 4 is technically complete. Tasks and comments now use PostgreSQL tables, strict request validation, database-backed permissions, and a project task screen.

## Delivered

- Tasks support owner creation, editing, soft deletion, priority, optional due date, assigned member, versioning, and status changes.
- Members see tasks only in joined projects. Only the assigned member or an owner can change a task status.
- Comments support joined-project visibility, creation, author-only editing, and author-only soft deletion. Deleted comments preserve the history record and return a tombstone body.
- Project task screens provide loading, empty, failure, success, task selection, status, and comment states. Tasks link from the project list.
- Project/archive, active-user, assignment-membership, stale-version, origin, JSON content-type, and body-size checks remain enforced by services and routes.

## Actual checks

- Unit suite: 105/105 passed.
- PostgreSQL integration suite: 17/17 passed, including owner/member visibility, assignment, task edit/delete, comment edit/delete, and soft-delete behavior.
- HTTP suite: 30/30 passed.
- Browser suite: 27/27 passed.
- Typecheck, ESLint, optimized production build, and production dependency audit passed.

## Limits carried forward

Task assignment through the visual screen and activity logging are future work. The full dependency audit still reports the inherited development-only `braces` advisory with no patched upstream release. Production deployment remains blocked until Vercel has a production `AUTH_SECRET` and controlled owner account.
