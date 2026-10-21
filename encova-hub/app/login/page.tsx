import LoginForm from "../../components/auth/login-form.tsx";

export const metadata = { title: "Sign in | Encova Hub" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="panel login-panel" aria-labelledby="login-heading">
        <p className="eyebrow">ENCOVA HUB</p>
        <h1 id="login-heading">Sign in</h1>
        <p>Use the account created by the controlled owner or member setup. Public registration is not available.</p>
        <LoginForm />
      </section>
    </main>
  );
}
