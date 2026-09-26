// Parsing a Trello JSON export whose checklist items are links, e.g. a
// "Links" checklist where each item's name is a URL (sometimes with a note
// around it). Notes are discarded; only the URL is kept.
const { normaliseUrl } = require("./urls");

const MARKDOWN_LINK = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i;
const BARE_URL = /https?:\/\/[^\s<>"']+/i;

// The first URL in a checklist item's text, with trailing punctuation from
// the surrounding sentence removed.
function extractUrl(text) {
  if (typeof text !== "string") return null;
  const markdown = text.match(MARKDOWN_LINK);
  if (markdown) return markdown[1];
  const bare = text.match(BARE_URL);
  return bare ? bare[0].replace(/[.,;:!?)\]]+$/, "") : null;
}

// Trello ids are MongoDB ObjectIds: the first 8 hex digits are the creation
// time in Unix seconds.
function dateFromTrelloId(id) {
  const seconds =
    typeof id === "string" && /^[0-9a-f]{24}$/i.test(id)
      ? Number.parseInt(id.slice(0, 8), 16)
      : NaN;
  return seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

// Turn export JSON text into bookmark records (title left empty for the
// importer to fill in). Items without a usable URL are returned as invalid.
function parseTrelloJson(text) {
  const data = JSON.parse(text);
  const items = (Array.isArray(data?.checklists) ? data.checklists : []).flatMap(
    (checklist) =>
      Array.isArray(checklist?.checkItems) ? checklist.checkItems : [],
  );

  const records = [];
  const invalid = [];
  for (const item of items) {
    const url = normaliseUrl(extractUrl(item?.name));
    if (!url) {
      invalid.push(item?.name ?? "");
      continue;
    }
    records.push({
      url,
      title: "",
      description: "",
      createdAt: dateFromTrelloId(item.id),
      tags: [],
    });
  }
  return { records, invalid };
}

module.exports = { parseTrelloJson, extractUrl, dateFromTrelloId };
