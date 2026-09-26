import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normaliseTag, normaliseTags } = require("../lib/tags");

describe("normaliseTag", () => {
  it("lower-cases and trims", () => {
    expect(normaliseTag("  UX ")).toBe("ux");
  });

  it("collapses inner whitespace", () => {
    expect(normaliseTag("python   data\tscience")).toBe("python data science");
  });

  it("removes backslashes left over from the Pocket export", () => {
    expect(normaliseTag("stoicism\\\\")).toBe("stoicism");
    expect(normaliseTag("\\")).toBe("");
  });

  it("replaces slashes so the tag fits in a URL path", () => {
    expect(normaliseTag("ci/cd")).toBe("ci-cd");
  });

  it("keeps other punctuation", () => {
    expect(normaliseTag("s&s")).toBe("s&s");
    expect(normaliseTag("discount:takk")).toBe("discount:takk");
  });

  it("caps length at 50 characters", () => {
    expect(normaliseTag("a".repeat(80))).toHaveLength(50);
  });

  it("returns an empty string for non-strings", () => {
    expect(normaliseTag(undefined)).toBe("");
    expect(normaliseTag(7)).toBe("");
  });
});

describe("normaliseTags", () => {
  it("normalises, drops empties and de-duplicates in order", () => {
    expect(normaliseTags(["UX", "", "ux", " agile ", "\\"])).toEqual([
      "ux",
      "agile",
    ]);
  });

  it("returns [] for non-arrays", () => {
    expect(normaliseTags("ux")).toEqual([]);
    expect(normaliseTags(null)).toEqual([]);
  });
});
