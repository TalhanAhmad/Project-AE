# Current project progress

- Current milestone: Week 2 - PostgreSQL and persistent clients/projects.
- Total planned Week 2 sessions: 5 (derived from architecture section 12; no separate Week 2 milestone supplied).
- Current session: 5 - Recreation, demo and report.
- Status: Completed (technical scope; independent learning not verified).
- Completed sessions: 5.
- Remaining sessions: 0 technical sessions.
- Last session date (Asia/Karachi): 2026-10-18.
- Blockers: None. PostgreSQL 17.11 is running locally with separate development/test databases.
- Known issue: one high unpatched development-only braces advisory; production audit has no known advisories. Independent learning is unverified.
- Exact next task: Review docs/week-2-report.md and try the client/project pages on local port 3000. Await the user's next request before Week 3, another commit/push or deployment.
- Advancement approval: User explicitly authorized completing Week 2 now, with repeated testing and report, after publishing Week 1. Same-date session advancement is authorized. Learning questions remain skipped; independent understanding is not verified.
- Week 3 advancement: Not approved.
- Deployment: Not requested.

## Verified publication

Week 1 commit `48e092007201366ec6308460757715312c02feea`, message `Week one done`, was pushed to origin/main. GitHub refs/heads/main and local HEAD matched after push. Pre-commit unit tests (64), lint, typecheck and targeted credential/ignored-artifact checks passed. No Week 2 implementation was included in that commit.

Week 2 work is local until separately published. User requested publishing Week 1 first; do not assume later automatic pushes.

## Week 1

All seven technical days completed. Independent endpoint rebuild/explanation not demonstrated; learning questions waived. See [report](week-1-report.md), [historical progress snapshot](week-1-progress.md), and [daily records](days/day-07.md). One high unpatched development-only braces advisory was still open at the Week 1 audit; reassess after Week 2 dependency changes.

## Week 2 scope and status

Only database setup, migrations, persistent client/project creation/listing, relationships, a SQL join, repeatable fake fixtures, recreation verification and checks. Authentication, roles/membership enforcement, tasks/comments and deployment remain later weeks. Use fake data locally.

| Session | Status | Record |
| --- | --- | --- |
| 1 - Database/schema | Completed | [Record](week-02/day-01.md) |
| 2 - Persistent clients | Completed | [Record](week-02/day-02.md) |
| 3 - Projects and relationship | Completed | [Record](week-02/day-03.md) |
| 4 - Database integration checks | Completed | [Record](week-02/day-04.md) |
| 5 - Recreation/demo/report | Completed | [Record](week-02/day-05.md) |

Assistant-generated SQL, code and passing tests do not verify independent learning. No client credentials or database files should be committed.

## Verified current implementation

Clients and projects persist in PostgreSQL 17.11 through Prisma 7.10.1. Both pages/API creation/listing flows work. Project status/date/UUID validation, restrictive relationships, explicit DTOs and transactional active-client checks are implemented. No runtime memory fallback exists. Normal app is http://127.0.0.1:3000; project database is loopback 55432. Use fake details locally; no authentication yet.

Final repeated checks: 97 unit tests twice; 14 real-database integration tests twice; 30 production HTTP checks twice; 27 Chrome browser checks twice. Typecheck/lint/build passed. Scratch recreation with migration/seed twice/join passed; actual app restart preserved the same records and UTC timestamps. A clean copy without .env passed frozen installation/generation and final 97 unit checks/build. Initial Windows migration encoding, CLI resolution, UTC storage mismatch and invalid-text errors were fixed and recorded.

Production audit: 0 known advisories across 251 entries. Full audit: one high unpatched development-only braces advisory, still open. Final production tests used the separate test database; integration tests remove only their own fixtures. Source/secret scan found no exact generated-password leaks or forbidden artifacts. Week 2 source remains local/uncommitted; verified published Week 1 is 48e0920. See [report](week-2-report.md) and [database guide](database-setup.md).

Handoff checks: both app pages returned 200; invalid database text returned 422. Temporary production helper stopped; app 3000/PostgreSQL 55432 remain on loopback. Managed documentation links/whitespace and five completed session records were checked. Week 3 has not started.
