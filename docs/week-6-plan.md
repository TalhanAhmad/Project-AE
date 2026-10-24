# Week 6 plan — dashboard, search, pagination, and query analysis

This plan follows the architecture's Week 6 scope. It does not add Week 7 deployment/recovery work or Week 8 milestones.

## Planned sessions

1. Define permission-scoped dashboard metrics and assigned-work queries.
2. Build the dashboard screen with loading, empty, failure, and success states.
3. Add permission-scoped task and project search filters.
4. Add stable pagination and analyse realistic query plans with generated seed volume.
5. Run focused and full verification, review security, and record the final report.

## Rules

- Every metric, search result, and page total must include only projects the current user may access.
- Counts exclude archived projects and deleted tasks where the architecture requires it.
- Task lists use a stable, explicit order so pages do not repeat or skip rows.
- The dashboard shows `No tasks yet` for projects without undeleted tasks.
- Search terms are validated and never interpolated into SQL.
