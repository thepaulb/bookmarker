// Import a Pocket CSV export into a user's bookmarks.
//
//   npm run import:pocket -- --user paul
//   npm run import:pocket -- --user paul --file "path/to/part_000001.csv"
//
// The user must already exist (register through the app first). Safe to
// re-run: bookmarks whose URL the user already has are skipped.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { parseArgs } = require("util");

const DEFAULT_FILE = path.join(
  __dirname,
  "..",
  "Pocket export",
  "part_000000.csv",
);

function main() {
  const { values } = parseArgs({
    options: {
      user: { type: "string" },
      file: { type: "string", default: DEFAULT_FILE },
    },
  });

  if (!values.user) {
    console.error("Usage: npm run import:pocket -- --user <username> [--file <csv>]");
    process.exit(1);
  }
  if (!fs.existsSync(values.file)) {
    console.error(`File not found: ${values.file}`);
    process.exit(1);
  }

  // Required here, after dotenv, so DB_PATH from .env is honoured.
  const db = require("./db");
  const { importPocketCsv } = require("./lib/pocket");

  const user = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(values.user);
  if (!user) {
    console.error(
      `No user "${values.user}". Create the account in the app first.`,
    );
    process.exit(1);
  }

  const text = fs.readFileSync(values.file, "utf8");
  const { imported, duplicates, invalid } = importPocketCsv(user.id, text);
  console.log(
    `Imported ${imported} bookmarks for ${values.user} ` +
      `(${duplicates} already present, ${invalid} invalid URLs skipped).`,
  );
}

main();
