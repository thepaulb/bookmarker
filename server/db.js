const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// DB_PATH lets tests point at a throwaway database (e.g. ":memory:");
// otherwise we use server/bookmarks.db.
//
// Tests reset the schema between cases, so a test run must never open a
// real file. Vitest always sets VITEST; if the in-memory DB_PATH from
// vitest.config.mjs didn't arrive (e.g. the config wasn't found), stop.
if (process.env.VITEST && process.env.DB_PATH !== ":memory:") {
  throw new Error(
    "Refusing to open a real database under Vitest: DB_PATH must be ':memory:'. " +
      "Run server tests from the project root (npm run test:server).",
  );
}

const db = new Database(
  process.env.DB_PATH || path.join(__dirname, "bookmarks.db"),
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Every statement in schema.sql is idempotent (IF NOT EXISTS), so it is
// safe to apply on every start: a fresh database gets its tables, an
// existing one is left alone.
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

module.exports = db;
