// Money formatting shared by the engine and event texts. Amounts are in 만원.
export function formatWealth(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const v = Math.abs(manwon);
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = Math.round(v % 10000);
    return `${sign}${eok}억${rest ? ` ${rest.toLocaleString()}만` : ""}원`;
  }
  return `${sign}${v.toLocaleString()}만원`;
}
