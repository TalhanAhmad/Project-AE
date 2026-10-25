# Week 8 — Session 2: Milestone services

**Status:** Completed.

## Goal and task checklist

- [x] Add validated milestone create, edit, list, and delete services.
- [x] Restrict milestone changes and task linking to owners.
- [x] Let joined members read milestones in their own projects only.
- [x] Add explicit task link and unlink operations with version checks.
- [x] Write activity entries for milestone and link changes.
- [x] Run database and application regression checks.

## Work actually completed

Added the milestone backend services. Owners can create, edit, delete, link, and unlink. Joined members can list milestones but cannot change them. Link and unlink operations require the current task version, so an outdated browser cannot overwrite a newer change. The project activity log records the milestone lifecycle and each link or unlink without storing user-written text.

## Files created or changed

- `encova-hub/modules/milestones/schemas.ts`
- `encova-hub/modules/milestones/types.ts`
- `encova-hub/modules/milestones/queries.ts`
- `encova-hub/modules/milestones/service.ts`
- `encova-hub/modules/activity/types.ts`
- `encova-hub/modules/activity/queries.ts`
- `encova-hub/types/domain.ts`
- `encova-hub/tests/database.integration.test.mts`
- `docs/week-08/day-02.md`
- `docs/progress.md`

## Checks run and actual results

- `corepack pnpm typecheck` — passed after correcting the new service return-field mapping.
- `corepack pnpm lint` — passed.
- `corepack pnpm test:integration` — passed: 24/24 tests. It verifies owner changes, member read-only access, safe link/unlink, cross-project rejection, deletion blocking, and activity records.
- `corepack pnpm test` — passed: 107/107 tests.
- `corepack pnpm build` — passed.
- `git diff --check` — passed.

## What I have demonstrated that I understand

Not independently demonstrated. The user authorized continuous Week 8 work and waived the session-by-session learning pause.

## Remaining tasks or problems

Session 3 will expose the service through protected endpoints and add the project screen.

## Exact point to resume

Create the milestone API routes and display the milestones on a project page.
