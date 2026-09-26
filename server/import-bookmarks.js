// Import bookmarks into a user's account from a Pocket CSV export or a
// Trello JSON export (checklist items holding links).
//
//   npm run import -- --user paul
//   npm run import -- --user paul --file ~/Downloads/bookmarks.json --tag to-sort
//
// Options:
//   --file <path>        .csv = Pocket, .json = Trello
//                        (default: "Pocket export/part_000000.csv")
//   --tag <name>         add this tag to every imported bookmark (repeatable)
//   --no-fetch-titles    don't visit pages to look up missing titles; derive
//                        them from the URL instead
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

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const { values } = parseArgs({
    options: {
      user: { type: "string" },
      file: { type: "string", default: DEFAULT_FILE },
      tag: { type: "string", multiple: true, default: [] },
      "no-fetch-titles": { type: "boolean", default: false },
    },
  });

  if (!values.user) {
    fail(
      "Usage: npm run import -- --user <username> [--file <csv|json>] [--tag <name>] [--no-fetch-titles]",
    );
  }
  if (!fs.existsSync(values.file)) fail(`File not found: ${values.file}`);

  const ext = path.extname(values.file).toLowerCase();
  if (ext !== ".csv" && ext !== ".json") {
    fail("Unsupported file type: use a Pocket .csv or a Trello .json export");
  }

  // Required here, after dotenv, so DB_PATH from .env is honoured.
  const db = require("./db");
  const { importBookmarks } = require("./lib/importer");
  const { parsePocketCsv } = require("./lib/pocket");
  const { parseTrelloJson } = require("./lib/trello");

  const user = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(values.user);
  if (!user) {
    fail(`No user "${values.user}". Create the account in the app first.`);
  }

  const text = fs.readFileSync(values.file, "utf8");
  let parsed;
  try {
    parsed = ext === ".csv" ? parsePocketCsv(text) : parseTrelloJson(text);
  } catch (err) {
    fail(`Could not read ${values.file}: ${err.message}`);
  }
  const { records, invalid } = parsed;

  const fetchTitles = !values["no-fetch-titles"];
  const needTitles = records.filter((r) => !r.title).length;
  if (fetchTitles && needTitles > 0) {
    console.log(`Looking up titles for up to ${needTitles} pages…`);
  }

  const result = await importBookmarks(user.id, records, {
    extraTags: values.tag,
    fetchTitles,
    onTitle: (url, title) =>
      console.log(`  ${title ? "✓" : "✗ (using URL)"} ${title || url}`),
  });

  console.log(
    `\nImported ${result.imported} bookmarks for ${values.user} ` +
      `(${result.duplicates} already present, ${invalid.length} without a usable URL).`,
  );
  if (fetchTitles && result.titlesFetched + result.titlesDerived > 0) {
    console.log(
      `Titles: ${result.titlesFetched} fetched, ${result.titlesDerived} derived from the URL.`,
    );
  }
  if (invalid.length > 0) {
    console.log("Skipped (no usable URL):");
    for (const text of invalid) console.log(`  ${text}`);
  }
}

main();
