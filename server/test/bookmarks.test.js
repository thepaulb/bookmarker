import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db, seedUser, seedBookmark, authCookie } from "./helpers.js";

let user;
let cookie;

beforeEach(() => {
  user = seedUser("paul");
  cookie = authCookie(user);
});

// ISO date for day n of 2026, so seeded bookmarks have a known order.
function day(n) {
  return new Date(Date.UTC(2026, 0, n)).toISOString();
}

describe("authentication", () => {
  it.each([
    ["get", "/api/bookmarks"],
    ["post", "/api/bookmarks"],
    ["delete", "/api/bookmarks/1"],
    ["get", "/api/tags"],
  ])("%s %s requires a session", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/bookmarks", () => {
  it("returns the user's bookmarks newest first with tags", async () => {
    seedBookmark(user.id, { title: "Old", createdAt: day(1), tags: ["b", "a"] });
    seedBookmark(user.id, { title: "New", createdAt: day(3) });
    seedBookmark(user.id, { title: "Middle", createdAt: day(2) });

    const res = await request(app).get("/api/bookmarks").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.bookmarks.map((b) => b.title)).toEqual([
      "New",
      "Middle",
      "Old",
    ]);
    expect(res.body.bookmarks[2]).toMatchObject({
      title: "Old",
      createdAt: day(1),
      description: "",
      tags: ["a", "b"],
    });
    expect(res.body.hasMore).toBe(false);
    expect(res.body.pageSize).toBe(50);
  });

  it("returns at most 50 and flags when there are more", async () => {
    for (let i = 1; i <= 51; i += 1) {
      seedBookmark(user.id, { title: `B${i}`, createdAt: day(i) });
    }

    const res = await request(app).get("/api/bookmarks").set("Cookie", cookie);

    expect(res.body.bookmarks).toHaveLength(50);
    expect(res.body.bookmarks[0].title).toBe("B51");
    expect(res.body.hasMore).toBe(true);
  });

  it("pages with offset", async () => {
    for (let i = 1; i <= 51; i += 1) {
      seedBookmark(user.id, { title: `B${i}`, createdAt: day(i) });
    }

    const res = await request(app)
      .get("/api/bookmarks?offset=50")
      .set("Cookie", cookie);

    expect(res.body.bookmarks.map((b) => b.title)).toEqual(["B1"]);
    expect(res.body.hasMore).toBe(false);
  });

  it("treats a junk offset as 0", async () => {
    seedBookmark(user.id);
    const res = await request(app)
      .get("/api/bookmarks?offset=-5")
      .set("Cookie", cookie);
    expect(res.body.bookmarks).toHaveLength(1);
  });

  it("breaks ties on identical dates by newest id", async () => {
    seedBookmark(user.id, { title: "First", createdAt: day(1) });
    seedBookmark(user.id, { title: "Second", createdAt: day(1) });

    const res = await request(app).get("/api/bookmarks").set("Cookie", cookie);
    expect(res.body.bookmarks.map((b) => b.title)).toEqual(["Second", "First"]);
  });

  it("never returns another user's bookmarks", async () => {
    const other = seedUser("alex");
    seedBookmark(other.id, { title: "Alex's" });
    seedBookmark(user.id, { title: "Paul's" });

    const res = await request(app).get("/api/bookmarks").set("Cookie", cookie);
    expect(res.body.bookmarks.map((b) => b.title)).toEqual(["Paul's"]);
  });

  describe("search (q)", () => {
    beforeEach(() => {
      seedBookmark(user.id, {
        title: "Kanban for teams",
        url: "https://agile.example.com/one",
        createdAt: day(1),
      });
      seedBookmark(user.id, {
        title: "Roast chicken",
        url: "https://recipes.example.com/kanban-free",
        createdAt: day(2),
      });
      seedBookmark(user.id, {
        title: "Morning routine",
        url: "https://blog.example.com/routine",
        tags: ["productivity"],
        createdAt: day(3),
      });
    });

    async function search(q) {
      const res = await request(app)
        .get("/api/bookmarks")
        .query({ q })
        .set("Cookie", cookie);
      return res.body.bookmarks.map((b) => b.title);
    }

    it("matches title and URL, case-insensitively, newest first", async () => {
      expect(await search("KANBAN")).toEqual([
        "Roast chicken",
        "Kanban for teams",
      ]);
    });

    it("matches tag names", async () => {
      expect(await search("product")).toEqual(["Morning routine"]);
    });

    it("returns nothing when nothing matches", async () => {
      expect(await search("zebra")).toEqual([]);
    });

    it("treats LIKE wildcards literally", async () => {
      expect(await search("%")).toEqual([]);
      expect(await search("_")).toEqual([]);
    });

    it("ignores a blank query", async () => {
      expect(await search("   ")).toHaveLength(3);
    });

    it("does not search other users' bookmarks", async () => {
      const other = seedUser("alex");
      seedBookmark(other.id, { title: "Kanban secrets" });
      expect(await search("secrets")).toEqual([]);
    });
  });

  describe("tag filter", () => {
    it("returns only bookmarks with that exact tag", async () => {
      seedBookmark(user.id, { title: "A", tags: ["ux"], createdAt: day(1) });
      seedBookmark(user.id, { title: "B", tags: ["uxd"], createdAt: day(2) });
      seedBookmark(user.id, { title: "C", tags: ["ux", "x"], createdAt: day(3) });

      const res = await request(app)
        .get("/api/bookmarks?tag=ux")
        .set("Cookie", cookie);
      expect(res.body.bookmarks.map((b) => b.title)).toEqual(["C", "A"]);
    });

    it("normalises the tag it is given", async () => {
      seedBookmark(user.id, { title: "A", tags: ["python data"] });
      const res = await request(app)
        .get("/api/bookmarks")
        .query({ tag: "  Python   Data " })
        .set("Cookie", cookie);
      expect(res.body.bookmarks).toHaveLength(1);
    });

    it("returns nothing for a tag that cleans to empty", async () => {
      seedBookmark(user.id, { title: "A" });
      const res = await request(app)
        .get("/api/bookmarks")
        .query({ tag: "\\" })
        .set("Cookie", cookie);
      expect(res.body.bookmarks).toEqual([]);
    });
  });
});

