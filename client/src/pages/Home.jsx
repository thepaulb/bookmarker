import { Link } from "react-router-dom";
import { useBookmarkFeed } from "../hooks/useBookmarkFeed";
import BookmarkList from "../components/BookmarkList";
import TagConstellation from "../components/TagConstellation";

// The 50 most recent bookmarks. No paging here by design — search and tag
// pages page through everything.
export default function Home() {
  const feed = useBookmarkFeed();

  return (
    <>
      <TagConstellation />
      <h1>Recent bookmarks</h1>
      <p className="page-intro">Newest first</p>
      <BookmarkList
        feed={feed}
        pageable={false}
        emptyMessage={
          <>
            No bookmarks yet. <Link to="/addbookmark">Add your first one</Link>.
          </>
        }
      />
    </>
  );
}
