import { useState } from "react";
import { createUser } from "../api/auth";

const EMPTY = { username: "", password: "", confirm: "" };

// Signed-in users can create accounts for other people. Each account has
// its own private bookmarks and tags.
export default function AddUser() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const created = await createUser(form.username, form.password);
      setSuccess(`User "${created.username}" created`);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Add a user</h1>
      <form className="form" onSubmit={handleSubmit}>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="success">
            {success}
          </p>
        )}
        <div className="field">
          <label htmlFor="new-username">Username</label>
          <input
            id="new-username"
            type="text"
            autoComplete="off"
            value={form.username}
            onChange={update("username")}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">Password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
          />
        </div>
        <div className="field">
          <label htmlFor="new-confirm">Confirm password</label>
          <input
            id="new-confirm"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update("confirm")}
          />
        </div>
        <button
          type="submit"
          className="button"
          disabled={busy || !form.username || !form.password || !form.confirm}
        >
          {busy ? "Creating…" : "Create user"}
        </button>
      </form>
    </>
  );
}
