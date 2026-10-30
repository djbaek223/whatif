// Texts in two directions, gettext style, for the display language (region.ts lang()):
// - L: written in Korean in the code (Korean rules and the shared screens). Korean is the key:
//   L("수능 성적표가 나왔다.") or L`월수입이 ${pay}가 되었다.` (placeholders {0}, {1} in the dictionary).
//   Shown as written in Korean, from src/locales/en for English. The shared texts there are told the American way
//   (Thanksgiving for 김장철); a Korean life in English takes en/korea.ts first, and an American life in Korean
//   takes ko/america.ts (the American way, in Korean) over the Korean original.
// - T: written in English (the American rules in src/regions/us). English is the key; shown as written in
//   English, from src/locales/ko for Korean.
// `npm run check:i18n` lists texts missing from either dictionary.
import { EN, EN_KR, EN_NAMES } from "../locales/en";
import { KO, KO_NAMES, KO_US } from "../locales/ko";
import { lang, region } from "./region";

const keyOf = (strings: readonly string[]) => strings.reduce((k, s, i) => (i ? `${k}{${i - 1}}${s}` : s), "");

const fill = (text: string, values: unknown[]) => text.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < values.length ? String(values[Number(i)]) : m));

const HANGUL = /[가-힣]/;

/**
 * A name or value kept in the life as written (a company, a job title, a school, a city) in the display language:
 * the rules match on the original, so only the screen and the story see the translation. Unknown names stay as they are.
 */
export function V(value: string): string;
export function V<T>(value: T): T | string;
export function V(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;
  // A name with a space around it ("{0}" as "회사 "), translated without the space.
  const pad = value.match(/^(\s*)([^]*?)(\s*)$/)!;
  if (pad[1] || pad[3]) return pad[2] ? pad[1] + V(pad[2]) + pad[3] : value;
  if (lang() === "en") {
    if (!HANGUL.test(value)) return value;
    const grad = value.match(/^(.+) 대학원$/);
    return EN_KR[value] ?? EN_NAMES[value] ?? EN[value] ?? (grad ? `graduate school at ${V(grad[1])}` : byWords(value, EN));
  }
  if (HANGUL.test(value)) return value;
  const grad = value.match(/^graduate school at (.+)$/);
  return KO_NAMES[value] ?? KO[value] ?? (grad ? `${V(grad[1])} 대학원` : value);
}

/** A name made of known words ("대전 주민센터 공무원"), word by word; as written when any word is unknown. */
function byWords(value: string, dict: Record<string, string>): string {
  const words = value.split(" ");
  if (words.length < 2) return value;
  const out = words.map((w) => (HANGUL.test(w) ? dict[w] : w));
  return out.every((w) => w !== undefined) ? out.join(" ") : value;
}

function translate(source: "ko" | "en", dict: Record<string, string>, text: string | TemplateStringsArray, values: unknown[]): string {
  const key = keyOf(typeof text === "string" ? [text] : text);
  if (lang() === source) {
    if (source === "en" || region() === "kr") return values.length ? fill(key, values) : key;
    // An American life in Korean: names filled in (Google, Software Engineer) are shown in Korean too.
    return fill(KO_US[key] ?? key, values.map(V));
  }
  const out = (source === "ko" && region() === "kr" ? EN_KR[key] : undefined) ?? dict[key];
  // Values filled in come from the other language too ("{0}에 입사했다" with 삼성전자), so they are translated as names.
  const shown = values.map(V);
  if (out === undefined) {
    if (process.env.NODE_ENV !== "production") missing.add(key);
    return fill(key, shown);
  }
  return fill(out, shown);
}

/** A text written in Korean, in the display language. */
export const L = (text: string | TemplateStringsArray, ...values: unknown[]): string => translate("ko", EN, text, values);

/** A text written in English, in the display language. */
export const T = (text: string | TemplateStringsArray, ...values: unknown[]): string => translate("en", KO, text, values);

/** Keys asked for with no entry yet (development only), for scripts and tests. */
export const missing = new Set<string>();
