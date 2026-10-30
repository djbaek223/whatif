// Which country's life is being played. A life keeps the region it started in; the engine, the texts (i18n.ts)
// and the narrator read it from here. Engine entry points set it from the state they are given (inRegion), so a
// script that plays lives from both countries, or a server answering both, never mixes them.
export type Region = "kr" | "us";

export const REGIONS: Region[] = ["kr", "us"];

let current: Region = "kr";

export const region = (): Region => current;
export const isUS = () => current === "us";

/** Sets the region for everything that follows (the browser plays one life at a time). */
export function setRegion(r: Region | undefined) {
  current = r === "us" ? "us" : "kr";
}

/** Runs fn with this region, then puts the previous one back. Lives saved before regions existed are Korean. */
export function inRegion<T>(r: Region | undefined, fn: () => T): T {
  const prev = current;
  setRegion(r);
  try {
    return fn();
  } finally {
    current = prev;
  }
}

/** Picks the value for the current region. */
export const byRegion = <T,>(values: Record<Region, T>): T => values[current];
