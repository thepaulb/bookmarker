import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { db, seedUser } from "./helpers.js";

const require = createRequire(import.meta.url);
const { parsePocketCsv, importPocketCsv, toIsoDate } = require("../lib/pocket");
const { listBookmarks, listTags } = require("../lib/bookmarks");

const CSV = `title,url,time_added,tags,status
Home | Manager Tools,https://manager-tools.com/,1650968291,,unread
"Thinkmap Visual Thesaurus - An online thesaurus, and more",https://www.visualthesaurus.com/,1500907808,InformationVisualisation|ux,archive
http://bbc.co.uk,http://bbc.co.uk,1505387854,stoicism\\\\|\\,unread
Not a link,ftp://files.example.com/x,1505387854,,unread
Duplicate,https://manager-tools.com,1400000000,,unread
`;

describe("toIsoDate", () => {
  it("converts Unix seconds to an ISO string", () => {
    expect(toIsoDate("1650968291")).toBe("2022-04-26T10:18:11.000Z");
  });

  it("falls back to now for junk", () => {
    const before = Date.now();
    const iso = toIsoDate("nope");
    expect(Date.parse(iso)).toBeGreaterThanOrEqual(before);
  });
});

describe("parsePocketCsv", () => {
  it("maps rows to bookmark records", () => {
    const { records } = parsePocketCsv(CSV);
    expect(records[0]).toEqual({
      url: "https://manager-tools.com/",
      title: "Home | Manager Tools",
      description: "",
      createdAt: "2022-04-26T10:18:11.000Z",
      tags: [],
    });
  });

  it("handles quoted titles containing commas", () => {
    const { records } = parsePocketCsv(CSV);
    expect(records[1].title).toBe(
      "Thinkmap Visual Thesaurus - An online thesaurus, and more",
    );
  });

  it("splits and normalises pipe-separated tags", () => {
    const { records } = parsePocketCsv(CSV);
    expect(records[1].tags).toEqual(["informationvisualisation", "ux"]);
    expect(records[2].tags).toEqual(["stoicism"]);
  });

  it("generates a title when the title is just the URL", () => {
    const { records } = parsePocketCsv(CSV);
    expect(records[2].title).toBe("bbc.co.uk");
  });

  it("skips rows without a usable http(s) URL", () => {
    const { records, invalid } = parsePocketCsv(CSV);
    expect(invalid).toEqual(["ftp://files.example.com/x"]);
    expect(records.map((r) => r.url)).not.toContain(
      "ftp://files.example.com/x",
    );
  });

  it("tolerates a byte-order mark", () => {
    const { records } = parsePocketCsv(`﻿${CSV}`);
    expect(records).toHaveLength(4);
  });
});

describe("importPocketCsv", () => {
  it("imports bookmarks and tags for the user", () => {
    const user = seedUser("paul");
    const result = importPocketCsv(user.id, CSV);

    expect(result).toEqual({ imported: 3, duplicates: 1, invalid: 1 });

    const { bookmarks } = listBookmarks(user.id);
    // Newest first, keeping Pocket's original dates.
    expect(bookmarks.map((b) => b.url)).toEqual([
      "https://manager-tools.com/",
      "http://bbc.co.uk/",
      "https://www.visualthesaurus.com/",
    ]);
    expect(listTags(user.id).map((t) => t.name)).toEqual([
      "informationvisualisation",
      "stoicism",
      "ux",
    ]);
  });

  it("is safe to run twice", () => {
    const user = seedUser("paul");
    importPocketCsv(user.id, CSV);
    const second = importPocketCsv(user.id, CSV);

    expect(second).toEqual({ imported: 0, duplicates: 4, invalid: 1 });
    const count = db.prepare("SELECT COUNT(*) AS n FROM bookmarks").get().n;
    expect(count).toBe(3);
  });

  it("keeps each user's import separate", () => {
    const paul = seedUser("paul");
    const alex = seedUser("alex");
    importPocketCsv(paul.id, CSV);

    expect(importPocketCsv(alex.id, CSV).imported).toBe(3);
  });
});
