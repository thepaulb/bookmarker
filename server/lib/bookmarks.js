// Data access for bookmarks and tags. Every function takes the owning
// userId and scopes its SQL to it — route handlers never query these
// tables directly.
const db = require("../db");
const { normaliseTag, normaliseTags } = require("./tags");

const PAGE_SIZE = 50;

// Escape LIKE wildcards so a search for "100%" matches literally.
function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Attach each bookmark's tag names (alphabetical) in one query rather than
// one per bookmark.
function withTags(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const tagRows = db
    .prepare(
      `SELECT bt.bookmark_id, t.name
         FROM bookmark_tags bt
         JOIN tags t ON t.id = bt.tag_id
        WHERE bt.bookmark_id IN (${ids.map(() => "?").join(",")})
        ORDER BY t.name`,
    )
    .all(...ids);

  const byBookmark = new Map(ids.map((id) => [id, []]));
  for (const { bookmark_id, name } of tagRows) {
    byBookmark.get(bookmark_id).push(name);
  }
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    description: r.description,
    createdAt: r.created_at,
    tags: byBookmark.get(r.id),
  }));
}

// List a user's bookmarks, newest first, optionally filtered by a search
// query (title, URL or tag name) and/or an exact tag. Returns one page plus
// a hasMore flag, found by asking for one row more than the page size.
function listBookmarks(
  userId,
  { q = "", tag = "", offset = 0, limit = PAGE_SIZE } = {},
) {
  const where = ["b.user_id = ?"];
  const params = [userId];

  const tagName = normaliseTag(tag);
  if (tag && !tagName) return { bookmarks: [], hasMore: false };
  if (tagName) {
    where.push(`EXISTS (
      SELECT 1 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id
       WHERE bt.bookmark_id = b.id AND t.name = ?)`);
    params.push(tagName);
  }

  const query = typeof q === "string" ? q.trim() : "";
  if (query) {
    const pattern = likePattern(query);
    where.push(`(
      b.title LIKE ? ESCAPE '\\'
      OR b.url LIKE ? ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM bookmark_tags bt JOIN tags t ON t.id = bt.tag_id
         WHERE bt.bookmark_id = b.id AND t.name LIKE ? ESCAPE '\\'))`);
    params.push(pattern, pattern, pattern);
  }

  const rows = db
    .prepare(
      `SELECT b.* FROM bookmarks b
        WHERE ${where.join(" AND ")}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, limit + 1, offset);

  const hasMore = rows.length > limit;
  return { bookmarks: withTags(rows.slice(0, limit)), hasMore };
}

function getBookmark(userId, id) {
  const row = db
    .prepare("SELECT * FROM bookmarks WHERE id = ? AND user_id = ?")
    .get(id, userId);
  return row ? withTags([row])[0] : null;
}

function findBookmarkByUrl(userId, url) {
  return (
    db
      .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND url = ?")
      .get(userId, url) || null
  );
}

// Look up (creating where needed) the user's tags with these names and
// return their ids. Names must already be normalised.
function ensureTagIds(userId, names) {
  const insert = db.prepare(
    "INSERT INTO tags (user_id, name) VALUES (?, ?) ON CONFLICT (user_id, name) DO NOTHING",
  );
  const select = db.prepare(
    "SELECT id FROM tags WHERE user_id = ? AND name = ?",
  );
  return names.map((name) => {
    insert.run(userId, name);
    return select.get(userId, name).id;
  });
}

// Insert a bookmark with its tags. The caller supplies an already
// normalised url and a resolved title. Returns the new id, or null if the
// user already has this URL.
const insertBookmark = db.transaction(
  (userId, { url, title, description = "", tags = [], createdAt }) => {
    const result = db
      .prepare(
        `INSERT INTO bookmarks (user_id, url, title, description, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, url) DO NOTHING`,
      )
      .run(
        userId,
        url,
        title,
        description,
        createdAt || new Date().toISOString(),
      );
    if (result.changes === 0) return null;

    const bookmarkId = Number(result.lastInsertRowid);
    const link = db.prepare(
      "INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)",
    );
    for (const tagId of ensureTagIds(userId, normaliseTags(tags))) {
      link.run(bookmarkId, tagId);
    }
    return bookmarkId;
  },
);

// Delete a bookmark, then drop any of the user's tags that no longer label
// anything so the tags page only lists tags in use.
const deleteBookmark = db.transaction((userId, id) => {
  const result = db
    .prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?")
    .run(id, userId);
  if (result.changes === 0) return false;

  db.prepare(
    `DELETE FROM tags
      WHERE user_id = ?
        AND NOT EXISTS (SELECT 1 FROM bookmark_tags bt WHERE bt.tag_id = tags.id)`,
  ).run(userId);
  return true;
});

// All of a user's tags with how many bookmarks carry each, A–Z.
function listTags(userId) {
  return db
    .prepare(
      `SELECT t.name, COUNT(bt.bookmark_id) AS count
         FROM tags t
         LEFT JOIN bookmark_tags bt ON bt.tag_id = t.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.name`,
    )
    .all(userId);
}

// Pairs of the user's tags that appear together on at least one bookmark,
// with how many bookmarks they share. Each pair appears once, its names in
// A–Z order; strongest pairs first. Drives the tag star map's lines.
function listTagLinks(userId) {
  return db
    .prepare(
      `SELECT MIN(ta.name, tb.name) AS a,
              MAX(ta.name, tb.name) AS b,
              COUNT(*) AS count
         FROM bookmark_tags x
         JOIN bookmark_tags y
           ON y.bookmark_id = x.bookmark_id AND y.tag_id > x.tag_id
         JOIN tags ta ON ta.id = x.tag_id
         JOIN tags tb ON tb.id = y.tag_id
        WHERE ta.user_id = ?
        GROUP BY x.tag_id, y.tag_id
        ORDER BY count DESC, a, b`,
    )
    .all(userId);
}

module.exports = {
  PAGE_SIZE,
  listBookmarks,
  getBookmark,
  findBookmarkByUrl,
  insertBookmark,
  deleteBookmark,
  listTags,
  listTagLinks,
};
