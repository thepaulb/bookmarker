const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const requireAuth = require("../middleware/auth");

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// Kept in step with the cookie maxAge above (7 days).
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 8;

// Shared validation for register/create-user. Returns an error message or
// null.
function validateCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") {
    return "username and password are required";
  }
  if (!username.trim() || !password) {
    return "username and password are required";
  }
  if (username.trim().length > 50) return "username is too long";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function setSessionCookie(res, user) {
  const token = jwt.sign(
    { id: Number(user.id), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
  res.cookie("token", token, COOKIE_OPTS);
}

function hasAnyUser() {
  return Boolean(db.prepare("SELECT 1 FROM users LIMIT 1").get());
}

// GET /api/auth/status — lets the login screen offer first-run setup.
router.get("/status", (req, res) => {
  res.json({ needsSetup: !hasAnyUser() });
});

// POST /api/auth/register — only works while no users exist.
router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  const invalid = validateCredentials(username, password);
  if (invalid) return res.status(400).json({ error: invalid });

  if (hasAnyUser()) {
    return res.status(403).json({ error: "Registration is closed" });
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  // Re-check inside the insert so two simultaneous first-run requests can't
  // both succeed.
  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash)
       SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)`,
    )
    .run(username.trim(), hash);
  if (result.changes === 0) {
    return res.status(403).json({ error: "Registration is closed" });
  }

  const user = { id: result.lastInsertRowid, username: username.trim() };
  setSessionCookie(res, user);
  res.status(201).json({ username: user.username });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username.trim());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  setSessionCookie(res, user);
  res.json({ username: user.username });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const { maxAge, ...clearOpts } = COOKIE_OPTS;
  res.clearCookie("token", clearOpts);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// POST /api/auth/create-user — authenticated, creates additional users.
router.post("/create-user", requireAuth, async (req, res) => {
  const { username, password } = req.body ?? {};
  const invalid = validateCredentials(username, password);
  if (invalid) return res.status(400).json({ error: invalid });

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username.trim());
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const result = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username.trim(), hash);

  res
    .status(201)
    .json({ id: Number(result.lastInsertRowid), username: username.trim() });
});

module.exports = router;
