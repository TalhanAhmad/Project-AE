# Week 8 — Session 3: Milestone API and screen

**Status:** Completed.

## Goal and task checklist

- [x] Add protected project milestone list/create endpoints.
- [x] Add protected milestone edit/delete and task link/unlink endpoints.
- [x] Add a milestone section to the project screen.
- [x] Show safe milestone status, due date, and linked-task count.
- [x] Run authenticated HTTP checks and broader regression checks.

## Work actually completed

Added protected endpoints for listing and creating project milestones, changing or deleting a milestone, and linking or unlinking a task. Added the project-page milestone panel. Owners can create, change status, and delete unlinked milestones; members see the list but have no change controls. The panel shows how many tasks are linked and disables deletion while links exist.

## Files created or changed

- `encova-hub/app/api/projects/[projectId]/milestones/route.ts`
- `encova-hub/app/api/milestones/[milestoneId]/route.ts`
- `encova-hub/app/api/tasks/[taskId]/milestone/route.ts`
- `encova-hub/components/milestones/milestone-panel.tsx`
- `encova-hub/components/activity/project-activity.tsx`
- `encova-hub/app/projects/[projectId]/page.tsx`
- `encova-hub/modules/milestones/schemas.ts`
- `encova-hub/modules/milestones/service.ts`
- `encova-hub/tests/milestones.http.test.mts`
- `encova-hub/package.json`
- `docs/week-08/day-03.md`
- `docs/progress.md`

## Checks run and actual results

- `corepack pnpm typecheck` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm test:http` — passed after creating a controlled local-only test owner; it covers the authenticated milestone endpoints, validation, origin enforcement, linking, unlinking, and deletion blocking.
- `corepack pnpm test` — passed: 107/107 tests.
- `corepack pnpm test:integration` — passed: 24/24 tests.
- `corepack pnpm build` — passed; the build lists all three milestone routes.
- `git diff --check` — passed.

## What I have demonstrated that I understand

Not independently demonstrated. The user authorized continuous Week 8 work and waived the session-by-session learning pause.

## Remaining tasks or problems

Session 4 will run authorization, browser, regression, and security checks, then fix anything found.

## Exact point to resume

Run Session 4 verification, starting with owner/member route behavior and browser coverage.
