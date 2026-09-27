import { Link } from "react-router-dom";
import { domainOf, formatDate, tagPath } from "../lib/format";
import styles from "./BookmarkItem.module.scss";

// One entry on the timeline: a card either side of the centre line (the
// side alternates in CSS) and the date on the line itself.
export default function BookmarkItem({ bookmark, onDelete }) {
  const { id, url, title, description, createdAt, tags } = bookmark;

  function handleDelete() {
    if (window.confirm(`Delete "${title}"?`)) onDelete(id);
  }

  return (
    <li className={styles.item}>
      <div className={styles.node}>
        <span className={styles.dot} aria-hidden="true" />
        <time dateTime={createdAt}>{formatDate(createdAt)}</time>
      </div>

      <article className={styles.card}>
        <a
          className={styles.title}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {title}
        </a>

        {description && <p className={styles.description}>{description}</p>}

        <div className={styles.meta}>
          <span className={styles.domain}>{domainOf(url)}</span>
          {tags.length > 0 && (
            <ul className={styles.tags} aria-label="Tags">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link to={tagPath(tag)} className={styles.tag}>
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={styles.delete}
            onClick={handleDelete}
            aria-label={`Delete ${title}`}
            title="Delete"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      </article>
    </li>
  );
}
