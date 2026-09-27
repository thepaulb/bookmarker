import { useEffect, useState } from "react";
import { getTagLinks, getTags } from "../api/tags";

// Loads what the tag star map needs: every tag with its count, and the
// pairs of tags that share bookmarks. If only the pairs fail, the sky
// still draws, just without lines.
export function useTagSky() {
  const [state, setState] = useState({ tags: null, links: [], error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTags(), getTagLinks().catch(() => [])])
      .then(([tags, links]) => {
        if (cancelled) return;
        setState({
          tags: Array.isArray(tags) ? tags : [],
          links: Array.isArray(links) ? links : [],
          error: null,
        });
      })
      .catch((err) => {
        if (!cancelled) setState({ tags: null, links: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
