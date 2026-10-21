# Week 2 session 5 - Recreation, demo and report

- Status: Completed (technical scope).
- Date (Asia/Karachi): 2026-10-18.

## Goal and task checklist

- [x] Add repeatable synthetic seed data and a parameterized SQL join.
- [x] Recreate a new separate database from saved migrations and verify relationships.
- [x] Verify real app restart persistence and stored UTC timestamps.
- [x] Check frozen installation, generation/tests/build in a clean copy without secrets.
- [x] Update setup, progress, decisions and final report with actual evidence.
- [x] Provision the approved managed production database, apply the saved migration, deploy, and verify the public API.
- Independent SQL/explanation: Not demonstrated. Questions were skipped; assistant code is not learner evidence.

## Work actually completed

Added fixed-ID seed for two synthetic clients and three projects. Upserting only those IDs makes it repeatable. Added a parameterized join command with optional validated client UUID. The recreation command creates a unique scratch database under the local helper's cluster, applies the versioned migration, seeds twice, checks exact counts/join and drops only its own newly created database. Existing development/test databases are never reset or dropped.

Created fake client/project through the actual development API, independently checked their PostgreSQL timestamps, stopped the verified Next dev processes, restarted the app on 3000 and verified the same IDs, names, client relationship, leap-day due date and UTC timestamps. Added reusable persistence:create/check commands; the actual restart was performed between those calls.

Final review reproduced a null-character JSON request returning generic 500 from PostgreSQL. Added shared text validation rejecting U+0000 and unpaired surrogates before database access, returning useful 422 fields. Expanded unit/integration/HTTP regression coverage. Rebuilt and repeated final suites after the fix.

Updated README files and database guide with exact local setup, account privileges, test isolation, seeds, join, recreation and limitations. Added week-2-report.md. Preserved Week 1 history separately; current progress remains authoritative. No folders were moved, no Week 3 feature added, and Week 2 was not automatically published.

Production follow-up on 2026-10-21: connected the Vercel project to the approved Neon PostgreSQL resource, applied the versioned clients/projects migration once, and released the current code to the public production alias. Hardened remote PostgreSQL connections to use full TLS server-identity verification. Live checks confirmed client and project reads, accepted client creation, cross-site write rejection, invalid-input rejection, and no cross-origin response header. Two clearly labelled fake verification clients were created because the current API has no delete endpoint.

## Files created or changed

encova-hub/prisma/seed-data.ts, seed.mts, prisma.config.ts; scripts/join.mts, verify-recreation.mts, verify-persistence.mts, local-postgres.ps1; modules/shared/text.ts, client/project schemas and regression tests; package scripts. Root/app README, docs/database-setup.md, week-2-report.md, progress.md, README.md, project-plan.md, decisions.md, security-review.md and session records.

## Checks and actual results

- Scratch database recreation passed: migration, seed twice, exactly two clients/three projects and expected join. Only its generated temporary database was removed.
- Actual development seed and filtered join passed; Example Studio had the two expected seeded projects. No claim that the entire development database has only those fixtures.
- persistence:create independently verified stored timestamps; after actual app process stop/start, persistence:check passed for identical records.
- First clean copy: frozen install passed, 496 packages installed, root postinstall generated Prisma successfully. No .env, old dependencies/cache, database files or Git metadata copied.
- After final text-validation changes, synchronized 91 current intended source paths into that clean copy; 97/97 unit checks and production build passed without configured database credentials. No dependency changes occurred between copies.
- Final main workspace: 97/97 unit tests twice; 14/14 real-database tests twice; 30/30 production HTTP twice; 27/27 production Chrome browser twice. Final production server used the separate test database, with suites run sequentially.
- Typecheck/lint/build passed after final code changes. Repeated db:setup preserved existing .env/data. Archive hash matches the pinned file; SQL is BOM-free/LF.
- Audit results remain current: production 0 known advisories across 251 entries; full 1 high unpatched development-only braces advisory across 577 entries.
- Targeted scan: 83 text files at review time, no tested-pattern matches or exact matches to the four generated local passwords, and no forbidden intended artifacts.
- Final documentation: 26 managed Markdown files, 62 local links, no broken links or trailing whitespace; Git working/index whitespace checks passed. All five session records agree with current progress.
- Temporary production test server on 3100 stopped after verifying its process. App pages on 3000 returned 200, invalid null-character input returned 422, and only app 3000/PostgreSQL 55432 remained listening on loopback. Rechecked GitHub main and local HEAD still match the Week 1 publication hash.
- Production release: Vercel built the 111-file source deployment successfully and aliased it to https://encova-hub.vercel.app. Live `/api/clients` and `/api/projects` returned 200; cross-site POST returned 403; blank-name POST returned 422; cross-origin GET had no CORS allow-origin header.
- Final follow-up checks: 102/102 unit tests, local optimized build, Vercel production build, and production dependency audit all passed. Full audit reports the existing one high development-only `braces` advisory with no upstream patch.

## Understanding demonstrated

No independent learner demonstration. The join and recreation were assistant-written and executed. Their behavior is verified, not learner authorship or understanding.

## Remaining work or problems

No required Week 2 technical tasks remain. Known development-only dependency issue remains open; no login/permissions/pagination feature exists. Earlier synthetic fixtures from before UTC session correction were not rewritten. Windows helper and Chrome were exercised; other platform/browser alternatives were not.

## Exact resume point

Read docs/progress.md and docs/week-2-report.md. Await explicit approval before starting Week 3. The public app is https://encova-hub.vercel.app; the normal local app uses port 3000 and PostgreSQL uses loopback 55432.
