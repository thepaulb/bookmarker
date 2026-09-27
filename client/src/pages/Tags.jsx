import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTagSky } from "../hooks/useTagSky";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { layoutStars, partnersOf } from "../lib/starMap";
import { tagPath } from "../lib/format";
import StarMap from "../components/StarMap";
import styles from "./Tags.module.scss";

// Wide screens get a landscape sky; phones a taller one with fewer,
// larger stars so the labels stay readable.
const WIDE_SKY = { width: 1152, height: 600, count: 36, fontSize: 13, scale: 1 };
const NARROW_SKY = { width: 480, height: 720, count: 24, fontSize: 20, scale: 1.4 };
const FAINT_SHOWN = 24;
const STRONGEST_SHOWN = 9;

export default function Tags() {
  const { tags, links, error } = useTagSky();
  const narrow = useMediaQuery("(max-width: 40rem)");
  const [view, setView] = useState("sky");
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState("");

  const sky = narrow ? NARROW_SKY : WIDE_SKY;
  const { nodes, edges } = useMemo(
    () => (tags ? layoutStars(tags, links, sky) : { nodes: [], edges: [] }),
    [tags, links, sky],
  );

  const q = query.trim().toLowerCase();
  const matches = (name) => name.includes(q);
  const count = new Map((tags ?? []).map((t) => [t.name, t.count]));
  const selected = picked ?? nodes[0]?.name ?? null;

  if (error) {
    return (
      <>
        <h1>Tags</h1>
        <p role="alert" className="error">
          {error}
        </p>
      </>
    );
  }
  if (!tags) {
    return (
      <>
        <h1>Tags</h1>
        <p className="muted">Loading…</p>
      </>
    );
  }
  if (tags.length === 0) {
    return (
      <>
        <h1>Tags</h1>
        <p className="muted">No tags yet.</p>
      </>
    );
  }

  const drawn = new Set(nodes.map((n) => n.name));
  const listed = view === "az" ? tags : tags.filter((t) => !drawn.has(t.name));
  const filtered = q ? listed.filter((t) => matches(t.name)) : listed;

  return (
    <>
      <h1>Tags</h1>
      <p className="page-intro">
        {tags.length} tags. Your {nodes.length} brightest are drawn below; a
        line joins two tags saved on the same bookmark.
      </p>

      <div className={styles.controls}>
        <div className={styles.toggle} role="group" aria-label="View">
          <button
            type="button"
            aria-pressed={view === "sky"}
            onClick={() => setView("sky")}
          >
            Sky
          </button>
          <button
            type="button"
            aria-pressed={view === "az"}
            onClick={() => setView("az")}
          >
            A–Z list
          </button>
        </div>
        <label htmlFor="find-tag" className="visually-hidden">
          Find a tag
        </label>
        <input
          id="find-tag"
          type="search"
          className={styles.find}
          placeholder="Find a tag"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {view === "sky" ? (
        <>
          <section className={styles.frame} aria-label="Tag sky">
            <StarMap
              nodes={nodes}
              edges={edges}
              width={sky.width}
              height={sky.height}
              fontSize={sky.fontSize}
              selected={selected}
              onSelect={setPicked}
              isDimmed={q ? (name) => !matches(name) : undefined}
            />
            <Legend />
          </section>

          <div className={styles.panels}>
            {selected && (
              <SelectedStar
                name={selected}
                count={count.get(selected) ?? 0}
                partners={partnersOf(selected, links)}
                onPick={setPicked}
              />
            )}
            <StrongestLinks links={links.slice(0, STRONGEST_SHOWN)} />
            <section className={styles.panel}>
              <h2 className={styles.eyebrow}>Fainter stars · A–Z</h2>
              <TagList tags={filtered.slice(0, FAINT_SHOWN)} compact />
              {filtered.length === 0 && (
                <p className="muted">No other tags match.</p>
              )}
              <button
                type="button"
                className={styles.more}
                onClick={() => setView("az")}
              >
                Show all {tags.length} tags →
              </button>
            </section>
          </div>
        </>
      ) : (
        <>
          <TagList tags={filtered} />
          {filtered.length === 0 && (
            <p className={styles.none}>No tags match “{query.trim()}”.</p>
          )}
        </>
      )}
    </>
  );
}

function SelectedStar({ name, count, partners, onPick }) {
  return (
    <section className={styles.panel} aria-live="polite">
      <p className={styles.eyebrow}>Selected star</p>
      <div className={styles.selectedHead}>
        <h2 className={styles.selectedName}>{name}</h2>
        <span className={styles.selectedCount}>
          {count} bookmark{count === 1 ? "" : "s"}
        </span>
      </div>
      <p className={styles.note}>
        {partners.length
          ? "Often saved alongside"
          : "A lone star: never saved with another tag"}
      </p>
      {partners.length > 0 && (
        <ul className={styles.partners}>
          {partners.slice(0, 8).map((p) => (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => onPick(p.name)}
                aria-label={`${p.name}, ${p.count} shared`}
              >
                {p.name} <span>{p.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to={tagPath(name)} className={`button ${styles.view}`}>
        View {count} bookmark{count === 1 ? "" : "s"}
      </Link>
    </section>
  );
}

function StrongestLinks({ links }) {
  const max = links[0]?.count ?? 1;
  return (
    <section className={styles.panel}>
      <h2 className={styles.eyebrow}>Strongest links</h2>
      {links.length === 0 ? (
        <p className="muted">
          No two tags share a bookmark yet. Add more than one tag to a bookmark
          and lines will appear.
        </p>
      ) : (
        <ol className={styles.strongest}>
          {links.map((l) => (
            <li key={`${l.a}|${l.b}`}>
              <span className={styles.pair}>
                {l.a} <span aria-hidden="true">—</span>
                <span className="visually-hidden"> and </span> {l.b}
              </span>
              <span className={styles.bar} aria-hidden="true">
                <span style={{ width: `${(l.count / max) * 100}%` }} />
              </span>
              <span className={styles.shared}>{l.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TagList({ tags, compact = false }) {
  return (
    <ul className={compact ? styles.faint : "tag-cloud"}>
      {tags.map(({ name, count }) => (
        <li key={name}>
          <Link to={tagPath(name)} className={compact ? undefined : "tag"}>
            {name} <span className="count">({count})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <div className={styles.legend} aria-hidden="true">
      <span>
        <svg viewBox="0 0 30 16">
          <circle cx="4" cy="8" r="3" className={styles.legendStar} />
          <circle cx="20" cy="8" r="7" className={styles.legendStar} />
        </svg>
        Bookmarks
      </span>
      <span>
        <svg viewBox="0 0 28 12">
          <path d="M2 3h24" className={styles.legendLine} strokeWidth="1" />
          <path d="M2 9h24" className={styles.legendLine} strokeWidth="4" />
        </svg>
        Shared
      </span>
      <span>
        <svg viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" className={styles.legendBright} />
        </svg>
        100+
      </span>
    </div>
  );
}
