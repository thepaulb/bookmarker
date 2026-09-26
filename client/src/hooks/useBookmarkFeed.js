import { useState, useEffect, useCallback } from "react";
import { getBookmarks, deleteBookmark } from "../api/bookmarks";

// Loads a newest-first list of bookmarks for a search query and/or tag,
// with "load more" paging and in-place deletion. Reloads from the start
// whenever q or tag changes.
export function useBookmarkFeed({ q = "", tag = "" } = {}) {
  const [bookmarks, setBookmarks] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookmarks({ q, tag })
      .then((page) => {
        if (cancelled) return;
        setBookmarks(page.bookmarks);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, tag]);

  // The next page starts at however many we currently hold. Deleting one
  // shifts the server's list left by one too, so this stays correct.
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getBookmarks({ q, tag, offset: bookmarks.length });
      setBookmarks((current) => {
        const seen = new Set(current.map((b) => b.id));
        return [...current, ...page.bookmarks.filter((b) => !seen.has(b.id))];
      });
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [q, tag, bookmarks.length]);

  const remove = useCallback(async (id) => {
    setError(null);
    try {
      await deleteBookmark(id);
      setBookmarks((current) => current.filter((b) => b.id !== id));
    } catch (err) {
      setError(`Could not delete bookmark: ${err.message}`);
    }
  }, []);

  return { bookmarks, hasMore, loading, loadingMore, error, loadMore, remove };
}
