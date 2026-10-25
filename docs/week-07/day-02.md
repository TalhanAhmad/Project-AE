# Week 7 — Session 2: Structured logs and health check

**Status:** Completed (technical work; independent learning not verified).

## Goal and work completed

Added the server-only structured logger and `/api/health`. Failure logs now use safe JSON fields: action, request ID, error code, timestamp, and duration. The updated client, project, dashboard, and cross-project task routes no longer write unstructured errors. The health endpoint checks database connectivity and returns only `{"status":"ok"}` or a generic 503 response.

## Files created or changed

- `encova-hub/server/logger.ts`
- `encova-hub/app/api/health/route.ts`
- `encova-hub/app/api/{clients,projects,dashboard,tasks}/route.ts`
- `encova-hub/tests/logger.test.mts`
- `encova-hub/tests/health.http.test.mts`
- `encova-hub/.env.example`

## Checks run and actual results

Typecheck and ESLint passed. Unit tests passed 107/107, including structured-log field and log-level checks.

## What I have demonstrated that I understand

Logs must be useful for finding a request while excluding the private data that caused it. Independent learning confirmation was not provided.

## Remaining tasks or problems

No technical Session 2 tasks remain.

## Exact point to resume

Document the release, smoke-test, rollback, and production-restore procedures.
