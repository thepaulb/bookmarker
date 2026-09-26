import { useSearchParams } from "react-router-dom";
import { useBookmarkFeed } from "../hooks/useBookmarkFeed";
import BookmarkList from "../components/BookmarkList";

export default function Results() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const feed = useBookmarkFeed({ q });

  if (!q) {
    return (
      <>
        <h1>Search</h1>
        <p className="muted">Type something in the search box to find bookmarks.</p>
      </>
    );
  }

  return (
    <>
      <h1>Results for “{q}”</h1>
      <BookmarkList feed={feed} emptyMessage="No bookmarks match your search." />
    </>
  );
}
