// Builds and exports the Express app without starting a server, so tests
// can drive it in-process (via supertest) and index.js can listen on a port.
const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const requireAuth = require("./middleware/auth");

const app = express();

// The client is always same-origin (Vite proxies /api in dev; Express
// serves the build in production), so no CORS is needed.
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Auth routes are public (login/register/status); everything else requires
// a valid session so handlers can scope data to req.user.
app.use("/api/auth", require("./routes/auth"));
app.use("/api/bookmarks", requireAuth, require("./routes/bookmarks"));
app.use("/api/tags", requireAuth, require("./routes/tags"));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Serve the built client when it's present (production). Dev runs the
// client through Vite's own server instead, so client/dist won't exist
// there and this block is a no-op.
const clientDist = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Malformed JSON bodies surface here as 400s; anything else is a 500 that
// doesn't leak internals.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

module.exports = app;
