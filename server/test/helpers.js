// Shared helpers for server tests: schema reset, seeding, and auth cookies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import jwt from "jsonwebtoken";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The singleton db connection (opened against DB_PATH=:memory: in tests).
const db = require("../db");
const { insertBookmark } = require("../lib/bookmarks");

const SCHEMA = fs.readFileSync(
  path.join(__dirname, "..", "schema.sql"),
  "utf8",
);

const TABLES = ["bookmark_tags", "tags", "bookmarks", "users"];

// Drop every table and rebuild from schema.sql so each test starts clean.
export function resetDb() {
  db.pragma("foreign_keys = OFF");
  for (const t of TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`);
  db.exec(SCHEMA);
  db.pragma("foreign_keys = ON");
}

// Insert a user and return { id, username }. Password hash is irrelevant
// for most tests (we mint cookies directly), so a placeholder is fine.
export function seedUser(username = "tester", passwordHash = "x") {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
  return { id: Number(lastInsertRowid), username };
}

let urlCounter = 0;

// Insert a bookmark for a user and return its id. Defaults give each call a
// unique URL; createdAt defaults to a fixed date so ordering tests can pass
// explicit ones.
export function seedBookmark(userId, fields = {}) {
  urlCounter += 1;
  const {
    url = `https://example.com/page-${urlCounter}`,
    title = `Page ${urlCounter}`,
    description = "",
    tags = [],
    createdAt = "2026-01-01T00:00:00.000Z",
  } = fields;
  return insertBookmark(userId, { url, title, description, tags, createdAt });
}

// Build a signed auth cookie for supertest: .set("Cookie", authCookie(user)).
export function authCookie(user) {
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
  );
  return `token=${token}`;
}

export { db };
