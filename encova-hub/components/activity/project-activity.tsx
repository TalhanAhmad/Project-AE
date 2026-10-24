"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectActivity } from "../../modules/activity/types";

type Props = { projectId: string };

function describe(entry: ProjectActivity): string {
  if (entry.action === "TASK_STATUS_CHANGED") return `changed a task from ${entry.details.fromStatus ?? "its previous status"} to ${entry.details.toStatus ?? "a new status"}.`;
  if (entry.action === "TASK_CREATED") return "created a task.";
  if (entry.action === "TASK_UPDATED") return `updated a task${entry.details.changedFields ? ` (${entry.details.changedFields}).` : "."}`;
  if (entry.action === "TASK_DELETED") return "deleted a task.";
  if (entry.action === "COMMENT_CREATED") return "added a comment.";
  if (entry.action === "COMMENT_UPDATED") return "updated a comment.";
  if (entry.action === "COMMENT_DELETED") return "deleted a comment.";
  return "updated this project.";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ProjectActivityPanel({ projectId }: Props) {
  const [entries, setEntries] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/activity`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not load activity.");
      setEntries(body.data);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load activity."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <section className="panel activity-panel" aria-busy={loading}>
    <div className="list-heading"><div><h2>Activity <span className="count">{entries.length}</span></h2><p>Safe project history. Comment text is never shown here.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
    {loading ? <p className="list-state">Loading activity…</p> : null}
    {!loading && !error && !entries.length ? <div className="empty-state"><h3>No activity yet</h3><p>Project changes will appear here.</p></div> : null}
    {!loading && entries.length ? <ol className="activity-list">{entries.map((entry) => <li key={entry.id}><p><strong>{entry.actor.name}</strong> {describe(entry)}</p><time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time></li>)}</ol> : null}
  </section>;
}
