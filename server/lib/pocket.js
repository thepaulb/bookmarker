// Parsing and importing a getpocket.com CSV export
// (columns: title,url,time_added,tags,status).
const { parse } = require("csv-parse/sync");
const db = require("../db");
const { insertBookmark } = require("./bookmarks");
const { normaliseUrl, resolveTitle } = require("./urls");
const { normaliseTags } = require("./tags");

// Pocket's time_added is Unix seconds. Anything unparseable falls back to
// "now" so the row still imports.
function toIsoDate(timeAdded) {
  const seconds = Number(timeAdded);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

// Turn CSV text into bookmark records ready for insertBookmark. Rows whose
// URL isn't a usable http(s) URL are counted and skipped. Pocket's status
// column is deliberately ignored.
function parsePocketCsv(text) {
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  });

  const records = [];
  const invalid = [];
  for (const row of rows) {
    const url = normaliseUrl(row.url);
    if (!url) {
      invalid.push(row.url ?? "");
      continue;
    }
    records.push({
      url,
      title: resolveTitle(row.title, url),
      description: "",
      createdAt: toIsoDate(row.time_added),
      tags: normaliseTags((row.tags ?? "").split("|")),
    });
  }
  return { records, invalid };
}

// Insert records for a user in one transaction. Safe to re-run: URLs the
// user already has are skipped and counted as duplicates.
const importRecords = db.transaction((userId, records) => {
  let imported = 0;
  let duplicates = 0;
  for (const record of records) {
    if (insertBookmark(userId, record) == null) duplicates += 1;
    else imported += 1;
  }
  return { imported, duplicates };
});

function importPocketCsv(userId, text) {
  const { records, invalid } = parsePocketCsv(text);
  const { imported, duplicates } = importRecords(userId, records);
  return { imported, duplicates, invalid: invalid.length };
}

module.exports = { parsePocketCsv, importPocketCsv, toIsoDate };
