# Week 8 plan — independent milestones feature and final fixes

Week 8 implements the architecture’s independent final assignment. It adds project milestones without changing earlier permission, task, or activity rules.

## Planned sessions

1. Add the milestone schema, cross-project task-link constraint, and deletion rule.
2. Add owner-only validated milestone services and task link/unlink behavior.
3. Add protected milestone endpoints and a project screen.
4. Run owner/member authorization, task-link, deletion, and regression checks; fix issues found.
5. Complete final verification, documentation, and the project-level completion report.

## Decisions made before endpoints

- Only owners will create, edit, link, unlink, or delete milestones. Members may read milestones from projects they joined.
- A task may link to one milestone in its own project only. PostgreSQL will enforce this, not just application code.
- Milestone deletion is blocked while any task remains linked. An owner must explicitly unlink tasks first, preserving an intentional audit trail.
- Milestone status will use `PLANNED`, `IN_PROGRESS`, and `COMPLETED`. Due dates are optional calendar dates.
