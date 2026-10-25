"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AppUser } from "../../modules/auth/types";
import { createMilestoneSchema, milestoneStatuses } from "../../modules/milestones/schemas";
import type { Milestone } from "../../modules/milestones/types";
import type { MilestoneStatus } from "../../types/domain";

type Props = { user: AppUser; projectId: string };
type Form = { title: string; dueDate: string; status: MilestoneStatus };
const emptyForm: Form = { title: "", dueDate: "", status: "PLANNED" };
const labels: Record<MilestoneStatus, string> = { PLANNED: "Planned", IN_PROGRESS: "In progress", COMPLETED: "Completed" };

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "Request failed.");
  return body;
}

export default function MilestonePanel({ user, projectId }: Props) {
  const owner = user.role === "OWNER";
  const [items, setItems] = useState<Milestone[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await json(`/api/projects/${projectId}/milestones`); setItems(result.data); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load milestones."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = createMilestoneSchema.safeParse({ title: form.title, status: form.status, ...(form.dueDate ? { dueDate: form.dueDate } : {}) });
    if (!input.success) { setError("Check the milestone title and date."); return; }
    setSaving(true);
    try { const result = await json(`/api/projects/${projectId}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) }); setItems((current) => [result.data, ...current]); setForm(emptyForm); setMessage(`Added ${result.data.title}.`); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add milestone."); }
    finally { setSaving(false); }
  }

  async function changeStatus(item: Milestone, status: MilestoneStatus) {
    setSaving(true);
    try { const result = await json(`/api/milestones/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, expectedVersion: item.version }) }); setItems((current) => current.map((entry) => entry.id === item.id ? result.data : entry)); setMessage("Milestone status updated."); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update milestone."); }
    finally { setSaving(false); }
  }

  async function remove(item: Milestone) {
    if (item.taskCount) return;
    setSaving(true);
    try { await json(`/api/milestones/${item.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: item.version }) }); setItems((current) => current.filter((entry) => entry.id !== item.id)); setMessage(`Deleted ${item.title}.`); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete milestone."); }
    finally { setSaving(false); }
  }

  return <section className="panel" aria-busy={loading}>
    <div className="list-heading"><div><h2>Milestones <span className="count">{items.length}</span></h2><p>Project targets and their linked task count.</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading || saving}>Refresh</button></div>
    {message ? <p className="feedback success" role="status">{message}</p> : null}
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
    {owner ? <form onSubmit={create} noValidate><fieldset disabled={saving}><div className="form-field"><label htmlFor="milestone-title">Milestone title *</label><input id="milestone-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div className="form-field"><label htmlFor="milestone-status">Status</label><select id="milestone-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MilestoneStatus })}>{milestoneStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></div><div className="form-field"><label htmlFor="milestone-due-date">Due date <span className="optional">Optional</span></label><input id="milestone-due-date" type="date" min="0001-01-01" max="9999-12-31" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div><button className="primary-button" type="submit">{saving ? "Saving…" : "Add milestone"}</button></fieldset></form> : <p className="feedback">Only owners can change milestones.</p>}
    {loading ? <p className="list-state">Loading milestones…</p> : null}
    {!loading && !items.length ? <div className="empty-state"><h3>No milestones yet</h3><p>Project targets will appear here.</p></div> : null}
    {items.length ? <ul className="client-list">{items.map((item) => <li className="client-card" key={item.id}><div className="client-details"><h3>{item.title}</h3><p>{labels[item.status]} · {item.taskCount} linked {item.taskCount === 1 ? "task" : "tasks"}</p>{item.dueDate ? <p>Due: <time dateTime={item.dueDate}>{item.dueDate}</time></p> : null}{owner ? <div className="form-field"><label htmlFor={`milestone-${item.id}`}>Status</label><select id={`milestone-${item.id}`} value={item.status} disabled={saving} onChange={(event) => void changeStatus(item, event.target.value as MilestoneStatus)}>{milestoneStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select><button className="secondary-button" type="button" disabled={saving || item.taskCount > 0} onClick={() => void remove(item)}>{item.taskCount > 0 ? "Unlink tasks before deleting" : "Delete milestone"}</button></div> : null}</div></li>)}</ul> : null}
  </section>;
}
