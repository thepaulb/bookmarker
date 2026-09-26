import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBookmark } from "../api/bookmarks";
import { getTags } from "../api/tags";
import TagPicker from "../components/TagPicker";

const EMPTY = { url: "", title: "", description: "", tags: [] };

export default function AddBookmark() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [tagOptions, setTagOptions] = useState([]);
  const [error, setError] = useState(null);
  const [duplicate, setDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTags()
      .then((tags) => setTagOptions(tags.map((t) => t.name)))
      .catch(() => setTagOptions([]));
  }, []);

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (field === "url") setDuplicate(false);
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicate(false);
    try {
      await createBookmark(form);
      navigate("/");
    } catch (err) {
      if (err.status === 409) setDuplicate(true);
      else setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Add a bookmark</h1>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {duplicate && (
          <p role="alert" className="error">
            You have already bookmarked this URL.{" "}
            <Link to={`/results?${new URLSearchParams({ q: form.url.trim() })}`}>
              Find it
            </Link>
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <div className="field">
          <label htmlFor="url">URL</label>
          <input
            id="url"
            type="url"
            inputMode="url"
            placeholder="https://"
            required
            autoFocus
            value={form.url}
            onChange={update("url")}
          />
        </div>

        <div className="field">
          <label htmlFor="title">
            Title <span className="muted">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            maxLength={500}
            value={form.title}
            onChange={update("title")}
          />
        </div>

        <div className="field">
          <label htmlFor="description">
            Description <span className="muted">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={update("description")}
          />
        </div>

        <div className="field">
          <label htmlFor="tags">
            Tags <span className="muted">(optional)</span>
          </label>
          <TagPicker
            id="tags"
            value={form.tags}
            options={tagOptions}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
          />
        </div>

        <div className="actions">
          <button
            type="submit"
            className="button"
            disabled={saving || !form.url.trim()}
          >
            {saving ? "Saving…" : "Save bookmark"}
          </button>
          <Link to="/">Cancel</Link>
        </div>
      </form>
    </>
  );
}
