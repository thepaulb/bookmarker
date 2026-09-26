import { describe, it, expect } from "vitest";
import { layoutStars, partnersOf, pickStars, starRadius } from "./starMap";

const TAGS = [
  { name: "fitness", count: 157 },
  { name: "mobility", count: 37 },
  { name: "pullup", count: 16 },
  { name: "business", count: 67 },
  { name: "technology", count: 13 },
  { name: "security", count: 44 },
  { name: "wordpress", count: 27 },
  { name: "empty", count: 0 },
];

const LINKS = [
  { a: "fitness", b: "mobility", count: 13 },
  { a: "fitness", b: "pullup", count: 7 },
  { a: "business", b: "technology", count: 5 },
  { a: "security", b: "wordpress", count: 3 },
  { a: "business", b: "empty", count: 1 },
];

const BOX = { width: 1152, height: 600, count: 36, fontSize: 13 };

describe("pickStars", () => {
  it("takes the biggest tags, ties A–Z, and skips unused tags", () => {
    const tags = [
      { name: "b", count: 2 },
      { name: "a", count: 2 },
      { name: "c", count: 5 },
      { name: "d", count: 0 },
    ];
    expect(pickStars(tags, 3).map((t) => t.name)).toEqual(["c", "a", "b"]);
    expect(pickStars(tags, 1).map((t) => t.name)).toEqual(["c"]);
  });
});

describe("starRadius", () => {
  it("grows with count and tops out for the biggest tag", () => {
    expect(starRadius(157, 157)).toBe(12);
    expect(starRadius(40, 157)).toBeLessThan(starRadius(80, 157));
    expect(starRadius(157, 157, 2)).toBe(24);
  });
});

describe("layoutStars", () => {
  it("draws the biggest tags, biggest first", () => {
    const { nodes } = layoutStars(TAGS, LINKS, { ...BOX, count: 3 });
    expect(nodes.map((n) => n.name)).toEqual(["fitness", "business", "security"]);
  });

  it("keeps only lines between drawn stars", () => {
    const { edges } = layoutStars(TAGS, LINKS, BOX);
    expect(edges).toHaveLength(4);
    expect(edges.some((e) => e.b === "empty")).toBe(false);
  });

  it("is deterministic", () => {
    expect(layoutStars(TAGS, LINKS, BOX)).toEqual(layoutStars(TAGS, LINKS, BOX));
  });

  it("keeps every star inside the box", () => {
    const { nodes } = layoutStars(TAGS, LINKS, BOX);
    for (const n of nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(BOX.width);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(BOX.height);
    }
  });

  it("pulls linked tags closer together than unlinked ones", () => {
    const { nodes } = layoutStars(TAGS, LINKS, BOX);
    const at = Object.fromEntries(nodes.map((n) => [n.name, n]));
    const dist = (a, b) => Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y);
    expect(dist("fitness", "mobility")).toBeLessThan(dist("fitness", "wordpress"));
    expect(dist("business", "technology")).toBeLessThan(
      dist("business", "pullup"),
    );
  });

  it("copes with no tags and with a single tag", () => {
    expect(layoutStars([], [], BOX)).toEqual({ nodes: [], edges: [] });
    const { nodes } = layoutStars([{ name: "solo", count: 1 }], [], BOX);
    expect(nodes).toHaveLength(1);
    expect(Number.isFinite(nodes[0].x)).toBe(true);
  });
});

describe("partnersOf", () => {
  it("lists the other tag in each pair, keeping the links' order", () => {
    expect(partnersOf("fitness", LINKS)).toEqual([
      { name: "mobility", count: 13 },
      { name: "pullup", count: 7 },
    ]);
    expect(partnersOf("technology", LINKS)).toEqual([
      { name: "business", count: 5 },
    ]);
    expect(partnersOf("nobody", LINKS)).toEqual([]);
  });
});
