# Week 7 plan — private deployment logs and restore practice

This plan follows the architecture's Week 7 scope. It covers safe operational visibility and a restore drill; it does not begin Week 8 milestones.

## Planned sessions

1. Review the live deployment configuration, production safety rules, and existing error paths.
2. Add safe structured application logs and a minimal database health endpoint.
3. Document the exact release, smoke-test, rollback, backup, and restore procedures.
4. Practice a database backup and restore using a separate local restore database with fake data.
5. Run final verification, review logs and security, and record the report.

## Rules

- Logs contain only request IDs, action names, safe actor IDs, duration, and error codes. They never contain bodies, passwords, session tokens, database URLs, or stack traces.
- The health endpoint returns only a generic status and never configuration values.
- The restore drill targets a new local database, never the production or development database.
- A real production backup or restore requires a deliberate operator action and is not automated by this week.
