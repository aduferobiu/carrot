"use client";

import { useCallback, useEffect, useState } from "react";

/** Measures an element's actual rendered height via ResizeObserver. Needed
 * because percentage CSS heights don't reliably resolve through a `flex: 1`
 * (flex-basis: 0) ancestor — the browser can't resolve "55% of my parent"
 * while that parent's own height is itself still being solved for via
 * flex-grow, so it falls back to sizing from content instead of stretching.
 * Reading the real pixel height in JS and setting bar heights as explicit
 * pixels sidesteps that circularity entirely.
 *
 * Uses a callback ref (not useRef + empty-deps effect) because the measured
 * element can mount well after the component itself — e.g. behind a tab
 * that isn't selected on first render. A plain ref's effect only runs once,
 * before that element exists, and never reattaches the observer once it
 * finally appears; tying the effect to the ref's own state fixes that. */
export function useElementHeight<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [height, setHeight] = useState(0);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });
    observer.observe(el);
    setHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [el]);

  return [ref, height] as const;
}
