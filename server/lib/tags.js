const MAX_TAG_LENGTH = 50;

// Canonical form for a tag name: lower-case, trimmed, single-spaced, with
// backslashes removed (the Pocket export has escaped junk like "stoicism\\")
// and slashes swapped for hyphens so a tag always fits in /tags/<name>.
// Returns "" for anything that has nothing left once cleaned.
function normaliseTag(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\\/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

// Normalise a list of tags, dropping empties and duplicates while keeping
// the first-seen order.
function normaliseTags(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const raw of list) {
    const name = normaliseTag(raw);
    if (name) seen.add(name);
  }
  return [...seen];
}

module.exports = { normaliseTag, normaliseTags, MAX_TAG_LENGTH };
