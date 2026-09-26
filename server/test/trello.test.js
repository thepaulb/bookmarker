import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseTrelloJson, extractUrl, dateFromTrelloId } = require("../lib/trello");

function item(id, name) {
  return { id, name, state: "incomplete" };
}

const EXPORT = JSON.stringify({
  checklists: [
    {
      name: "Links",
      checkItems: [
        item(
          "6877dce549c6db969ea70692",
          "https://mbrizic.com/blog/react-is-insane/?utm_source=tldrwebdev",
        ),
        item("6877dce549c6db969ea70693", "V important: https://scaling.com/sosaudioplayer"),
        item("6877dce549c6db969ea70694", "Just a note with no link"),
      ],
    },
    {
      name: "More",
      checkItems: [
        item(
          "68a00000aaaaaaaaaaaaaaaa",
          "[The Mirror Reset Protocol](https://event.example.com/replay/2w?webinar_id=10)",
        ),
      ],
    },
  ],
});

describe("extractUrl", () => {
  it("returns a bare URL", () => {
    expect(extractUrl("https://a.com/x")).toBe("https://a.com/x");
  });

  it("finds a URL after a note", () => {
    expect(extractUrl("This very good, esp for blogposts: https://blog.val.town/vibe-code")).toBe(
      "https://blog.val.town/vibe-code",
    );
  });

  it("finds a URL before a note", () => {
    expect(extractUrl("https://musicforprogramming.net/fiftysix - Love this design")).toBe(
      "https://musicforprogramming.net/fiftysix",
    );
  });

  it("drops trailing sentence punctuation", () => {
    expect(extractUrl("See https://a.com/page).")).toBe("https://a.com/page");
  });

  it("takes the URL from a Markdown link", () => {
    expect(extractUrl("[Some talk](https://a.com/talk?id=1)")).toBe(
      "https://a.com/talk?id=1",
    );
  });

  it("returns null when there's no URL", () => {
    expect(extractUrl("no link here")).toBeNull();
    expect(extractUrl(undefined)).toBeNull();
  });
});

describe("dateFromTrelloId", () => {
  it("reads the creation time from the id", () => {
    expect(dateFromTrelloId("6877dce549c6db969ea70692")).toBe(
      "2025-07-16T17:09:57.000Z",
    );
  });

  it("falls back to now for an unexpected id", () => {
    const before = Date.now();
    expect(Date.parse(dateFromTrelloId("nope"))).toBeGreaterThanOrEqual(before);
  });
});

describe("parseTrelloJson", () => {
  it("collects link items from every checklist", () => {
    const { records } = parseTrelloJson(EXPORT);
    expect(records.map((r) => r.url)).toEqual([
      "https://mbrizic.com/blog/react-is-insane/",
      "https://scaling.com/sosaudioplayer",
      "https://event.example.com/replay/2w?webinar_id=10",
    ]);
  });

  it("leaves the title empty and discards notes", () => {
    const { records } = parseTrelloJson(EXPORT);
    expect(records[1]).toEqual({
      url: "https://scaling.com/sosaudioplayer",
      title: "",
      description: "",
      createdAt: "2025-07-16T17:09:57.000Z",
      tags: [],
    });
  });

  it("reports items without a URL", () => {
    const { invalid } = parseTrelloJson(EXPORT);
    expect(invalid).toEqual(["Just a note with no link"]);
  });

  it("copes with an export that has no checklists", () => {
    expect(parseTrelloJson("{}")).toEqual({ records: [], invalid: [] });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseTrelloJson("{not json")).toThrow();
  });
});
