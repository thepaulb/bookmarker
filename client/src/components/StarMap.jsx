import { useMemo } from "react";
import { Link } from "react-router-dom";
import { tagPath } from "../lib/format";
import styles from "./StarMap.module.scss";

// Draws a laid-out star map (see lib/starMap.js) as SVG, with a real
// control over each star so it works from the keyboard: a button when
// onSelect is given (the Tags page), otherwise a link to the tag's page.
//
// selected: the highlighted tag's name; its lines and neighbours light up.
// isDimmed(name): optional, fades stars that don't match a filter.
export default function StarMap({
  nodes,
  edges,
  width,
  height,
  fontSize = 13,
  selected = null,
  onSelect,
  isDimmed,
}) {
  const dust = useMemo(() => makeDust(width, height), [width, height]);

  const neighbours = new Set();
  for (const e of edges) {
    if (e.a === selected) neighbours.add(e.b);
    if (e.b === selected) neighbours.add(e.a);
  }
  const at = new Map(nodes.map((n) => [n.name, n]));

  function starState(name) {
    if (isDimmed?.(name)) return "dim";
    if (name === selected) return "selected";
    if (!selected || neighbours.has(name)) return "lit";
    return "far";
  }

  return (
    <div className={styles.sky} style={{ aspectRatio: `${width} / ${height}` }}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <g className={styles.dust}>
          {dust.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>

        {edges.map((e) => {
          const on = selected && (e.a === selected || e.b === selected);
          const from = at.get(e.a);
          const to = at.get(e.b);
          return (
            <line
              key={`${e.a}|${e.b}`}
              className={on ? styles.lineOn : styles.line}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={1 + Math.min(e.count - 1, 10) * 0.55}
            />
          );
        })}

        {nodes.map((n) => (
          <g key={n.name} className={styles[starState(n.name)]}>
            <circle className={styles.halo} cx={n.x} cy={n.y} r={n.r * 2.6} />
            <circle
              className={n.count > 100 || n.name === selected ? styles.bright : styles.star}
              cx={n.x}
              cy={n.y}
              r={n.r}
            />
            <text
              className={styles.label}
              x={n.x}
              y={n.labelY}
              fontSize={n.name === selected ? fontSize * 1.15 : fontSize}
            >
              {n.name}
            </text>
          </g>
        ))}
      </svg>

      {nodes.map((n) => {
        const place = {
          left: `${(n.x / width) * 100}%`,
          top: `${(n.y / height) * 100}%`,
        };
        const label = `${n.name}, ${n.count} bookmark${n.count === 1 ? "" : "s"}`;
        return onSelect ? (
          <button
            key={n.name}
            type="button"
            className={styles.hit}
            style={place}
            aria-label={label}
            aria-pressed={n.name === selected}
            onClick={() => onSelect(n.name)}
          />
        ) : (
          <Link
            key={n.name}
            to={tagPath(n.name)}
            className={styles.hit}
            style={place}
            aria-label={label}
          />
        );
      })}
    </div>
  );
}

// A sprinkle of faint background stars, the same every time for a size.
function makeDust(width, height) {
  let seed = 73;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const count = Math.round((width * height) / 40000);
  return Array.from({ length: count }, () => [
    Math.round(next() * width),
    Math.round(next() * height),
    Math.round((0.6 + next() * 0.8) * 10) / 10,
  ]);
}
