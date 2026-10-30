// Money and date formatting shared by the engine and event texts, in the display language. Amounts are in the
// engine's unit, read as 만원 in Korean and as ten dollars in English (1 unit = $10): 500만원 or $5,000, whichever
// country the life is in, so the shared event texts and the totals always agree.
import { isEn } from "./region";

/** Engine units to whole dollars, for English. */
export const dollars = (units: number) => Math.round(units * 10);

export function formatWealth(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const v = Math.abs(manwon);
  if (isEn()) {
    const d = dollars(v);
    if (d >= 1_000_000) return `${sign}$${(d / 1_000_000).toFixed(d >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
    return `${sign}$${d.toLocaleString("en-US")}`;
  }
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = Math.round(v % 10000);
    return `${sign}${eok}억${rest ? ` ${rest.toLocaleString()}만` : ""}원`;
  }
  return `${sign}${v.toLocaleString()}만원`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** An age on screen: "34세" (or "34살") in Korean, "age 34" in English. */
export const ageText = (age: number | string, unit: "세" | "살" = "세") => (isEn() ? `age ${age}` : `${age}${unit}`);

/** A YYYY-MM month on screen: "2019년 3월" or "Mar 2019". */
export function ymText(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y) return ym;
  if (!m) return String(y);
  return isEn() ? `${MONTHS[m - 1]} ${y}` : `${y}년 ${m}월`;
}

/** A YYYY-MM-DD date on screen: "1990년 3월 5일" or "Mar 5, 1990". */
export function ymdText(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return isEn() ? `${MONTHS[m - 1]} ${d}, ${y}` : `${y}년 ${m}월 ${d}일`;
}

/** A month on its own: "3월" or "Mar". */
export const monthName = (m: number) => (isEn() ? MONTHS[m - 1] : `${m}월`);

/** A label as shown on its own: English starts with a capital ("college" → "College"); Korean is unchanged. */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
