// Parsing a getpocket.com CSV export (columns: title,url,time_added,tags,status).
const { parse } = require("csv-parse/sync");
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

// Turn CSV text into bookmark records ready for importBookmarks. Rows whose
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

module.exports = { parsePocketCsv, toIsoDate };
