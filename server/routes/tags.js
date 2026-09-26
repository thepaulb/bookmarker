const express = require("express");
const router = express.Router();
const { listTags } = require("../lib/bookmarks");

// GET /api/tags — the signed-in user's tags with bookmark counts, A–Z.
router.get("/", (req, res) => {
  res.json(listTags(req.user.id));
});

module.exports = router;
