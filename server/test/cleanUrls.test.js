import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { db, seedUser, seedBookmark } from "./helpers.js";

const require = createRequire(import.meta.url);
const { planUrlCleanup, applyUrlCleanup } = require("../lib/cleanUrls");
const { listBookmarks, listTags } = require("../lib/bookmarks");

function urls(userId) {
  return listBookmarks(userId).bookmarks.map((b) => b.url).sort();
}

describe("planUrlCleanup", () => {
  it("lists URLs that would lose tracking parameters, changing nothing", () => {
    const user = seedUser();
    const id = seedBookmark(user.id, {
      url: "https://a.com/post?utm_source=news&id=1",
    });
    seedBookmark(user.id, { url: "https://clean.com/" });

    expect(planUrlCleanup(user.id)).toEqual([
      {
        keepId: id,
        from: "https://a.com/post?utm_source=news&id=1",
        to: "https://a.com/post?id=1",
        mergeIds: [],
      },
    ]);
    expect(urls(user.id)).toContain("https://a.com/post?utm_source=news&id=1");
  });

  it("returns nothing when every URL is already clean", () => {
    const user = seedUser();
    seedBookmark(user.id, { url: "https://clean.com/" });
    expect(planUrlCleanup(user.id)).toEqual([]);
  });
});

describe("applyUrlCleanup", () => {
  it("rewrites URLs without tracking parameters", () => {
    const user = seedUser();
    seedBookmark(user.id, { url: "https://a.com/post?utm_source=news" });

    applyUrlCleanup(user.id);

    expect(urls(user.id)).toEqual(["https://a.com/post"]);
  });

  it("merges bookmarks that are the same page, keeping the oldest and all tags", () => {
    const user = seedUser();
    const oldest = seedBookmark(user.id, {
      url: "https://a.com/post?utm_source=one",
      title: "Oldest",
      tags: ["ux"],
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    seedBookmark(user.id, {
      url: "https://a.com/post",
      title: "Clean but newer",
      tags: ["reading"],
      createdAt: "2022-01-01T00:00:00.000Z",
    });
    seedBookmark(user.id, {
      url: "https://a.com/post?fbclid=zzz",
      title: "Newest",
      tags: ["ux"],
      createdAt: "2024-01-01T00:00:00.000Z",
    });

    applyUrlCleanup(user.id);

    const { bookmarks } = listBookmarks(user.id);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]).toMatchObject({
      id: oldest,
      url: "https://a.com/post",
      title: "Oldest",
      createdAt: "2020-01-01T00:00:00.000Z",
      tags: ["reading", "ux"],
    });
    expect(listTags(user.id)).toEqual([
      { name: "reading", count: 1 },
      { name: "ux", count: 1 },
    ]);
  });

  it("only touches the given user's bookmarks", () => {
    const paul = seedUser("paul");
    const alex = seedUser("alex");
    seedBookmark(alex.id, { url: "https://a.com/?utm_source=x" });

    applyUrlCleanup(paul.id);

    expect(urls(alex.id)).toEqual(["https://a.com/?utm_source=x"]);
  });

  it("is safe to run twice", () => {
    const user = seedUser();
    seedBookmark(user.id, { url: "https://a.com/?utm_source=x" });
    applyUrlCleanup(user.id);

    expect(applyUrlCleanup(user.id)).toEqual([]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM bookmarks").get().n).toBe(1);
  });
});
