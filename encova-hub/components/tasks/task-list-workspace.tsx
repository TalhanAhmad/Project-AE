"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { AppUser } from "../../modules/auth/types";
import { taskStatuses } from "../../modules/tasks/schemas";
import type { TaskPage } from "../../modules/tasks/types";
import SignOutButton from "../auth/sign-out-button";

const initial: TaskPage = { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
function isTaskPage(value: unknown): value is TaskPage { return typeof value === "object" && value !== null && Array.isArray((value as TaskPage).data) && typeof (value as TaskPage).meta?.total === "number"; }

export default function TaskListWorkspace({ user }: { user: AppUser }) {
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const [result, setResult] = useState<TaskPage>(initial); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async (nextPage = page) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10" }); if (search.trim()) params.set("q", search.trim()); if (status) params.set("status", status);
    try { const response = await fetch(`/api/tasks?${params}`, { cache: "no-store" }); const body: unknown = await response.json().catch(() => null); if (!response.ok || !isTaskPage(body)) throw new Error(); setResult(body); setPage(nextPage); }
    catch { setError("Could not load tasks. Please retry."); } finally { setLoading(false); }
  }, [page, search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(1), 0); return () => window.clearTimeout(timer); }, [load]);
  function submit(event: FormEvent) { event.preventDefault(); void load(1); }
  const owner = user.role === "OWNER";
  return <div className="workspace"><header className="topbar"><Link className="brand" href="/dashboard"><span className="brand-mark" aria-hidden="true">e</span> Encova Hub</Link><nav aria-label="Workspace"><Link className="nav-link" href="/dashboard">Dashboard</Link><Link className="nav-link" href="/tasks">Tasks</Link><Link className="nav-link" href="/projects">Projects</Link>{owner ? <Link className="nav-link" href="/clients">Clients</Link> : null}<span className="local-badge">{user.name} · {owner ? "Owner" : "Member"}</span><SignOutButton /></nav></header><main><div className="page-heading"><p className="eyebrow">YOUR WORKSPACE / TASKS</p><h1>Tasks</h1><p>Search only the work you are allowed to see.</p></div><section className="panel task-filters"><form onSubmit={submit}><div className="filter-row"><div className="form-field"><label htmlFor="task-search">Search task titles</label><input id="task-search" maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="form-field"><label htmlFor="task-status-filter">Status</label><select id="task-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{taskStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><button className="secondary-button" type="submit" disabled={loading}>Search</button></div></form></section>{error ? <p className="feedback error" role="alert">{error}</p> : null}<section className="panel" aria-busy={loading}><div className="list-heading"><div><h2>Matching tasks <span className="count">{result.meta.total}</span></h2><p>Page {result.meta.totalPages ? result.meta.page : 0} of {result.meta.totalPages}.</p></div><button className="secondary-button" onClick={() => void load(page)} disabled={loading}>Refresh</button></div>{loading ? <p className="list-state" role="status">Loading tasks…</p> : null}{!loading && result.data.length === 0 ? <div className="empty-state"><h3>No tasks found</h3><p>Try a different search or status.</p></div> : null}{!loading && result.data.length ? <ul className="client-list">{result.data.map((task) => <li className="client-card" key={task.id}><div className="client-details"><h3>{task.title}</h3><p>{task.project.name} · {task.status} · {task.priority}</p>{task.dueDate ? <p>Due: <time dateTime={task.dueDate}>{task.dueDate}</time></p> : null}</div></li>)}</ul> : null}{result.meta.totalPages > 1 ? <div className="pagination" aria-label="Task pages"><button className="secondary-button" disabled={loading || page === 1} onClick={() => void load(page - 1)}>Previous</button><span>Page {page}</span><button className="secondary-button" disabled={loading || page >= result.meta.totalPages} onClick={() => void load(page + 1)}>Next</button></div> : null}</section></main></div>;
}