describe("POST /api/bookmarks", () => {
  function post(body) {
    return request(app).post("/api/bookmarks").set("Cookie", cookie).send(body);
  }

  it("creates a bookmark with tags and returns it", async () => {
    const res = await post({
      url: "https://example.com/article",
      title: "  An article ",
      description: " Worth reading ",
      tags: ["Reading", "ux", "reading"],
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      url: "https://example.com/article",
      title: "An article",
      description: "Worth reading",
      tags: ["reading", "ux"],
    });
    expect(Date.parse(res.body.createdAt)).not.toBeNaN();
  });

  it("creates new tags and reuses existing ones", async () => {
    seedBookmark(user.id, { tags: ["ux"] });
    await post({ url: "https://example.com/x", tags: ["ux", "brand-new"] });

    const names = db
      .prepare("SELECT name FROM tags WHERE user_id = ? ORDER BY name")
      .all(user.id)
      .map((r) => r.name);
    expect(names).toEqual(["brand-new", "ux"]);
  });

  it("derives a title from the URL when none is given", async () => {
    const res = await post({ url: "https://www.example.com/great-read" });
    expect(res.body.title).toBe("Great read – example.com");
  });

  it("works with no tags or description", async () => {
    const res = await post({ url: "example.com" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      url: "https://example.com/",
      description: "",
      tags: [],
    });
  });

  it("rejects a duplicate URL with 409 and the existing id", async () => {
    const existingId = seedBookmark(user.id, { url: "https://example.com/" });
    const res = await post({ url: "https://example.com" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "You have already bookmarked this URL",
      existingId,
    });
  });

  it("allows the same URL for different users", async () => {
    const other = seedUser("alex");
    seedBookmark(other.id, { url: "https://example.com/" });
    const res = await post({ url: "https://example.com/" });
    expect(res.status).toBe(201);
  });

  it.each([
    ["missing url", {}],
    ["invalid url", { url: "not a url" }],
    ["javascript url", { url: "javascript:alert(1)" }],
    ["non-string title", { url: "https://a.com", title: 5 }],
    ["overlong title", { url: "https://a.com", title: "x".repeat(501) }],
    ["non-string description", { url: "https://a.com", description: {} }],
    [
      "overlong description",
      { url: "https://a.com", description: "x".repeat(2001) },
    ],
    ["tags not a list", { url: "https://a.com", tags: "ux" }],
    [
      "too many tags",
      { url: "https://a.com", tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
    ],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(app)
      .post("/api/bookmarks")
      .set("Cookie", cookie)
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/bookmarks/:id", () => {
  it("deletes the bookmark", async () => {
    const id = seedBookmark(user.id);
    const res = await request(app)
      .delete(`/api/bookmarks/${id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(204);
    expect(db.prepare("SELECT 1 FROM bookmarks WHERE id = ?").get(id)).toBeUndefined();
  });

  it("removes tags left with no bookmarks, keeping ones still in use", async () => {
    const id = seedBookmark(user.id, { tags: ["only-here", "shared"] });
    seedBookmark(user.id, { tags: ["shared"] });

    await request(app).delete(`/api/bookmarks/${id}`).set("Cookie", cookie);

    const names = db
      .prepare("SELECT name FROM tags WHERE user_id = ?")
      .all(user.id)
      .map((r) => r.name);
    expect(names).toEqual(["shared"]);
  });

  it("is 404 for another user's bookmark and leaves it alone", async () => {
    const other = seedUser("alex");
    const id = seedBookmark(other.id);

    const res = await request(app)
      .delete(`/api/bookmarks/${id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
    expect(db.prepare("SELECT 1 FROM bookmarks WHERE id = ?").get(id)).toBeTruthy();
  });

  it.each(["999", "abc", "0", "1.5"])("is 404 for id %s", async (id) => {
    const res = await request(app)
      .delete(`/api/bookmarks/${id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/tags", () => {
  it("lists the user's tags A–Z with counts", async () => {
    seedBookmark(user.id, { tags: ["ux", "agile"] });
    seedBookmark(user.id, { tags: ["ux"] });

    const res = await request(app).get("/api/tags").set("Cookie", cookie);
    expect(res.body).toEqual([
      { name: "agile", count: 1 },
      { name: "ux", count: 2 },
    ]);
  });

  it("excludes other users' tags", async () => {
    const other = seedUser("alex");
    seedBookmark(other.id, { tags: ["secret"] });

    const res = await request(app).get("/api/tags").set("Cookie", cookie);
    expect(res.body).toEqual([]);
  });
});

describe("unknown API routes", () => {
  it("return a JSON 404", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("health check is public", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body).toEqual({ status: "ok" });
  });
});
