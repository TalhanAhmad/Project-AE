# Week 3 completion and review report

Date: 2026-10-21, Asia/Karachi.

Week 3's technical scope is complete. The app now has protected sessions, database-backed roles, controlled account setup, and project membership. Independent learning remains unverified because the user requested that learning questions be skipped.

## Delivered

- Auth.js credentials login/logout with secure session handling and an eight-hour session lifetime.
- Application `User`, `CredentialIdentity`, and `ProjectMember` records with database constraints and a saved Prisma migration.
- Controlled scripts to create the first owner and manually provision members from environment variables. Public registration and browser-selected roles do not exist.
- Active user/role lookup in PostgreSQL on protected pages, routes, and services. A stale session cannot retain a changed role or active status.
- Owner-only client/project creation and membership management.
- Member visibility limited to joined projects. Member client contacts, mutations, and membership administration are denied.
- Login rate limiting, explicit safe API responses, responsive role-aware UI, and long-text wrapping.

## Gaps found and fixed

1. A session did not carry the Auth.js subject into `session.user.id`; real sign-in caught it and the session callback now copies the subject.
2. Controlled seed scripts originally used the restricted runtime database role. They now select the migration/admin connection before user creation, preserving runtime least privilege.
3. Auth.js passed transport fields to the credentials provider. The provider now allowlists email/password before strict validation.
4. Two browser tests found long open notes could create horizontal scrolling on a phone. Note text now wraps at safe break points; the final browser run passes.

## Actual final checks

| Check | Result |
| --- | --- |
| Unit tests | `105/105` passed |
| PostgreSQL integration tests | `16/16` passed |
| Authenticated HTTP tests | `30/30` passed |
| Chrome browser tests | `27/27` passed |
| Typecheck and ESLint | Passed |
| Optimized Next.js build | Passed |
| Production dependency audit | Passed; no known vulnerabilities |
| Manual session proof | Anonymous `401`; owner reads/writes succeed; assigned member sees project; member client/write/membership attempts return `403` |

## Production activation

The Vercel project must have its own strong `AUTH_SECRET` and a controlled initial owner created with the production database connection and `AUTH_BOOTSTRAP_OWNER_EMAIL`, `AUTH_BOOTSTRAP_OWNER_NAME`, and `AUTH_BOOTSTRAP_OWNER_PASSWORD`. Do not commit those values. Once provisioned, run the owner sign-in and protected-route smoke checks on the live deployment.

## Remaining limits

The login limiter is process-local and is not sufficient for coordinated multi-instance throttling. There is no public registration, invitation flow, role-management UI, deactivation UI, membership removal, task/comment feature, or dashboard. The production dependency audit is clean; the previously recorded development-only advisory remains a separate dependency-maintenance item.
