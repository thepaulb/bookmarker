import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
import { seedUser, seedBookmark } from "./helpers.js";

const require = createRequire(import.meta.url);
const { importBookmarks } = require("../lib/importer");
const { listBookmarks } = require("../lib/bookmarks");

function record(url, fields = {}) {
  return {
    url,
    title: "",
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    ...fields,
  };
}

// Fake fetch that serves a title per URL (or fails for unknown ones).
function pages(titles) {
  return vi.fn(async (url) =>
    titles[url]
      ? new Response(`<title>${titles[url]}</title>`, {
          headers: { "Content-Type": "text/html" },
        })
      : new Response("", { status: 404 }),
  );
}

describe("importBookmarks", () => {
  it("fetches missing titles when asked", async () => {
    const user = seedUser();
    const fetchImpl = pages({ "https://a.com/post": "A real title" });

    const result = await importBookmarks(
      user.id,
      [record("https://a.com/post"), record("https://b.com/some-page")],
      { fetchTitles: true, fetchImpl },
    );

    expect(result).toEqual({
      imported: 2,
      duplicates: 0,
      titlesFetched: 1,
      titlesDerived: 1,
    });
    const titles = listBookmarks(user.id).bookmarks.map((b) => b.title).sort();
    expect(titles).toEqual(["A real title", "Some page – b.com"]);
  });

  it("derives titles from the URL without fetching when not asked", async () => {
    const user = seedUser();
    const fetchImpl = vi.fn();

    await importBookmarks(user.id, [record("https://b.com/some-page")], {
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listBookmarks(user.id).bookmarks[0].title).toBe("Some page – b.com");
  });

  it("keeps titles the record already has without fetching", async () => {
    const user = seedUser();
    const fetchImpl = vi.fn();

    await importBookmarks(user.id, [record("https://a.com/", { title: "Given" })], {
      fetchTitles: true,
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listBookmarks(user.id).bookmarks[0].title).toBe("Given");
  });

  it("skips existing and repeated URLs before fetching anything", async () => {
    const user = seedUser();
    seedBookmark(user.id, { url: "https://have.com/" });
    const fetchImpl = pages({ "https://new.com/": "New" });

    const result = await importBookmarks(
      user.id,
      [
        record("https://have.com/"),
        record("https://new.com/"),
        record("https://new.com/"),
      ],
      { fetchTitles: true, fetchImpl },
    );

    expect(result.imported).toBe(1);
    expect(result.duplicates).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("adds extra tags to every bookmark, normalised and merged", async () => {
    const user = seedUser();
    await importBookmarks(
      user.id,
      [record("https://a.com/", { tags: ["ux"] }), record("https://b.com/")],
      { extraTags: ["To-Sort", "ux"] },
    );

    const tagsByUrl = Object.fromEntries(
      listBookmarks(user.id).bookmarks.map((b) => [b.url, b.tags]),
    );
    expect(tagsByUrl).toEqual({
      "https://a.com/": ["to-sort", "ux"],
      "https://b.com/": ["to-sort", "ux"],
    });
  });

  it("reports each title lookup", async () => {
    const user = seedUser();
    const onTitle = vi.fn();
    await importBookmarks(user.id, [record("https://a.com/x")], {
      fetchTitles: true,
      fetchImpl: pages({ "https://a.com/x": "X marks" }),
      onTitle,
    });
    expect(onTitle).toHaveBeenCalledWith("https://a.com/x", "X marks");
  });

  it("keeps the record's creation date", async () => {
    const user = seedUser();
    await importBookmarks(user.id, [
      record("https://a.com/", { createdAt: "2025-07-16T17:09:57.000Z" }),
    ]);
    expect(listBookmarks(user.id).bookmarks[0].createdAt).toBe(
      "2025-07-16T17:09:57.000Z",
    );
  });
});
