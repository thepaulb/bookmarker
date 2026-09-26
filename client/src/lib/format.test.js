import { describe, it, expect } from "vitest";
import { domainOf, formatDate, normaliseTag, tagPath } from "./format";

describe("formatDate", () => {
  it("formats an ISO date as a short UK date", () => {
    expect(formatDate("2026-09-26T12:00:00.000Z")).toMatch(/^26 Sept? 2026$/);
  });

  it("returns an empty string for bad input", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
});

describe("normaliseTag", () => {
  it("matches the server's rules", () => {
    expect(normaliseTag("  Brand   New ")).toBe("brand new");
    expect(normaliseTag("ci/cd")).toBe("ci-cd");
    expect(normaliseTag("stoic\\")).toBe("stoic");
    expect(normaliseTag("a".repeat(60))).toHaveLength(50);
  });
});

describe("tagPath", () => {
  it("URL-encodes the tag name", () => {
    expect(tagPath("ux")).toBe("/tags/ux");
    expect(tagPath("s&s")).toBe("/tags/s%26s");
    expect(tagPath("python datascience")).toBe("/tags/python%20datascience");
  });
});

describe("domainOf", () => {
  it("returns the host without www", () => {
    expect(domainOf("https://www.bbc.co.uk/news")).toBe("bbc.co.uk");
    expect(domainOf("http://1.1.1.1/")).toBe("1.1.1.1");
    expect(domainOf("https://en.wikipedia.org/wiki/FF_DIN")).toBe(
      "en.wikipedia.org",
    );
  });

  it("returns the input when it is not a URL", () => {
    expect(domainOf("not a url")).toBe("not a url");
  });
});
