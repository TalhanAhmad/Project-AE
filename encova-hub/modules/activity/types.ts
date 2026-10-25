export const activityActions = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_STATUS_CHANGED",
  "TASK_DELETED",
  "COMMENT_CREATED",
  "COMMENT_UPDATED",
  "COMMENT_DELETED",
  "MILESTONE_CREATED",
  "MILESTONE_UPDATED",
  "MILESTONE_DELETED",
  "TASK_MILESTONE_LINKED",
  "TASK_MILESTONE_UNLINKED",
] as const;

export type ActivityAction = (typeof activityActions)[number];

// History records intentionally contain only small, allowlisted metadata.
// User-written text, credentials, and session data never belong in activity details.
export type ActivityDetails = Record<string, boolean | number | string | null>;

export type ProjectActivity = {
  id: string;
  projectId: string;
  taskId: string | null;
  actor: { id: string; name: string };
  action: string;
  details: ActivityDetails;
  createdAt: string;
};
