// Money formatting shared by the engine and event texts. Amounts are in the engine's unit: 만원 in a Korean life,
// and ten dollars in an American one (1 unit = $10), so the same numbers read as 500만원 or $5,000.
import { isUS } from "./region";

/** Engine units to whole dollars, for an American life. */
export const dollars = (units: number) => Math.round(units * 10);

export function formatWealth(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const v = Math.abs(manwon);
  if (isUS()) {
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
