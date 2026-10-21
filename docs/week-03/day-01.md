# Week 3 session 1 - Authentication foundation

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-21.

## Goal and task checklist

- [x] Inspect the existing application and architecture scope.
- [x] Add session authentication and application-user schema.
- [x] Add controlled owner/member provisioning and login/logout UI.

## Work actually completed

Added Auth.js credentials sessions, a login page, sign-out control, password hashing, the `users` and `credential_identities` tables, and a migration. Owner and member scripts accept only ignored environment variables and refuse to overwrite an existing account.

## Files created or changed

`auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/`, `components/auth/`, `modules/auth/`, `prisma/schema.prisma`, migration `202610210002_auth_roles_memberships`, seed scripts, environment example, and package files.

## Checks and actual results

Local owner/member controlled seeds succeeded. Authentication unit checks passed. A manual sign-in initially exposed a missing session user ID; the callback was corrected and a real session then returned `200` from `/api/me`.

## Understanding demonstrated

Learning questions were waived. Generated code and passing tests do not verify independent understanding.

## Remaining tasks or problems

Protect application services with current database role/active checks.

## Exact resume point

Add owner/member authorization at client and project service boundaries.
