// One-off tidy-up of stored URLs after tracking-parameter stripping was
// added to normaliseUrl. Rewrites each bookmark's URL to its normalised
// form; where several bookmarks collapse to the same URL, the oldest is
// kept, the others' tags are merged into it, and the rest are deleted.
const db = require("../db");
const { normaliseUrl } = require("./urls");

// Work out what would change for one user, without writing anything.
// Returns [{ keepId, from, to, mergeIds }] — one entry per bookmark whose
// URL changes or that absorbs duplicates.
function planUrlCleanup(userId) {
  const rows = db
    .prepare(
      "SELECT id, url, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at, id",
    )
    .all(userId);

  const groups = new Map();
  for (const row of rows) {
    const clean = normaliseUrl(row.url) ?? row.url;
    if (!groups.has(clean)) groups.set(clean, []);
    groups.get(clean).push(row);
  }

  const plan = [];
  for (const [to, group] of groups) {
    const [keep, ...rest] = group; // oldest first
    if (keep.url === to && rest.length === 0) continue;
    plan.push({
      keepId: keep.id,
      from: keep.url,
      to,
      mergeIds: rest.map((r) => r.id),
    });
  }
  return plan;
}

const applyUrlCleanup = db.transaction((userId) => {
  const plan = planUrlCleanup(userId);
  const moveTags = db.prepare(
    `INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
     SELECT ?, tag_id FROM bookmark_tags WHERE bookmark_id = ?`,
  );
  const remove = db.prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?");
  const setUrl = db.prepare(
    "UPDATE bookmarks SET url = ? WHERE id = ? AND user_id = ?",
  );

  // Delete the duplicates first so the kept row can take the clean URL
  // without hitting UNIQUE(user_id, url).
  for (const { keepId, mergeIds } of plan) {
    for (const id of mergeIds) {
      moveTags.run(keepId, id);
      remove.run(id, userId);
    }
  }
  for (const { keepId, from, to } of plan) {
    if (from !== to) setUrl.run(to, keepId, userId);
  }
  return plan;
});

module.exports = { planUrlCleanup, applyUrlCleanup };
