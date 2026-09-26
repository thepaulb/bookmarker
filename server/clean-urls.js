// Strip tracking parameters (utm_*, fbclid, …) from every stored bookmark
// URL, merging any bookmarks that turn out to be the same page.
//
//   npm run clean:urls              # dry run: shows what would change
//   npm run clean:urls -- --apply   # makes the changes
//
// Back up server/bookmarks.db before running with --apply.
require("dotenv").config({ quiet: true });
const { parseArgs } = require("util");

function main() {
  const { values } = parseArgs({
    options: { apply: { type: "boolean", default: false } },
  });

  const db = require("./db");
  const { planUrlCleanup, applyUrlCleanup } = require("./lib/cleanUrls");

  const users = db.prepare("SELECT id, username FROM users ORDER BY id").all();
  let changed = 0;
  let merged = 0;

  for (const user of users) {
    const plan = values.apply
      ? applyUrlCleanup(user.id)
      : planUrlCleanup(user.id);
    for (const { from, to, mergeIds } of plan) {
      console.log(`[${user.username}] ${from}\n    -> ${to}`);
      if (mergeIds.length > 0) {
        console.log(`    merged ${mergeIds.length} duplicate(s) into this one`);
      }
      if (from !== to) changed += 1;
      merged += mergeIds.length;
    }
  }

  const verb = values.apply ? "Cleaned" : "Would clean";
  console.log(
    `\n${verb} ${changed} URLs and ${values.apply ? "merged" : "merge"} ${merged} duplicate bookmarks.`,
  );
  if (!values.apply && changed + merged > 0) {
    console.log("Nothing has been changed. Re-run with --apply to make these changes.");
  }
}

main();
