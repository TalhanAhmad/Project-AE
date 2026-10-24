# Week 5 — Session 3: Visible project history

**Status:** Completed.

## Goal

Create the permission-scoped project activity API and interface.

## Planned tasks

- List activity only for owners and members of the project.
- Use stable order and safe activity details.
- Add focused API and browser checks.

## Work completed

Added `GET /api/projects/:projectId/activity`. It returns newest activity first, has no-store caching, and returns the same not-found result to an unrelated member as it does for a missing project. Owners and joined members can read the activity for their project.

Added an Activity panel below the project task workspace. It displays the actor, a safe action description, and timestamp. It deliberately does not show comment bodies or raw activity details. A refresh button loads new activity entries.

The API filters activity details to a small allowlist before returning them. Even if an unexpected value reaches the database, it is not returned to the browser.

## Files created or changed

- `modules/activity/types.ts`
- `modules/activity/queries.ts`
- `modules/activity/service.ts`
- `app/api/projects/[projectId]/activity/route.ts`
- `components/activity/project-activity.tsx`
- `app/projects/[projectId]/page.tsx`
- `app/globals.css`
- `tests/database.integration.test.mts`

## Checks run

TypeScript typecheck passed. ESLint passed for changed TypeScript files. The separate PostgreSQL integration suite passed 19/19. It proves project members can list activity, unrelated members receive 404, and an unexpected `body` detail is removed from the returned data. The optimized production build passed and includes `/api/projects/[projectId]/activity`.

## Learning demonstrated

The user explained that an unrelated member is not allowed to access the project. Clarification given: the database may contain the project, but a 404 prevents the API from confirming that fact to an unauthorized person.

## Remaining tasks or problems

Browser checks for this panel remain for final Week 5 verification. Session 4 will cover concurrent writes and stale versions.

## Resume point

Wait for explicit approval before Session 4.
