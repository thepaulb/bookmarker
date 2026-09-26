import { Link, useParams } from "react-router-dom";
import { useBookmarkFeed } from "../hooks/useBookmarkFeed";
import BookmarkList from "../components/BookmarkList";

export default function TagBookmarks() {
  const { name } = useParams();
  const feed = useBookmarkFeed({ tag: name });

  return (
    <>
      <p className="breadcrumb">
        <Link to="/tags">All tags</Link>
      </p>
      <h1>
        Tagged <span className="tag">{name}</span>
      </h1>
      <BookmarkList feed={feed} emptyMessage="No bookmarks have this tag." />
    </>
  );
}
