# Week 3 plan

Source: supplied Encova Hub architecture, section 12. It defines Week 3 as authentication, roles, and project membership, with proof that unauthorized reads and writes fail. The five-session breakdown below is an implementation plan derived from that architecture, not a separate supplied milestone.

1. Add maintained-library sessions, active application users, controlled owner/member provisioning, and login/logout pages.
2. Re-check active role at protected service boundaries; make client and project creation owner-only.
3. Add project membership and scope member project reads to joined projects only.
4. Prove anonymous, inactive, unlinked, and member-forbidden access fails; run real session/API/browser checks.
5. Review security, fix discovered gaps, repeat checks, and document production activation.

Included: credentials login for manually provisioned users, `OWNER`/`MEMBER` application roles, active-user checks, owner management of clients/projects/memberships, and members' joined-project visibility.

Deferred: public registration, invitations, role-management UI, user deactivation UI, membership removal, tasks, comments, dashboard, pagination, and any feature from later architecture weeks. Independent learning verification remains unverified because the user waived learning questions.
