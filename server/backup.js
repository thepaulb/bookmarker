// Full database backup — writes a point-in-time copy of bookmarks.db that
// can be dropped back in to recreate the database if it's ever lost or
// corrupted.
//
// Uses better-sqlite3's built-in backup() (SQLite's online backup API), so
// it's safe to run while the server is up: it copies committed pages
// straight from the live db, including anything only in the WAL, without
// needing a manual checkpoint or blocking writers for more than a moment.
//
// Respects DB_PATH like db.js, and writes into a "backups" directory next
// to wherever the db actually lives — in production that's the mounted
// volume (DB_PATH=/data/bookmarks.db), not the container's throwaway
// filesystem, so backups survive the next deploy. Keeps the last 30
// backups; older ones are deleted after each successful run.
//
// To restore: stop the server, then copy the backup file over the live db
//   cp <backups>/bookmarks-<timestamp>.db <DB_PATH>
//
//   node server/backup.js
//   npm run backup

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const KEEP = 30;

const dbPath = process.env.DB_PATH || path.join(__dirname, "bookmarks.db");
const backupDir = path.join(path.dirname(dbPath), "backups");

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `bookmarks-${stamp}.db`);

const db = new Database(dbPath, { readonly: true });

db.backup(backupPath)
  .then(() => {
    db.close();

    const counts = new Database(backupPath, { readonly: true });
    const rows = {
      users: counts.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      bookmarks: counts.prepare("SELECT COUNT(*) AS n FROM bookmarks").get().n,
      tags: counts.prepare("SELECT COUNT(*) AS n FROM tags").get().n,
      bookmark_tags: counts
        .prepare("SELECT COUNT(*) AS n FROM bookmark_tags")
        .get().n,
    };
    counts.close();

    console.log(`Backup written: ${path.relative(process.cwd(), backupPath)}`);
    console.log("Row counts:", rows);

    const old = fs
      .readdirSync(backupDir)
      .filter((f) => /^bookmarks-.*\.db$/.test(f))
      .sort()
      .reverse()
      .slice(KEEP);
    for (const f of old) {
      for (const suffix of ["", "-shm", "-wal"]) {
        const p = path.join(backupDir, f + suffix);
        if (fs.existsSync(p)) fs.rmSync(p);
      }
    }
    if (old.length) console.log(`Rotated out ${old.length} old backup(s)`);
  })
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
