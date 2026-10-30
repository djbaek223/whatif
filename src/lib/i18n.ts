// Texts written in Korean in the code, shown in English for an American life. Korean is the key, gettext style:
// L("수능 성적표가 나왔다.") or L`월수입이 ${pay}가 되었다.` (placeholders {0}, {1} in the dictionary).
// A Korean life gets the text exactly as written. `npm run check:i18n` lists texts missing from the dictionary.
import { EN } from "../locales/en";
import { region } from "./region";

const keyOf = (strings: readonly string[]) => strings.reduce((k, s, i) => (i ? `${k}{${i - 1}}${s}` : s), "");

const fill = (text: string, values: unknown[]) => text.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < values.length ? String(values[Number(i)]) : m));

/** The text for the current region: as written for Korea, from the English dictionary for the US. */
export function L(text: string | TemplateStringsArray, ...values: unknown[]): string {
  const strings = typeof text === "string" ? [text] : text;
  const key = keyOf(strings);
  if (region() !== "us") return values.length ? fill(key, values) : key;
  const en = EN[key];
  if (en === undefined) {
    if (process.env.NODE_ENV !== "production") missing.add(key);
    return fill(key, values);
  }
  return fill(en, values);
}

/** Keys asked for in English with no entry yet (development only), for scripts and tests. */
export const missing = new Set<string>();
