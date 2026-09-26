import BookmarkItem from "./BookmarkItem";
import styles from "./BookmarkList.module.scss";

// Renders a feed from useBookmarkFeed: loading/error states, the list, and
// a "Load more" button when the caller allows paging.
export default function BookmarkList({
  feed,
  emptyMessage = "No bookmarks yet.",
  pageable = true,
}) {
  const { bookmarks, hasMore, loading, loadingMore, error, loadMore, remove } =
    feed;

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {bookmarks.length === 0 && !error ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <ul className={styles.timeline}>
          {bookmarks.map((b) => (
            <BookmarkItem key={b.id} bookmark={b} onDelete={remove} />
          ))}
        </ul>
      )}

      {pageable && hasMore && (
        <button
          type="button"
          className="button load-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}
