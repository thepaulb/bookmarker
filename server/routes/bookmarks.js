const express = require("express");
const router = express.Router();
const {
  PAGE_SIZE,
  listBookmarks,
  getBookmark,
  findBookmarkByUrl,
  insertBookmark,
  deleteBookmark,
} = require("../lib/bookmarks");
const { normaliseUrl, resolveTitle } = require("../lib/urls");
const { normaliseTags } = require("../lib/tags");

const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TAGS = 20;

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/bookmarks?q=&tag=&offset=
// Newest first, PAGE_SIZE per page. q searches title, URL and tag names;
// tag filters to one exact tag.
router.get("/", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const tag = typeof req.query.tag === "string" ? req.query.tag : "";
  const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);

  const page = listBookmarks(req.user.id, { q, tag, offset });
  res.json({ ...page, pageSize: PAGE_SIZE });
});

// POST /api/bookmarks { url, title?, description?, tags? }
router.post("/", (req, res) => {
  const { url, title, description, tags } = req.body ?? {};

  const href = normaliseUrl(url);
  if (!href) {
    return res
      .status(400)
      .json({ error: "Please enter a valid http or https URL" });
  }
  if (title != null && typeof title !== "string") {
    return res.status(400).json({ error: "title must be text" });
  }
  if (typeof title === "string" && title.trim().length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: "title is too long" });
  }
  if (description != null && typeof description !== "string") {
    return res.status(400).json({ error: "description must be text" });
  }
  if (
    typeof description === "string" &&
    description.trim().length > MAX_DESCRIPTION_LENGTH
  ) {
    return res.status(400).json({ error: "description is too long" });
  }
  if (tags != null && !Array.isArray(tags)) {
    return res.status(400).json({ error: "tags must be a list" });
  }
  const tagNames = normaliseTags(tags ?? []);
  if (tagNames.length > MAX_TAGS) {
    return res
      .status(400)
      .json({ error: `a bookmark can have at most ${MAX_TAGS} tags` });
  }

  const existing = findBookmarkByUrl(req.user.id, href);
  if (existing) {
    return res.status(409).json({
      error: "You have already bookmarked this URL",
      existingId: existing.id,
    });
  }

  const id = insertBookmark(req.user.id, {
    url: href,
    title: resolveTitle(title, href),
    description: (description ?? "").trim(),
    tags: tagNames,
  });
  // A concurrent request may have saved the same URL between the check
  // above and the insert.
  if (id == null) {
    const dup = findBookmarkByUrl(req.user.id, href);
    return res.status(409).json({
      error: "You have already bookmarked this URL",
      existingId: dup?.id,
    });
  }

  res.status(201).json(getBookmark(req.user.id, id));
});

// DELETE /api/bookmarks/:id
router.delete("/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !deleteBookmark(req.user.id, id)) {
    return res.status(404).json({ error: "Bookmark not found" });
  }
  res.status(204).end();
});

module.exports = router;
