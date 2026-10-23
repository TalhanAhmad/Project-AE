# Week 5 plan — activity transactions and concurrent edits

This week builds on the completed task and comment workflow. It adds a small, safe history of changes and proves that simultaneous task edits cannot overwrite each other.

## Planned sessions

1. Add the activity-log schema, database constraints, and append-only foundations.
2. Record task and comment changes in the same transaction as the change itself.
3. Add the visible, permission-scoped project activity endpoint and screen.
4. Test stale versions, concurrent writes, rollback on activity failure, and authorization.
5. Run the full checks, review security, document evidence, and report results.

## Rules for this week

- Activity details contain only allowlisted IDs and before/after status values. They never contain comment bodies, client notes, passwords, or session data.
- A task change and its activity entry must succeed or fail together.
- A request with an old task version must return `409 STALE_VERSION`; it must not silently overwrite the newer value.
- Activity remains visible only to an owner or a member of its project.
- No Week 6 dashboard, search, pagination, or query-analysis work belongs in this week.
