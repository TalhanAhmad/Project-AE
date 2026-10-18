"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  clientCreatedResponseSchema,
  clientErrorResponseSchema,
  clientFields,
  clientListResponseSchema,
  clientValidationErrors,
  createClientSchema,
  type ClientField,
  type ClientFieldErrors,
} from "../../modules/clients/schemas";
import type { Client } from "../../modules/clients/types";

const emptyForm = { name: "", email: "", company: "", notes: "" };
const listFailure = "Could not refresh the list. Your last loaded clients are still shown. Please retry.";

async function requestClients(signal: AbortSignal) {
  const response = await fetch("/api/clients", { cache: "no-store", signal });
  if (!response.ok) throw new Error("Unable to load clients");
  return clientListResponseSchema.parse(await response.json()).data;
}

export default function ClientWorkspace() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [fields, setFields] = useState<ClientFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const listRequest = useRef<AbortController | null>(null);
  const saveRequest = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const formElement = useRef<HTMLFormElement>(null);
  const focusAfterSave = useRef<ClientField | undefined>(undefined);

  const loadClients = useCallback(async () => {
    // Only the newest GET may change the list; cancel superseded requests.
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    try {
      const result = await requestClients(controller.signal);
      if (!controller.signal.aborted) {
        setClients(result);
        setListError("");
      }
    } catch {
      if (!controller.signal.aborted) {
        setListError(listFailure);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  function refreshClients() {
    setLoading(true);
    setListError("");
    return loadClients();
  }

  useEffect(() => {
    const controller = new AbortController();
    listRequest.current = controller;
    // Initial state already says loading. Update it when the request completes.
    void requestClients(controller.signal).then((data) => {
      if (!controller.signal.aborted) setClients(data);
    }).catch(() => {
      if (!controller.signal.aborted) setListError(listFailure);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => {
      listRequest.current?.abort();
      saveRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!saving && focusAfterSave.current) {
      formElement.current?.querySelector<HTMLElement>(`[name="${focusAfterSave.current}"]`)?.focus();
      focusAfterSave.current = undefined;
    }
  }, [saving]);

  function showFieldErrors(errors: ClientFieldErrors) {
    setFields(errors);
    const first = clientFields.find((field) => errors[field]?.length);
    if (first && submitting.current) focusAfterSave.current = first;
    else if (first) formElement.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  function change(field: ClientField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFields((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A ref also stops a second submit before React renders the disabled button.
    if (submitting.current || loading) return;
    setSuccess("");
    setSubmitError("");
    setFields({});
    const input = createClientSchema.safeParse({
      name: form.name,
      ...(form.email.trim() ? { email: form.email } : {}),
      ...(form.company.trim() ? { company: form.company } : {}),
      ...(form.notes.trim() ? { notes: form.notes } : {}),
    });
    if (!input.success) {
      showFieldErrors(clientValidationErrors(input.error));
      return;
    }

    submitting.current = true;
    setSaving(true);
    const controller = new AbortController();
    saveRequest.current = controller;
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const result = clientErrorResponseSchema.safeParse(await response.json().catch(() => null));
        if (response.status === 422 && result.success && result.data.error.code === "VALIDATION_ERROR") {
          showFieldErrors(result.data.error.fields ?? {});
          setSubmitError("Check the highlighted fields and try again.");
        } else {
          setSubmitError("Could not confirm the save. Your details are kept. Refresh the list before trying again.");
        }
        return;
      }
      const result = clientCreatedResponseSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      // Keep the confirmed creation visible even if the following GET fails.
      setClients((current) => [...current.filter((client) => client.id !== result.data.id), result.data]);
      setForm(emptyForm);
      setSuccess(`Saved ${result.data.name}.`);
      await refreshClients();
    } catch {
      if (!controller.signal.aborted) {
        setSubmitError("Could not confirm the save. Your details are kept. Refresh the list before trying again.");
      }
    } finally {
      submitting.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <a className="brand" href="/clients"><span className="brand-mark" aria-hidden="true">e</span> Encova Hub</a>
        <span className="local-badge">Local workspace</span>
      </header>
      <main id="main-content">
        <div className="page-heading">
          <p className="eyebrow">YOUR WORKSPACE / CLIENTS</p>
          <h1>Clients</h1>
          <p>Add a client and keep their details in one place.</p>
        </div>
        <p className="notice"><strong>Learning workspace.</strong> Use fake details. This temporary list can reset when the server restarts.</p>
        <div className="workspace-grid">
          <section className="panel" aria-labelledby="new-client-heading">
            <div className="panel-heading"><h2 id="new-client-heading">New client</h2><p>Start with a name. Everything else is optional.</p></div>
            <form ref={formElement} onSubmit={submit} noValidate>
              <fieldset disabled={saving}>
                <legend className="sr-only">Client details</legend>
                {clientFields.map((field) => (
                  <div className="form-field" key={field}>
                    <label htmlFor={field}>{field === "name" ? "Client name" : field[0].toUpperCase() + field.slice(1)} {field === "name" ? <span aria-hidden="true">*</span> : <span className="optional">Optional</span>}</label>
                    {field === "notes" ? (
                      <textarea id={field} name={field} rows={3} value={form[field]} onChange={(event) => change(field, event.target.value)} aria-invalid={!!fields[field]?.length} aria-describedby={fields[field]?.length ? `${field}-error` : undefined} />
                    ) : (
                      <input id={field} name={field} type={field === "email" ? "email" : "text"} autoComplete={field === "name" ? "name" : field === "company" ? "organization" : "email"} required={field === "name"} value={form[field]} onChange={(event) => change(field, event.target.value)} aria-invalid={!!fields[field]?.length} aria-describedby={fields[field]?.length ? `${field}-error` : undefined} />
                    )}
                    {fields[field]?.length ? <p className="field-error" id={`${field}-error`}>{fields[field]?.join(" ")}</p> : null}
                  </div>
                ))}
                <button className="primary-button" type="submit" disabled={loading || saving}>{saving ? "Saving…" : "Add client"}</button>
              </fieldset>
              {submitError ? <p className="feedback error" role="alert">{submitError}</p> : null}
              {fields._form?.length ? <p className="feedback error" role="alert">{fields._form.join(" ")}</p> : null}
              {success ? <p className="feedback success" role="status">{success}</p> : null}
            </form>
          </section>
          <section className="panel client-panel" aria-labelledby="client-list-heading" aria-busy={loading}>
            <div className="list-heading"><div><h2 id="client-list-heading">Your clients <span className="count">{clients.length}</span></h2><p>The most recently added clients appear first.</p></div><button className="secondary-button" onClick={() => void refreshClients()} disabled={loading || saving}>{listError ? "Retry" : "Refresh"}</button></div>
            {loading ? <p className="list-state" role="status">Loading clients…</p> : null}
            {listError ? <p className="feedback error" role="alert">{listError}</p> : null}
            {!loading && !listError && clients.length === 0 ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">+</span><h3>No clients yet</h3><p>Add your first client using the form.</p></div> : null}
            {clients.length > 0 ? <ul className="client-list" aria-label="Clients">{[...clients].reverse().map((client) => (
              <li className="client-card" key={client.id}>
                <div className="client-avatar" aria-hidden="true">{Array.from(client.name)[0]?.toUpperCase()}</div>
                <div className="client-details"><h3>{client.name}</h3>{client.company ? <p>{client.company}</p> : null}{client.email ? <p className="client-email">{client.email}</p> : null}{client.notes ? <details><summary>View notes</summary><p className="client-notes">{client.notes}</p></details> : null}</div>
              </li>
            ))}</ul> : null}
          </section>
        </div>
      </main>
      <footer>Encova Hub <span aria-hidden="true">·</span> Week 1 learning project</footer>
    </div>
  );
}
