# Week 2 completion and review report

Date: 2026-10-18, Asia/Karachi.

Week 2's technical scope is complete: all five planned sessions. Clients and projects now live in PostgreSQL and survive app restarts. Independent SQL authorship/explanation was not demonstrated; learning questions remained skipped at the user's request.

## Publication and app links

Week 1 was committed and pushed first as [48e0920 — Week one done](https://github.com/TalhanAhmad/Project-AE/commit/48e092007201366ec6308460757715312c02feea). Local HEAD and GitHub main matched: 48e092007201366ec6308460757715312c02feea. Pre-publication 64 unit tests, lint, typecheck and targeted credential checks passed.

Week 2 is local, uncommitted work; the request authorized publishing Week 1 first and then completing Week 2. No automatic second push or deployment was performed.

- Clients: http://127.0.0.1:3000/clients
- Projects: http://127.0.0.1:3000/projects
- Setup and exercises: [database guide](database-setup.md)
- Current status: [progress](progress.md)

## Delivered

| Session | Completed work |
| --- | --- |
| 1 | Local PostgreSQL 17.11, separate development/test databases/accounts, pinned Prisma 7.10.1, versioned schema/migration |
| 2 | Persistent client reads/creation; same validated API/form; memory retained only as test fixtures |
| 3 | Project creation/listing linked to clients, strict fields/status/date validation, safe joined responses and responsive page |
| 4 | Real database integrity/permissions tests, repeated unit/API/browser checks, production build and security review |
| 5 | Repeatable synthetic seed, parameterized join, scratch-database recreation, restart persistence, clean-copy checks and documentation |

The backend flow is: form -> API handler -> validated service -> Prisma query -> PostgreSQL -> explicit JSON -> updated screen. Every project stores a client ID. Its response includes the linked client's name without exposing their private contact details/notes.

Both screens handle loading, empty, pending, success and errors. Failed saves keep input; duplicate pending submissions are guarded. Confirmed saved rows remain visible when refresh fails. Uncertain POSTs are not automatically repeated. Projects have a valid status, optional description/date, generated UUID/timestamps and version 1. No edit/archive/delete feature was added.

Database constraints enforce UUID primary keys, client foreign keys, restrictive deletion, status enums, bounded text, nonblank names and positive versions. Project creation locks and checks its client inside a transaction. Missing client gives 404; archived client 409; invalid fields 422; malformed JSON 400. JSON media/origin/actual-byte limits and safe generic failures remain active.

## Gaps found and fixed

1. **Stored timestamps were five hours off.** The first database integration run passed 13/14: a raw SQL timestamp disagreed with the API/Prisma value. Inspected installed adapter code and actual PostgreSQL values. Explicit UTC sessions fixed interpretation and serialization. Regressions now compare actual stored instants, pool timezone and wall time; date-only boundaries 0001, leap day and 9999 also passed. Existing synthetic fixtures from before the fix were not rewritten automatically.
2. **Invalid database text produced a generic 500.** A JSON null character passed the original string schema but PostgreSQL rejected it. Shared browser/server rules now reject null characters and unpaired Unicode surrogates with 422 field errors, before writing. Seven new unit cases and expanded real-database/HTTP non-mutation cases cover this.
3. **Windows migration encoding failed.** PowerShell added an invisible UTF-8 BOM. Removed it before successful application, marked only the failed migration rolled back and reapplied without reset. SQL is BOM-free/LF, with Git attributes preserving bytes.
4. **Runtime database permissions needed tighter boundaries.** Removed broad default privileges that exposed migration history. Runtime now has application-table reads/inserts and client UPDATE privilege required by PostgreSQL row locks; no schema creation, migration-history access or test-database connection. Direct permission checks passed. No mutation SQL uses an unchecked request body.
5. **Prisma CLI resolution differed from its package default export.** The migration wrapper now resolves the pinned package's explicit CLI entry. Repeated migration commands succeeded without pending changes.

## Actual final evidence

| Check | Actual result |
| --- | --- |
| Unit suite, final rounds 1 and 2 | 97/97 each, 194 executions |
| Real PostgreSQL integration, final rounds 1 and 2 | 14/14 each, 28 executions |
| Production HTTP, final rounds 1 and 2 | 30/30 each, 60 executions |
| Production Chrome browser, final rounds 1 and 2 | 27/27 each, 54 executions; zero automatic retries |
| Typecheck/lint/production build | Passed after final implementation and text-validation fix |
| Clean copy | Frozen install and automatic Prisma generation passed without .env or pre-existing dependencies; updated final source passed 97 unit checks and production build without a database connection |
| Scratch recreation | New unique database migrated, seeded twice, exactly 2 clients/3 projects, correct joined names; only that scratch database removed |
| App restart | Same real API-created client/project IDs, names, due date and UTC timestamps survived verified process stop/start |
| SQL join | Example Studio returned its Demo website and Demo brand refresh projects via bound UUID parameter |
| Database permissions | Runtime schema/history access denied; runtime connection to test database denied |
| Production audit | Exit 0, no known advisories across 251 entries |
| Full audit | Exit 1, one high unpatched development-only braces advisory across 577 entries |
| Targeted secret/artifact review | 83 text files at review time; no tested credential patterns, no exact matches to four generated local passwords, no forbidden data/build/secret artifacts in intended files; SQL BOM/CRLF checks passed |
| Final documentation/Git | 26 managed Markdown files and 62 local links checked; no broken links/trailing whitespace; working/index whitespace checks passed |

The four final repeated suites account for 336 named test executions. Earlier development checks also passed (90 unit, 30 HTTP, 27 browser before the final text additions). Initial failures and debugging evidence remain in the [session records](week-02/day-01.md), especially [database review](week-02/day-04.md) and [handoff](week-02/day-05.md).

Production checks used a dedicated local server backed by encova_hub_test. Integration checks ran separately against that database and delete only their own fixture IDs. Earlier development HTTP/browser checks deliberately added fake fixtures to the development database. There was no truncation or reset of development data. The clean copy used 91 intended source paths after final source synchronization; local secrets, PostgreSQL data/binaries and Git metadata were excluded.

The temporary production test server was stopped. Both normal app pages returned 200 and invalid null-character input returned 422. The development app (3000) and PostgreSQL (55432) remain on loopback. Final GitHub main/local HEAD still matched the Week 1 publication.

## Remaining limitations and next step

- One high development-only [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched version reported. It remains open and unsuppressed; the production dependency audit is clean.
- Authentication, roles and membership restrictions are Week 3 and have not started. Use fake details locally; no public deployment is configured. Lists have no pagination yet.
- The optional PostgreSQL helper was executed on Windows. Other platforms use their own PostgreSQL setup. The scratch recreation exercise is not a backup/restore of real records; later operations work must address backups.
- Review the inherited custom Next TRACE patch and disabled persistent-cache workaround on a future framework upgrade. Prisma dependency lifecycle scripts remained blocked by pnpm's default policy; explicit root Prisma generation and actual CLI migrations succeeded. No global approval bypass was added.
- Independent understanding remains unverified. Assistant-written SQL and passing tests do not satisfy independent learner authorship.

No required Week 2 technical tasks remain. Exact next task: review this report and try the client/project flow. Week 3, another commit/push and deployment require the user's next request.
