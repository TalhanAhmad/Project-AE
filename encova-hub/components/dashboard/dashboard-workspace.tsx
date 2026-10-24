"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AppUser } from "../../modules/auth/types";
import { dashboardResponseSchema } from "../../modules/dashboard/schemas";
import type { DashboardSummary } from "../../modules/dashboard/types";
import SignOutButton from "../auth/sign-out-button";

export default function DashboardWorkspace({ user }: { user: AppUser }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load dashboard data.");
      setData(dashboardResponseSchema.parse(await response.json()).data);
    } catch { setData(null); setError("Could not load dashboard data. Please retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const owner = user.role === "OWNER";
  return <div className="workspace"><header className="topbar"><Link className="brand" href="/dashboard"><span className="brand-mark" aria-hidden="true">e</span> Encova Hub</Link><nav aria-label="Workspace"><Link className="nav-link" href="/dashboard">Dashboard</Link><Link className="nav-link" href="/tasks">Tasks</Link><Link className="nav-link" href="/projects">Projects</Link>{owner ? <Link className="nav-link" href="/clients">Clients</Link> : null}<span className="local-badge">{user.name} · {owner ? "Owner" : "Member"}</span><SignOutButton /></nav></header><main><div className="page-heading"><p className="eyebrow">YOUR WORKSPACE / DASHBOARD</p><h1>Dashboard</h1><p>Your visible project work at a glance.</p></div>{loading ? <p className="list-state" role="status">Loading dashboard…</p> : null}{error ? <div className="feedback error" role="alert">{error} <button className="secondary-button" onClick={() => void load()}>Retry</button></div> : null}{data ? <><section className="metric-grid" aria-label="Work summary"><article className="metric-card"><span>Active projects</span><strong>{data.activeProjects}</strong></article><article className="metric-card"><span>Overdue tasks</span><strong>{data.overdueTasks}</strong></article><article className="metric-card"><span>Completed tasks</span><strong>{data.completedTasks}</strong></article></section><section className="panel dashboard-work"><div className="list-heading"><div><h2>Assigned to you <span className="count">{data.assignedWork.length}</span></h2><p>Open work from projects you can access.</p></div><button className="secondary-button" onClick={() => void load()}>Refresh</button></div>{data.assignedWork.length === 0 ? <div className="empty-state"><h3>No assigned tasks yet</h3><p>Tasks assigned to you will appear here.</p></div> : <ul className="client-list">{data.assignedWork.map((task) => <li className="client-card" key={task.id}><div className="client-details"><h3>{task.title}</h3><p>{task.projectName} · {task.status} · {task.priority}</p>{task.dueDate ? <p>Due: <time dateTime={task.dueDate}>{task.dueDate}</time></p> : null}</div></li>)}</ul>}</section></> : null}</main></div>;
}
