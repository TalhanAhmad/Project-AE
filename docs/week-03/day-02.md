# Week 3 session 2 - Roles and protected access

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-21.

## Goal and task checklist

- [x] Resolve the current active application user from PostgreSQL.
- [x] Require an owner for client and project management.
- [x] Protect pages and API routes.

## Work actually completed

Added a server-side current-user resolver and owner guard. Client lists/creation and project creation now require the database-resolved owner. Pages redirect an unauthenticated visitor to login. `/api/me` returns only safe profile fields.

## Files created or changed

`server/current-user.ts`, `server/errors.ts`, client/project services and routes, and client/project page/workspace components.

## Checks and actual results

Unit and manual session checks confirmed anonymous protected reads return `401`; owner client/project reads return `200`; owner creation returns `201`.

## Understanding demonstrated

Learning questions were waived; independent role/permission explanation is unverified.

## Remaining tasks or problems

Add the project-members table and member visibility filter.

## Exact resume point

Create owner-only membership management and joined-project queries.
