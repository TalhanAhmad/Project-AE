"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
      callbackUrl: "/projects",
    });
    if (result?.ok && result.url) window.location.assign(result.url);
    else {
      setError("The email or password is not accepted.");
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="primary-button" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button>
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
    </form>
  );
}
