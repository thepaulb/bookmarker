const MAX_URL_LENGTH = 2048;

// Query parameters that only exist to track clicks. They're stripped so the
// same page shared from two newsletters is recognised as one bookmark, and
// so identifiers like TED's user_email_address aren't stored.
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "twclid",
  "ttclid",
  "li_fat_id",
  "igshid",
  "igsh",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "__hssc",
  "__hstc",
  "__hsfp",
  "mkt_tok",
  "oly_anon_id",
  "oly_enc_id",
  "vero_id",
  "vero_conv",
  "_ga",
  "_gl",
  "s_cid",
  "trk",
  "ref_src",
  "ref_url",
  "user_email_address",
  "lctg",
]);
const TRACKING_PREFIXES = ["utm_"];

// Share-tracking params that are only noise on particular sites ("si" is a
// meaningful parameter elsewhere).
const SITE_TRACKING_PARAMS = [
  { hosts: /(^|\.)(youtube\.com|youtu\.be)$/, params: ["si", "feature", "pp"] },
  { hosts: /(^|\.)spotify\.com$/, params: ["si"] },
];

function isTrackingParam(name, hostname) {
  const key = name.toLowerCase();
  if (TRACKING_PARAMS.has(key)) return true;
  if (TRACKING_PREFIXES.some((p) => key.startsWith(p))) return true;
  return SITE_TRACKING_PARAMS.some(
    ({ hosts, params }) => hosts.test(hostname) && params.includes(key),
  );
}

// Remove tracking parameters in place. The query string is only rebuilt
// when something was removed, so untouched URLs keep their exact encoding.
function stripTrackingParams(url) {
  const doomed = [...url.searchParams.keys()].filter((k) =>
    isTrackingParam(k, url.hostname),
  );
  if (doomed.length === 0) return;
  for (const key of doomed) url.searchParams.delete(key);
  if (url.searchParams.size === 0) url.search = "";
}

// Turn user input into a canonical http(s) URL string, or null if it isn't
// one. A missing scheme ("bbc.co.uk") is treated as https. Canonicalising
// through the URL parser means "http://bbc.co.uk" and "http://bbc.co.uk/"
// are stored identically, and tracking parameters are removed, which keeps
// the duplicate check honest.
function normaliseUrl(raw) {
  if (typeof raw !== "string") return null;
  let input = raw.trim();
  if (!input || input.length > MAX_URL_LENGTH) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(input)) input = `https://${input}`;

  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || !url.hostname.includes(".")) {
    // Allow "localhost" but reject single-word typos like "https://foo".
    if (url.hostname !== "localhost") return null;
  }
  stripTrackingParams(url);
  return url.href;
}

const FILE_EXTENSION = /\.(html?|php|aspx?|jsp|cfm|shtml)$/i;

function safeDecode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// Build a readable title for a bookmark that has none, from its URL:
//   https://www.jamieoliver.com/recipes/perfect-roast-chicken/
//     -> "Perfect roast chicken – jamieoliver.com"
//   http://bbc.co.uk -> "bbc.co.uk"
// Uses the last path segment that contains a letter, so numeric ids
// (e.g. /985821/) are skipped.
function titleFromUrl(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return String(href);
  }
  const host = url.hostname.replace(/^www\./i, "");

  const segment = url.pathname
    .split("/")
    .filter(Boolean)
    .map(safeDecode)
    .reverse()
    .find((s) => /\p{L}/u.test(s));
  if (!segment) return host;

  const words = segment
    .replace(FILE_EXTENSION, "")
    .replace(/[-_+.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!words) return host;

  return `${words.charAt(0).toUpperCase()}${words.slice(1)} – ${host}`;
}

// A title that is missing, or is itself just a URL (385 of the Pocket
// export's titles), gets replaced with one derived from the URL.
function resolveTitle(title, href) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return titleFromUrl(href);
  return trimmed;
}

module.exports = { normaliseUrl, titleFromUrl, resolveTitle, MAX_URL_LENGTH };
