const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "2026-09-26T12:00:00.000Z" -> "26 Sept 2026". Returns "" for bad input.
export function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

// "https://www.bbc.co.uk/news" -> "bbc.co.uk". Falls back to the input.
export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Mirrors the server's normaliseTag (server/lib/tags.js) so a new tag shows
// in the picker exactly as it will be saved.
export function normaliseTag(raw) {
  return raw
    .replace(/\\/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 50)
    .trim();
}

// Path for a tag's page. Tags can contain spaces, "&", ":" etc.
export function tagPath(name) {
  return `/tags/${encodeURIComponent(name)}`;
}
