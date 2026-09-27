import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTagSky } from "../hooks/useTagSky";
import { layoutStars } from "../lib/starMap";
import StarMap from "./StarMap";
import styles from "./TagConstellation.module.scss";

const BAND = { width: 1152, height: 220, count: 10, fontSize: 14, scale: 1 };

// The home page's strip of sky: the ten biggest tags, each a link to its
// page. Stays out of the way (renders nothing) until there's something to
// draw, and if tags fail to load.
export default function TagConstellation() {
  const { tags, links } = useTagSky();
  const { nodes, edges } = useMemo(
    () => (tags ? layoutStars(tags, links, BAND) : { nodes: [], edges: [] }),
    [tags, links],
  );

  if (nodes.length < 2) return null;

  return (
    // A <p>, not a heading: this sits above the page's h1.
    <section className={styles.band} aria-label="Your brightest tags">
      <p className={styles.heading}>
        <Link to="/tags">Constellations · your brightest tags</Link>
      </p>
      <StarMap
        nodes={nodes}
        edges={edges}
        width={BAND.width}
        height={BAND.height}
        fontSize={BAND.fontSize}
      />
    </section>
  );
}
