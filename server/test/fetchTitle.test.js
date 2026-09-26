import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  fetchTitle,
  extractTitle,
  decodeEntities,
  mapLimit,
} = require("../lib/fetchTitle");

// A fetch stand-in that answers every request with one response.
function respond(body, { status = 200, type = "text/html; charset=utf-8" } = {}) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: type ? { "Content-Type": type } : {},
    }),
  );
}

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Tom &amp; Jerry &#8211; &#x2019;s &hellip; &pound;5")).toBe(
      "Tom & Jerry – ’s … £5",
    );
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&madeup; &#99999999;")).toBe("&madeup; &#99999999;");
  });
});

describe("extractTitle", () => {
  it("prefers og:title", () => {
    const html = `<head><title>Site | Page</title>
      <meta property="og:title" content="The Page"></head>`;
    expect(extractTitle(html)).toBe("The Page");
  });

  it("handles og:title with content before property", () => {
    expect(
      extractTitle(`<meta content="Reversed" property="og:title">`),
    ).toBe("Reversed");
  });

  it("falls back to <title>, tidying whitespace and entities", () => {
    expect(extractTitle("<title>\n  Fish &amp;\n chips </title>")).toBe(
      "Fish & chips",
    );
  });

  it("returns empty when there is no title", () => {
    expect(extractTitle("<p>hi</p>")).toBe("");
  });
});

describe("fetchTitle", () => {
  it("returns the page title", async () => {
    const fetchImpl = respond("<title>React is insane</title>");
    await expect(
      fetchTitle("https://mbrizic.com/blog/react-is-insane/", { fetchImpl }),
    ).resolves.toBe("React is insane");
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://mbrizic.com/blog/react-is-insane/",
    );
  });

  it("uses YouTube's oEmbed endpoint for videos", async () => {
    const fetchImpl = respond({ title: "A great talk" }, { type: "application/json" });
    await expect(
      fetchTitle("https://www.youtube.com/watch?v=OUzBPES44Co", { fetchImpl }),
    ).resolves.toBe("A great talk");
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DOUzBPES44Co",
    );
  });

  it("handles youtu.be links", async () => {
    const fetchImpl = respond({ title: "Short link" }, { type: "application/json" });
    await expect(
      fetchTitle("https://youtu.be/FuooVrSpffk", { fetchImpl }),
    ).resolves.toBe("Short link");
  });

  it("returns empty when YouTube oEmbed fails", async () => {
    const fetchImpl = respond("", { status: 404 });
    await expect(
      fetchTitle("https://www.youtube.com/watch?v=gone", { fetchImpl }),
    ).resolves.toBe("");
  });

  it.each([
    ["Just a moment..."],
    ["Attention Required! | Cloudflare"],
    ["Access Denied"],
    ["404 - Page not found"],
    ["Page Not Found"],
  ])("rejects bot-wall / error title %j", async (title) => {
    const fetchImpl = respond(`<title>${title}</title>`);
    await expect(fetchTitle("https://a.com/", { fetchImpl })).resolves.toBe("");
  });

  it("keeps titles that merely contain 'not found' mid-sentence", async () => {
    const fetchImpl = respond("<title>Lost and not found: a memoir</title>");
    await expect(fetchTitle("https://a.com/", { fetchImpl })).resolves.toBe(
      "Lost and not found: a memoir",
    );
  });

  it("returns empty for an error status", async () => {
    const fetchImpl = respond("<title>Oops</title>", { status: 500 });
    await expect(fetchTitle("https://a.com/", { fetchImpl })).resolves.toBe("");
  });

  it("ignores non-HTML responses", async () => {
    const fetchImpl = respond("%PDF-1.4", { type: "application/pdf" });
    await expect(fetchTitle("https://a.com/x.pdf", { fetchImpl })).resolves.toBe("");
  });

  it("never throws, even if the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(fetchTitle("https://a.com/", { fetchImpl })).resolves.toBe("");
  });

  it("only reads the start of very large pages", async () => {
    const big = `<title>Early title</title>${"x".repeat(2 * 1024 * 1024)}`;
    const fetchImpl = respond(big);
    await expect(fetchTitle("https://a.com/", { fetchImpl })).resolves.toBe(
      "Early title",
    );
  });
});

describe("mapLimit", () => {
  it("preserves order and caps concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5 * (6 - n)));
      inFlight -= 1;
      return n * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    await expect(mapLimit([], 3, async () => 1)).resolves.toEqual([]);
  });
});
