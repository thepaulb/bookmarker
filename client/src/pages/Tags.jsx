import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTags } from "../api/tags";
import { tagPath } from "../lib/format";

export default function Tags() {
  const [tags, setTags] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>Tags</h1>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!tags && !error && <p className="muted">Loading…</p>}
      {tags?.length === 0 && <p className="muted">No tags yet.</p>}
      {tags?.length > 0 && (
        <ul className="tag-cloud">
          {tags.map(({ name, count }) => (
            <li key={name}>
              <Link to={tagPath(name)} className="tag">
                {name} <span className="count">({count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
