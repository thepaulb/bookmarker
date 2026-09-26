import { request } from "./http";

// One page of bookmarks, newest first. q searches title/URL/tags; tag
// filters to one exact tag. Resolves to { bookmarks, hasMore, pageSize }.
export function getBookmarks({ q, tag, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tag) params.set("tag", tag);
  if (offset) params.set("offset", String(offset));
  const query = params.toString();
  return request(`/bookmarks${query ? `?${query}` : ""}`);
}

export function createBookmark({ url, title, description, tags }) {
  return request("/bookmarks", {
    method: "POST",
    body: { url, title, description, tags },
  });
}

export function deleteBookmark(id) {
  return request(`/bookmarks/${id}`, { method: "DELETE" });
}
