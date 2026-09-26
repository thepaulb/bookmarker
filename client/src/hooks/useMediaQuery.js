import { useEffect, useState } from "react";

// True while the CSS media query matches. False where matchMedia is
// missing (e.g. jsdom in tests).
export function useMediaQuery(query) {
  const get = () => window.matchMedia?.(query).matches ?? false;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
