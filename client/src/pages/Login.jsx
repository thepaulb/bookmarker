import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Wordmark from "../components/Wordmark";

// Sign-in screen. On a brand-new install (no users yet) it instead creates
// the first account, which is then signed in.
export default function Login() {
  const { user, loading, needsSetup, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (needsSetup && form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (needsSetup) await register(form.username, form.password);
      else await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(needsSetup ? err.message : "Invalid username or password");
      setBusy(false);
    }
  }

  const canSubmit =
    form.username && form.password && (!needsSetup || form.confirm);

  return (
    <main className="auth-page">
      <p className="brand">
        <Wordmark size="small" />
      </p>
      <h1>{needsSetup ? "Create your account" : "Sign in"}</h1>
      {needsSetup && (
        <p className="muted">
          This is a new install. The first account you create can add others.
        </p>
      )}

      <form className="form" onSubmit={handleSubmit}>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={form.username}
            onChange={update("username")}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={needsSetup ? "new-password" : "current-password"}
            value={form.password}
            onChange={update("password")}
          />
        </div>
        {needsSetup && (
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update("confirm")}
            />
          </div>
        )}
        <button type="submit" className="button" disabled={busy || !canSubmit}>
          {busy
            ? "Please wait…"
            : needsSetup
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </main>
  );
}
