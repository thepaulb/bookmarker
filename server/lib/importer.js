// Shared import step for the Pocket and Trello parsers: skip what the user
// already has, optionally look up missing titles, then insert everything in
// one transaction.
const db = require("../db");
const { insertBookmark, findBookmarkByUrl } = require("./bookmarks");
const { resolveTitle } = require("./urls");
const { normaliseTags } = require("./tags");
const { fetchTitle, mapLimit } = require("./fetchTitle");

const insertAll = db.transaction((userId, records) => {
  let imported = 0;
  for (const record of records) {
    if (insertBookmark(userId, record) != null) imported += 1;
  }
  return imported;
});

// records: [{ url, title?, description?, createdAt, tags? }] with url
// already normalised. A record with no title gets one fetched from the web
// (when fetchTitles is on) or derived from its URL.
async function importBookmarks(
  userId,
  records,
  {
    extraTags = [],
    fetchTitles = false,
    fetchImpl,
    concurrency = 6,
    onTitle = () => {},
  } = {},
) {
  const seen = new Set();
  const fresh = [];
  let duplicates = 0;
  for (const record of records) {
    if (seen.has(record.url) || findBookmarkByUrl(userId, record.url)) {
      duplicates += 1;
      continue;
    }
    seen.add(record.url);
    fresh.push(record);
  }

  let titlesFetched = 0;
  let titlesDerived = 0;
  const resolved = await mapLimit(fresh, concurrency, async (record) => {
    let title = record.title;
    if (!title && fetchTitles) {
      title = await fetchTitle(record.url, { fetchImpl });
      if (title) titlesFetched += 1;
      onTitle(record.url, title);
    }
    if (!title) titlesDerived += 1;
    return {
      ...record,
      title: resolveTitle(title, record.url),
      tags: normaliseTags([...(record.tags ?? []), ...extraTags]),
    };
  });

  const imported = insertAll(userId, resolved);
  // Anything that failed to insert was added by someone else meanwhile.
  duplicates += resolved.length - imported;
  return { imported, duplicates, titlesFetched, titlesDerived };
}

module.exports = { importBookmarks };
