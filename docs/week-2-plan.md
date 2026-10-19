# Week 2 plan

Source: supplied Encova Hub architecture, section 12. It specifies PostgreSQL schema/migrations and persistent clients/projects, with the learning gate of writing a join and recreating the database. It suggests five sessions per week. The following session breakdown is our implementation plan, not a separate supplied milestone.

User explicitly requested Week 1 publication first, then completing Week 2 with repeated testing and a report. Week 1 publication was verified before Week 2 work began. Complete these sessions in order; future records remain Pending until work begins.

1. Set up loopback PostgreSQL development/test databases, pinned Prisma tooling, client/project schema and versioned migrations.
2. Replace temporary application client storage with database queries, retaining validation and explicit API fields.
3. Add client-linked project creation/listing, required validation, safe errors and minimal UI.
4. Test against real PostgreSQL: foreign keys, constraints, invalid-write non-mutation, safe serialization, concurrent creation and browser/API behavior. Fix demonstrated failures and repeat meaningful suites.
5. Recreate an isolated database from migrations, demonstrate a parameterized SQL join, verify persistence across app restart, update setup/docs and deliver actual results.

Scope: Client and Project tables only for functioning features. Use UUIDs, UTC timestamptz, a PostgreSQL project-status enum, optional date-only due date, versions and nullable archive fields as architecture foundations. No archive/edit/delete API yet. Restrict foreign-key deletion; keep client/project relationships by ID. Authentication, user/member features, tasks/comments, activity and public deployment remain later work. No existing folders need moving.

Completion means actual local persistence, validated client/project APIs and pages, reviewed migrations recreating a fresh database, repeatable synthetic seed data, a working join, meaningful repeated checks and accurate report. Independent explanation/SQL authorship remain unverified because the user requested assistant completion with questions skipped.
