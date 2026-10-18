# Encova Hub project plan

## Sources and priority

Read the preserved [week-one milestone](references/Encova_Hub_Week_1_Milestone.docx) and [architecture](references/Encova_Hub_Architecture.docx); the [Markdown companion](references/Encova_Hub_Architecture.md) includes editable diagrams. These are specifications, not implementation evidence. The user's request overrides the milestone's legacy instruction to update WEEK_1_PROGRESS.md: docs/progress.md is authoritative.

## Scope

Encova Hub will be a single-agency platform for clients, projects, assignments, tasks, and conversations. The intended architecture is a modular monolith: Next.js App Router and strict TypeScript, with server services separating business rules from pages and HTTP handlers. PostgreSQL and Prisma come later. Authentication, permissions, transactions, activity, dashboards, deployment, and recovery belong to later weeks.

Week one builds only a local client form, server validation, temporary server memory storage, and a client list. Use Tailwind, Zod, and focused validation tests. Use fake data. Memory may reset or differ between processes; replace it in week two. No database, authentication, project/task features, or public deployment this week. Day 2's other entity unions are practice types only.

## Seven-day milestone

| Day | Tasks | Completion evidence |
| --- | --- | --- |
| 1 | Set up Next.js, strict TypeScript, Tailwind, Git, minimal folders, purpose/setup/scope README | App runs locally; learner explains pages, API handlers, services |
| 2 | Define Client, UserRole, ProjectStatus, TaskStatus, Priority; practice optional fields, unions, unknown, narrowing, async | Type check passes; learner writes a typed function and explains runtime validation |
| 3 | Temporary server-only store and service; GET /api/clients; explicit response fields | HTTP 200 with data array, including empty array |
| 4 | POST /api/clients; Zod; trimmed nonblank name <=120; optional email/company/notes; reject unknown fields; server ID/timestamps | 201 valid, 400 malformed JSON, 422 invalid fields without creation |
| 5 | /clients page, form, list, API submission and refresh; pending/empty/success/error states | Created client appears; errors preserve input |
| 6 | Validate valid/blank/oversized names, invalid email, unknown fields; focused tests; debug; type check/build | Actual results recorded; invalid input does not mutate store; learner explains a diagnosed bug |
| 7 | Independently rebuild one endpoint; review behavior; README; demo; client-project relationship sketch | Independent request-flow explanation; working setup/checks; documented limitations |

## Working agreement

About four hours per milestone day: 40 min study, 100 building, 10 break, 50 testing/review, 25 independent explanation, 15 notes/commit preparation. Seven milestone days govern this week despite the architecture's broader five-session weekly estimate. No automatic calendar advancement.

Explain before implementing; give hints and let the learner attempt core logic. Implement requested code when explicitly asked. Verify completion checks and learner understanding separately. Once both are satisfied, record completion and ask for explicit approval to begin the next day in the next session. No pushes or deployments unless requested. Ask before moving or renaming existing folders.

Week-one acceptance: local client listing/creation, useful server validation, four UI states, passing type check/validation tests/build, accurate README and storage limitations, and independent explanation of form -> request -> validation -> service -> response -> UI.

## User instruction update - 2026-10-18

The user explicitly said "skip questions start woking in day 2". This supersedes the earlier requirement to answer learning questions before advancement and permits Day 2 on the same date. Do not repeat skipped questions; record learning checks as waived, never verified. Technical requirements and the restriction against automatically starting later days still apply. Independent explanation remains an original learning goal with no evidence of completion.
