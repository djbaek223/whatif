import type { Lang } from "./region";

/** The language picked in the top-right menu, also kept as a cookie so the server can draw the first screen in it. */
export const LANG_COOKIE = "whatif.lang";

/** The browser's most preferred language: Korean stays Korean, every other language gets English. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  const first = (header ?? "")
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
      return { tag: tag.trim(), q: q === undefined ? 1 : Number(q), i };
    })
    .filter((x) => x.tag && x.tag !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)[0]?.tag;
  return first ? fromTag(first) : "ko";
}

export function fromTag(tag: string): Lang {
  return /^ko\b/i.test(tag) ? "ko" : "en";
}
