# Week 8 — Session 1: Milestone data foundation

**Status:** Completed.

## Goal and task checklist

- [x] Read the architecture extension requirements and define deletion/unlinking behavior.
- [x] Add the milestone schema and migration.
- [x] Enforce same-project task-to-milestone links in PostgreSQL.
- [x] Add a database-backed constraint test.
- [x] Run migration and focused verification.

## Work actually completed

Added `ProjectMilestone`, its status enum, optional task milestone ID, and a migration. The task relationship uses both `milestone_id` and `project_id`, so PostgreSQL rejects a milestone from another project even if application code is bypassed. PostgreSQL also blocks deletion while a task is linked; after explicit unlinking, deletion succeeds. The owner-only service and API work for that rule are planned for Session 2.

## Files created or changed

- `encova-hub/prisma/schema.prisma`
- `encova-hub/prisma/migrations/202610250006_project_milestones/migration.sql`
- `encova-hub/tests/database.integration.test.mts`
- `docs/week-8-plan.md`
- `docs/week-08/day-01.md`
- `docs/progress.md`

## Checks run and actual results

- `corepack pnpm exec prisma format` — passed.
- `corepack pnpm db:generate` — passed.
- `corepack pnpm exec prisma validate` — passed.
- `corepack pnpm db:migrate` — passed; migration `202610250006_project_milestones` applied to the local development database.
- `corepack pnpm test:integration` — passed twice: 23/23 tests each run, including cross-project milestone-link rejection, deletion blocking, and explicit unlinking.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm test` — passed: 107/107 tests.
- `corepack pnpm build` — passed.

## What I have demonstrated that I understand

Not independently demonstrated. The user authorized continuous Week 8 work and waived the session-by-session learning pause.

## Remaining tasks or problems

Session 2 will add owner-only milestone services plus explicit task link/unlink behavior.

## Exact point to resume

Start Session 2 with the milestone service validation and owner authorization.
