// Look up a web page's title. Used only by the command-line importers; the
// running app never fetches external pages.

const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024; // <title> is in the <head>; no need for more
const USER_AGENT =
  "Mozilla/5.0 (compatible; BookmarkerImport/1.0; +https://github.com/thepaulb/bookmarker)";

// Titles served by bot walls and error pages rather than the real page.
const JUNK_TITLES = [
  /^just a moment/i,
  /^attention required/i,
  /^access denied/i,
  /^before you continue/i,
  /^403\b/,
  /^404\b/,
  /^(page )?not found/i,
  /^error\b/i,
  /^sign in\b/i,
  /^log ?in\b/i,
  /^are you a robot/i,
];

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  pound: "£",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n =
        code[1].toLowerCase() === "x"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function clean(title) {
  return decodeEntities(title).replace(/\s+/g, " ").trim().slice(0, 500);
}

function isUsable(title) {
  return Boolean(title) && !JUNK_TITLES.some((re) => re.test(title));
}

// Pull a title out of HTML: og:title first (usually the cleanest), then
// <title>.
function extractTitle(html) {
  const og =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i,
    );
  if (og && clean(og[1])) return clean(og[1]);

  const tag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return tag ? clean(tag[1]) : "";
}

// Read at most MAX_BYTES of the body as text.
async function readCapped(res) {
  if (!res.body?.getReader) return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks).toString("utf8");
}

function isYouTube(url) {
  return /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(url).hostname);
}

// YouTube shows a cookie-consent page to UK visitors, so ask its oEmbed
// endpoint for the video title instead.
async function fetchYouTubeTitle(url, fetchImpl) {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  const res = await fetchImpl(endpoint, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) return "";
  const data = await res.json();
  return typeof data?.title === "string" ? clean(data.title) : "";
}

// Resolve to the page's title, or "" if it can't be found. Never throws.
async function fetchTitle(url, { fetchImpl = globalThis.fetch } = {}) {
  try {
    const title = isYouTube(url)
      ? await fetchYouTubeTitle(url, fetchImpl)
      : await fetchHtmlTitle(url, fetchImpl);
    return isUsable(title) ? title : "";
  } catch {
    return "";
  }
}

async function fetchHtmlTitle(url, fetchImpl) {
  const res = await fetchImpl(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) return "";
  const type = res.headers.get("content-type") ?? "";
  if (type && !/html/i.test(type)) return "";
  return extractTitle(await readCapped(res));
}

// Run fn over items with at most `limit` in flight, preserving order.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

module.exports = { fetchTitle, extractTitle, decodeEntities, mapLimit };
