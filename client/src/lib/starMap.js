// Lays out the tag star map: the user's biggest tags as stars, pulled
// together by the tags they share bookmarks with and pushed apart by
// everything else. Pure and deterministic (no randomness), so the same
// tags always produce the same sky and it doesn't reshuffle on reload.
//
// tags:  [{ name, count }]        from GET /api/tags
// links: [{ a, b, count }]        from GET /api/tags/links
// box:   { width, height, count, fontSize } in SVG user units
//
// Returns { nodes: [{ name, count, x, y, r, labelY }], edges: [{ a, b, count }] }
// with nodes biggest first and only the edges between drawn stars.

const ITERATIONS = 400;
// Labels are wider than they are tall, so vertical distance counts for
// more when stars repel; it keeps labels from stacking into each other.
const LABEL_SQUASH = 1.6;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function pickStars(tags, count) {
  return [...tags]
    .filter((t) => t.count > 0)
    .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name))
    .slice(0, count);
}

export function starRadius(count, maxCount, scale = 1) {
  return (3 + 9 * Math.sqrt(count / Math.max(maxCount, 1))) * scale;
}

export function layoutStars(tags, links, box) {
  const { width: W, height: H, count = 36, fontSize = 13, scale = 1 } = box;
  const stars = pickStars(tags, count);
  if (stars.length === 0) return { nodes: [], edges: [] };

  const index = new Map(stars.map((s, i) => [s.name, i]));
  const edges = links.filter((l) => index.has(l.a) && index.has(l.b));
  const maxCount = stars[0].count;

  const cx = W / 2;
  const cy = H / 2;
  const ideal = Math.sqrt((W * H) / stars.length) * 0.9;
  const repulsion = ideal * ideal * 1.7;
  const marginX = Math.min(W * 0.08, 90);
  const marginTop = fontSize * 3;
  const marginBottom = fontSize * 3.5;

  // Start on a golden-angle spiral, biggest tag in the middle.
  const spread = Math.min(W, H) / 2 / Math.sqrt(stars.length);
  const pos = stars.map((_, i) => [
    cx + Math.cos(i * GOLDEN_ANGLE) * spread * Math.sqrt(i) * (W / H),
    cy + Math.sin(i * GOLDEN_ANGLE) * spread * Math.sqrt(i),
  ]);

  const gx = 0.005;
  const gy = 0.005 * (W / H);

  for (let it = 0; it < ITERATIONS; it++) {
    const force = stars.map(() => [0, 0]);

    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = pos[i][0] - pos[j][0];
        const dy = (pos[i][1] - pos[j][1]) * LABEL_SQUASH;
        const d = Math.hypot(dx, dy) || 0.01;
        const push = repulsion / (d * d);
        force[i][0] += (push * dx) / d;
        force[i][1] += (push * dy) / d;
        force[j][0] -= (push * dx) / d;
        force[j][1] -= (push * dy) / d;
      }
    }

    for (const { a, b, count: shared } of edges) {
      const i = index.get(a);
      const j = index.get(b);
      const dx = pos[i][0] - pos[j][0];
      const dy = pos[i][1] - pos[j][1];
      const d = Math.hypot(dx, dy) || 0.01;
      const pull = 0.02 * (1 + Math.log(shared)) * (d - ideal * 0.85);
      force[i][0] -= (pull * dx) / d;
      force[i][1] -= (pull * dy) / d;
      force[j][0] += (pull * dx) / d;
      force[j][1] += (pull * dy) / d;
    }

    const step = Math.min(1, 6 / (1 + it / 300));
    for (let i = 0; i < stars.length; i++) {
      force[i][0] += (cx - pos[i][0]) * gx;
      force[i][1] += (cy - pos[i][1]) * gy;
      pos[i][0] = clamp(pos[i][0] + force[i][0] * step, marginX, W - marginX);
      pos[i][1] = clamp(pos[i][1] + force[i][1] * step, marginTop, H - marginBottom);
    }
  }

  const nodes = stars.map((s, i) => {
    const r = starRadius(s.count, maxCount, scale);
    return {
      name: s.name,
      count: s.count,
      x: round(pos[i][0]),
      y: round(pos[i][1]),
      r: round(r),
      labelY: round(pos[i][1] + r + fontSize * 1.2),
    };
  });

  placeLabels(nodes, fontSize);
  return { nodes, edges };
}

// Labels go under their star unless that would overlap a bigger star's
// label; then they try above. Rough widths are fine for this.
function placeLabels(nodes, fontSize) {
  const placed = [];
  const box = (n, y) => {
    const half = (n.name.length * fontSize * 0.55) / 2 + 4;
    return { x1: n.x - half, x2: n.x + half, y1: y - fontSize, y2: y + 3 };
  };
  const hits = (b) =>
    placed.some((p) => b.x1 < p.x2 && p.x1 < b.x2 && b.y1 < p.y2 && p.y1 < b.y2);

  for (const n of nodes) {
    const below = box(n, n.labelY);
    if (!hits(below)) {
      placed.push(below);
      continue;
    }
    const aboveY = round(n.y - n.r - fontSize * 0.5);
    n.labelY = aboveY;
    placed.push(box(n, aboveY));
  }
}

// Tags that share bookmarks with `name`, strongest first.
export function partnersOf(name, links) {
  return links
    .filter((l) => l.a === name || l.b === name)
    .map((l) => ({ name: l.a === name ? l.b : l.a, count: l.count }));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v) {
  return Math.round(v * 10) / 10;
}
