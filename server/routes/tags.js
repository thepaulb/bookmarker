const express = require("express");
const router = express.Router();
const { listTags, listTagLinks } = require("../lib/bookmarks");

// GET /api/tags — the signed-in user's tags with bookmark counts, A–Z.
router.get("/", (req, res) => {
  res.json(listTags(req.user.id));
});

// GET /api/tags/links — pairs of tags saved on the same bookmark, as
// [{ a, b, count }], strongest first.
router.get("/links", (req, res) => {
  res.json(listTagLinks(req.user.id));
});

module.exports = router;
