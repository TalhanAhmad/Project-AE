# Week 6 — Session 1: Dashboard data foundation

**Status:** Completed.

## Goal

Define safe dashboard metrics and assigned-work data. A member must only see figures calculated from projects they belong to; an owner may see all visible agency work.

## Checklist

- [x] Read the architecture dashboard definitions and Week 6 scope.
- [x] Inspect existing task, project, and membership access rules.
- [x] Add dashboard types and permission-scoped database queries.
- [x] Add meaningful database-backed coverage for owner/member metric visibility.
- [x] Run the relevant checks and record their actual results.

## Work actually completed

Added a server-only dashboard service. It returns active-project, overdue-task, and completed-task counts plus up to 12 assigned tasks for the signed-in user. Every query excludes archived projects and deleted tasks. Members are restricted through `project_members`; owners can see agency work.

Overdue dates are evaluated against the Asia/Karachi calendar day so a date-only task deadline does not change based on the server's UTC clock. Assigned tasks have a deterministic due-date, creation-time, and ID order, which prepares the result for later pagination.

## Files created or changed

- `docs/week-6-plan.md`
- `docs/week-06/day-01.md`
- `docs/progress.md`
- `encova-hub/modules/dashboard/types.ts`
- `encova-hub/modules/dashboard/queries.ts`
- `encova-hub/modules/dashboard/service.ts`
- `encova-hub/tests/database.integration.test.mts`

## Checks run and actual results

- PostgreSQL integration suite: 21/21 passed. The new check proves a member only receives counts and assigned work from their joined project, excludes archived work, and cannot see an owner's task in a different project.
- Unit suite: 105/105 passed.
- TypeScript typecheck passed.
- ESLint passed.
- Optimized production build passed.

During testing, the app correctly rejected two invalid fixture setups: adding a task to an archived project, and assigning a task to a person who was not a project member. The fixture now follows those rules.

## What I have demonstrated that I understand

You explained that membership approval proves the viewer is the correct member rather than someone else, which protects the data. This is correct: the query itself must enforce that rule so a guessed project ID cannot reveal hidden dashboard data.

## Remaining tasks or problems

No remaining Session 1 tasks.

## Exact point to resume

Session 1 is complete. Wait for explicit approval before Session 2.
