# Week 6 — Session 3: Search filters

**Status:** Completed (technical work; independent learning not verified).

## Goal and completed work

Added the protected cross-project `/tasks` screen and `GET /api/tasks`. It supports a 120-character task-title search and a status filter. The database query applies the owner/member access rule, excludes archived projects and soft-deleted tasks, and never returns hidden tasks to a member.

## Files created or changed

- `encova-hub/app/tasks/page.tsx`
- `encova-hub/app/api/tasks/route.ts`
- `encova-hub/components/tasks/task-list-workspace.tsx`
- `encova-hub/modules/tasks/{schemas,queries,service,types}.ts`
- `encova-hub/tests/database.integration.test.mts`

## Checks run and actual results

The database integration suite passed 22/22. Its new test confirms case-insensitive search, status filtering, and that a member cannot receive a matching task from an unjoined project.

## What I have demonstrated that I understand

Search terms are passed as Prisma values, not SQL text. Independent learning confirmation was not provided.

## Remaining tasks or problems

No technical Session 3 tasks remain.

## Exact point to resume

Session 3 is complete. Continue with stable pagination and query analysis.
