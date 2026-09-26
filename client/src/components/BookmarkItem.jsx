import { Link } from "react-router-dom";
import { formatDate, tagPath } from "../lib/format";
import styles from "./BookmarkItem.module.scss";

export default function BookmarkItem({ bookmark, onDelete }) {
  const { id, url, title, description, createdAt, tags } = bookmark;

  function handleDelete() {
    if (window.confirm(`Delete "${title}"?`)) onDelete(id);
  }

  return (
    <li className={styles.item}>
      <a
        className={styles.title}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {title}
      </a>

      <div className={styles.meta}>
        <time dateTime={createdAt}>{formatDate(createdAt)}</time>
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
      </div>

      {description && <p className={styles.description}>{description}</p>}

      <button
        type="button"
        className={styles.delete}
        onClick={handleDelete}
        aria-label={`Delete ${title}`}
      >
        Delete
      </button>
    </li>
  );
}
