"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clientListResponseSchema } from "../../modules/clients/schemas";
import type { Client } from "../../modules/clients/types";
import {
  createProjectSchema, projectCreatedResponseSchema, projectErrorResponseSchema,
  projectFields, projectListResponseSchema, projectStatuses, projectValidationErrors,
  type ProjectField, type ProjectFieldErrors,
} from "../../modules/projects/schemas";
import type { Project } from "../../modules/projects/types";
import type { AppUser } from "../../modules/auth/types";
import SignOutButton from "../auth/sign-out-button";

const emptyForm = { clientId: "", name: "", description: "", status: "PLANNED", dueDate: "" };
const statusLabels = { PLANNED: "Planned", ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed" };

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Unable to load data");
  return response.json();
}

function readWorkspace(signal: AbortSignal, canManage: boolean) {
  return Promise.allSettled([
    (canManage ? readJson("/api/clients", signal) : Promise.resolve({ data: [] })).then((value) => clientListResponseSchema.parse(value).data),
    readJson("/api/projects", signal).then((value) => projectListResponseSchema.parse(value).data),
  ] as const);
}

export default function ProjectWorkspace({ user }: { user: AppUser }) {
  const canManage = user.role === "OWNER";
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientError, setClientError] = useState("");
  const [listError, setListError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState<ProjectFieldErrors>({});
  const getRequest = useRef<AbortController | null>(null);
  const postRequest = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef<ProjectField | undefined>(undefined);

  const applyResults = useCallback((result: Awaited<ReturnType<typeof readWorkspace>>, signal: AbortSignal) => {
    if (signal.aborted) return;
    if (result[0].status === "fulfilled") {
      setClients(result[0].value);
      setClientError("");
    } else setClientError("Could not load clients. Retry before adding a project.");
    if (result[1].status === "fulfilled") {
      setProjects(result[1].value);
      setListError("");
    } else setListError("Could not refresh projects. Your last loaded projects are still shown. Please retry.");
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getRequest.current = controller;
    void readWorkspace(controller.signal, canManage).then((result) => applyResults(result, controller.signal));
    return () => { getRequest.current?.abort(); postRequest.current?.abort(); };
  }, [applyResults, canManage]);

  useEffect(() => {
    if (!saving && pendingFocus.current) {
      formElement.current?.querySelector<HTMLElement>(`[name="${pendingFocus.current}"]`)?.focus();
      pendingFocus.current = undefined;
    }
  }, [saving]);

  async function refresh() {
    getRequest.current?.abort();
    const controller = new AbortController();
    getRequest.current = controller;
    setLoading(true);
    setClientError("");
    setListError("");
    applyResults(await readWorkspace(controller.signal, canManage), controller.signal);
  }

  function showErrors(errors: ProjectFieldErrors) {
    setFields(errors);
    const first = projectFields.find((field) => errors[field]?.length);
    if (first && submitting.current) pendingFocus.current = first;
    else if (first) formElement.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  function change(field: ProjectField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFields((current) => ({ ...current, [field]: undefined }));
    setSubmitError(""); setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || submitting.current || loading || clientError || clients.length === 0) return;
    setSuccess(""); setSubmitError(""); setFields({});
    const input = createProjectSchema.safeParse({
      clientId: form.clientId, name: form.name, status: form.status,
      ...(form.description.trim() ? { description: form.description } : {}),
      ...(form.dueDate ? { dueDate: form.dueDate } : {}),
    });
    if (!input.success) { showErrors(projectValidationErrors(input.error)); return; }
    submitting.current = true; setSaving(true);
    const controller = new AbortController(); postRequest.current = controller;
    try {
      const response = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const result = projectErrorResponseSchema.safeParse(await response.json().catch(() => null));
        if (response.status === 422 && result.success && result.data.error.code === "VALIDATION_ERROR") {
          showErrors(result.data.error.fields ?? {});
          setSubmitError("Check the highlighted fields and try again.");
        } else if (response.status === 404 || response.status === 409) {
          showErrors({ clientId: ["This client is unavailable. Refresh and choose an active client."] });
        } else setSubmitError("Could not confirm the save. Your details are kept. Refresh before trying again.");
        return;
      }
      const result = projectCreatedResponseSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      setProjects((current) => [result.data, ...current.filter((project) => project.id !== result.data.id)]);
      setForm({ ...emptyForm, clientId: input.data.clientId });
      setSuccess(`Saved ${result.data.name}.`);
      await refresh();
    } catch {
      if (!controller.signal.aborted) setSubmitError("Could not confirm the save. Your details are kept. Refresh before trying again.");
    } finally {
      submitting.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function errorFor(field: ProjectField) {
    return fields[field]?.length ? <p className="field-error" id={`${field}-error`}>{fields[field]?.join(" ")}</p> : null;
  }
  function accessibility(field: ProjectField) {
    return { "aria-invalid": !!fields[field]?.length, "aria-describedby": fields[field]?.length ? `${field}-error` : undefined };
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <a className="brand" href="/clients"><span className="brand-mark" aria-hidden="true">e</span> Encova Hub</a>
        <nav aria-label="Workspace">{canManage ? <a className="nav-link" href="/clients">Clients</a> : null}<span className="local-badge">{user.name} · {canManage ? "Owner" : "Member"}</span><SignOutButton /></nav>
      </header>
      <main>
        <div className="page-heading"><p className="eyebrow">YOUR WORKSPACE / PROJECTS</p><h1>Projects</h1><p>Connect each piece of work to a client.</p></div>
        <p className="notice"><strong>{canManage ? "Owner" : "Member"} workspace.</strong> Projects are saved in the database.</p>
        <div className="workspace-grid">
          {canManage ? <section className="panel" aria-labelledby="new-project-heading">
            <div className="panel-heading"><h2 id="new-project-heading">New project</h2><p>Choose a client and give the project a name.</p></div>
            {clientError ? <p className="feedback error" role="alert">{clientError}</p> : null}
            {!loading && !clientError && clients.length === 0 ? <p className="feedback">No clients yet. <a className="nav-link" href="/clients">Add a client first</a>.</p> : null}
            <form ref={formElement} onSubmit={submit} noValidate>
              <fieldset disabled={saving}>
                <legend className="sr-only">Project details</legend>
                <div className="form-field"><label htmlFor="clientId">Client *</label><select id="clientId" name="clientId" required value={form.clientId} onChange={(event) => change("clientId", event.target.value)} {...accessibility("clientId")}><option value="">Choose a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>{errorFor("clientId")}</div>
                <div className="form-field"><label htmlFor="name">Project name *</label><input id="name" name="name" required value={form.name} onChange={(event) => change("name", event.target.value)} {...accessibility("name")} />{errorFor("name")}</div>
                <div className="form-field"><label htmlFor="status">Status</label><select id="status" name="status" value={form.status} onChange={(event) => change("status", event.target.value)} {...accessibility("status")}>{projectStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>{errorFor("status")}</div>
                <div className="form-field"><label htmlFor="dueDate">Due date <span className="optional">Optional</span></label><input id="dueDate" name="dueDate" type="date" min="0001-01-01" max="9999-12-31" value={form.dueDate} onChange={(event) => change("dueDate", event.target.value)} {...accessibility("dueDate")} />{errorFor("dueDate")}</div>
                <div className="form-field"><label htmlFor="description">Description <span className="optional">Optional</span></label><textarea id="description" name="description" rows={3} value={form.description} onChange={(event) => change("description", event.target.value)} {...accessibility("description")} />{errorFor("description")}</div>
                <button className="primary-button" disabled={loading || saving || !!clientError || clients.length === 0} type="submit">{saving ? "Saving…" : "Add project"}</button>
              </fieldset>
              {submitError ? <p className="feedback error" role="alert">{submitError}</p> : null}
              {fields._form?.length ? <p className="feedback error" role="alert">{fields._form.join(" ")}</p> : null}
              {success ? <p className="feedback success" role="status">{success}</p> : null}
            </form>
          </section> : <section className="panel" aria-labelledby="member-access-heading">
            <div className="panel-heading"><h2 id="member-access-heading">Project access</h2><p>You can view projects that an owner has added you to.</p></div>
            <p className="feedback">Only owners can create projects, manage clients, or change project membership.</p>
          </section>}
          <section className="panel" aria-labelledby="project-list-heading" aria-busy={loading}>
            <div className="list-heading"><div><h2 id="project-list-heading">Your projects <span className="count">{projects.length}</span></h2><p>The most recently added projects appear first.</p></div><button className="secondary-button" disabled={loading || saving} onClick={() => void refresh()}>{listError || clientError ? "Retry" : "Refresh"}</button></div>
            {loading ? <p className="list-state" role="status">Loading workspace…</p> : null}
            {listError ? <p className="feedback error" role="alert">{listError}</p> : null}
            {!loading && !listError && projects.length === 0 ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">+</span><h3>No projects yet</h3><p>Your new projects will appear here.</p></div> : null}
            {projects.length > 0 ? <ul className="client-list" aria-label="Projects">{projects.map((project) => (
              <li className="client-card" key={project.id}>
                <div className="client-avatar" aria-hidden="true">{Array.from(project.name)[0]?.toUpperCase()}</div>
                <div className="client-details"><h3>{project.name}</h3><p>Client: {project.client.name}</p><span className="project-status">{statusLabels[project.status]}</span>{project.dueDate ? <p>Due: <time dateTime={project.dueDate}>{project.dueDate}</time></p> : null}{project.description ? <details><summary>View description</summary><p className="client-notes">{project.description}</p></details> : null}</div>
              </li>
            ))}</ul> : null}
          </section>
        </div>
      </main>
      <footer>Encova Hub <span aria-hidden="true">·</span> Week 2 learning project</footer>
    </div>
  );
}
