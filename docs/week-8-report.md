# Week 8 completion report

Date: 2026-10-25, Asia/Karachi.

Week 8 is technically complete. Encova Hub now supports project milestones with owner-controlled changes, joined-member read access, project-safe task links, and database-enforced deletion rules.

## Delivered

- A `project_milestones` database table with status, optional due date, optimistic version, and timestamps.
- A composite database foreign key that allows a task to reference only a milestone from its own project.
- Restrictive deletion: a milestone cannot be deleted while a task is linked; an owner must unlink first.
- Owner-only milestone create, edit, delete, task-link, and task-unlink services.
- Read-only milestone access for members of the matching project.
- Activity entries for milestone creation, update, deletion, and task linking/unlinking. User-written content is not recorded there.
- Protected API routes for milestone and task-link operations.
- A project-page milestone panel with owner controls, due dates, status, linked-task counts, and deletion blocking.
- Runtime privilege setup for the new table, without granting schema or migration-history access.

## Actual verification

- 107/107 unit tests passed.
- 24/24 database integration tests passed.
- 33/33 authenticated HTTP tests passed.
- 30/30 Chrome browser tests passed, including milestone creation through the project page.
- Typecheck, ESLint, Prisma validation/migration, optimized production build, and Git whitespace checks passed.
- Production and full dependency audits both reported no known vulnerabilities.

## Security result

The database rejects cross-project task links even if an application check is bypassed. Owner-only service checks prevent unauthorized changes before database work begins, and joined members receive only milestone reads for projects they may access. The runtime database role receives only the table permissions needed for validated milestone operations.

## Publication status

Each Week 8 session was committed and pushed to GitHub `main`. This final report is published in the Week 8 completion commit. On 2026-10-27, the Week 8 production release was completed: Neon migrations `202610240005_task_workspace_index` and `202610250006_project_milestones` applied successfully, and the Vercel production alias is `https://encova-hub.vercel.app`. Live checks confirmed `/login` returns 200, `/api/health` returns 200 with `{"status":"ok"}`, and unauthenticated `/api/projects` correctly returns 401.

## Learning status

Independent learning demonstrations were not completed. This report records implemented behavior and test evidence.
