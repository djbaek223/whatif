// Which country's life is being played, and in which language it is shown. The two are separate: the country
// (where the person grew up) sets the rules, events and news; the language is the player's display setting.
// A life keeps both from when it began. Engine entry points set them from the state they are given (inRegion),
// so a script that plays lives from both countries, or a server answering both, never mixes them.
export type Region = "kr" | "us";
export type Lang = "ko" | "en";

export const REGIONS: Region[] = ["kr", "us"];

let current: Region = "kr";
let currentLang: Lang = "ko";

export const region = (): Region => current;
export const isUS = () => current === "us";
export const lang = (): Lang => currentLang;
export const isEn = () => currentLang === "en";

/** The language a life is shown in when it doesn't say: lives saved before the setting existed. */
/** The country a new life starts in until the player says where they grew up. */
export const countryFor = (l: Lang): Region => (l === "en" ? "us" : "kr");
export const langFor = (r: Region | undefined): Lang => (r === "us" ? "en" : "ko");

/** Sets the region for everything that follows (the browser plays one life at a time). */
export function setRegion(r: Region | undefined) {
  current = r === "us" ? "us" : "kr";
}

/** Sets the display language for everything that follows. */
export function setLang(l: Lang | undefined) {
  currentLang = l === "en" ? "en" : "ko";
}

/** Runs fn in this region and language (by default the region's own), then puts the previous ones back. */
export function inRegion<T>(r: Region | undefined, fn: () => T, l?: Lang): T {
  const prev = current;
  const prevLang = currentLang;
  setRegion(r);
  setLang(l ?? langFor(r));
  try {
    return fn();
  } finally {
    current = prev;
    currentLang = prevLang;
  }
}

/** Picks the value for the current region. */
export const byRegion = <T,>(values: Record<Region, T>): T => values[current];
