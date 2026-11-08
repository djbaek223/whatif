// Money the player puts into something in their own words buys that thing, at its price that month:
// "비트코인에 투자한다" in January 2013 holds Bitcoin (not a failed business venture), and selling it later pays
// what Bitcoin was worth then. A loss is never more than the stake. A path about Bitcoin the player wrote about stays in 2013.
// Run: npx tsx scripts/check-invest.ts
import { eventById } from "../src/lib/events";
import { advanceTurn, createLife, lifeFacts, pendingFor, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { amountIn, investIn, worth } from "../src/lib/invest";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const profile: Profile = {
  name: "테스트", birthDate: "1980-03-02", gender: "남", hometown: "서울", elementary: "", middle: "", high: "", university: "", major: "",
  family: "", mbti: "", personality: "", currentLife: "회사원",
};
const tp: TurningPoint = { date: "2013-01", situation: "모아 둔 1000만원을 비트코인에 넣을지 저축할지 고민했다.", actualChoice: "저축했다", regret: "", kind: "돈" };
const failures: string[] = [];
const fail = (m: string) => failures.push(m);
const outcome = (s: LifeState) => s.log.filter((l) => l.kind === "outcome").at(-1)?.text ?? "";

// 1. Reading the words.
for (const [text, want] of [
  ["비트코인에 투자한다", "비트코인"],
  ["1000만원으로 비트코인을 산다", "비트코인"],
  ["삼성전자 주식을 산다", "삼성전자 주식"],
  ["테슬라에 투자한다", "테슬라 주식"],
  ["Invest in Nvidia", "엔비디아 주식"],
  ["국내 주식형 펀드에 나눠 넣는다", "펀드"],
  ["Put my savings into Bitcoin", "비트코인"],
  ["buy an index fund", "펀드"],
  ["비트코인은 안 한다", null],
  ["주식 공부를 한다", null],
  ["적금을 든다", null],
  ["카페를 차린다", null],
] as const) {
  const got = investIn(text)?.name ?? null;
  if (got !== want) fail(`investIn("${text}") → ${got}, want ${want}`);
}
if (amountIn("1000만원을 넣는다") !== 1000) fail(`amountIn 1000만원 → ${amountIn("1000만원을 넣는다")}`);
if (amountIn("3억 원") !== 30000) fail(`amountIn 3억 → ${amountIn("3억 원")}`);

/** The life at its turning point, 2013-01, with 1,000만원 saved and the opening's paths. */
function atTurningPoint(paths?: { label: string; preset: "original" | "risk" | "money" }[], lang?: "en"): LifeState {
  const opening = fallbackOpening(profile, tp);
  opening.initial = { ...opening.initial, wealth: 1000, employed: true, monthlyIncome: 300 };
  if (paths) opening.choices = paths.map((p) => ({ label: p.label, preset: p.preset === "money" ? "risk" : p.preset, original: p.preset === "original" })) as typeof opening.choices;
  return createLife(profile, tp, opening, { ai: false, ...(lang ? { lang } : {}) });
}

// 2. The Bitcoin path the narrator wrote for 2013 is kept, since the player wrote about Bitcoin themselves.
{
  const life = atTurningPoint([
    { label: "1000만원을 저축한다", preset: "original" },
    { label: "1000만원을 비트코인에 넣는다", preset: "risk" },
    { label: "국내 주식형 펀드에 나눠 넣는다", preset: "risk" },
  ]);
  const labels = life.pending!.options.map((o) => o.label);
  console.log("paths:", labels.join(" / "));
  if (!labels.some((l) => /비트코인/.test(l))) fail(`Bitcoin path dropped in 2013: ${labels.join(" / ")}`);
}

// 3. Typing it in at the turning point: a Bitcoin holding of the 1,000만원, no business, no debt.
for (const nearest of ["0", "2"]) {
  const life = atTurningPoint([
    { label: "1000만원을 저축한다", preset: "original" },
    { label: "새로운 일에 도전한다", preset: "risk" },
    { label: "국내 주식형 펀드에 나눠 넣는다", preset: "risk" },
  ]);
  const after = resolveChoice(life, nearest, "비트코인에 투자한다", { change: "none" });
  const h = after.flags.holding;
  console.log(`typed (nearest ${nearest}) → ${outcome(after)} · 자산 ${after.wealth}`);
  if (!h || h.name !== "비트코인" || h.cost !== 1000) fail(`holding ${JSON.stringify(h)}`);
  if (/모험|사업|창업/.test(outcome(after))) fail(`outcome reads as a venture: ${outcome(after)}`);
  if (after.wealth < 0 || after.wealth !== life.wealth) fail(`wealth ${life.wealth} → ${after.wealth}`);
  if (after.flags.selfEmployed || after.flags.job !== life.flags.job) fail(`job changed: ${after.flags.job}`);
  if (!/비트코인/.test(lifeFacts(after))) fail("facts don't mention the holding");
  if (!(after.memory ?? []).some((m) => /비트코인/.test(m))) fail("memory doesn't keep the investment");

  // 4. The fork that follows: 18 months on, selling pays Bitcoin's 2014 price (it went up, a lot), never below zero.
  const later: LifeState = { ...after, mi: after.mi + 18 };
  const ev = eventById("invest-check")!;
  if (!ev.when!(later, 34)) fail("invest-check doesn't come up after 18 months");
  const pending = pendingFor(ev, later);
  console.log(`  ${pending.scene}`);
  const sold = resolveChoice({ ...later, pending }, "sell");
  const value = worth(h!, later.mi);
  console.log(`  sell → ${outcome(sold)} · 자산 ${sold.wealth}`);
  if (sold.flags.holding) fail("still holding after selling");
  if (sold.wealth !== after.wealth - 1000 + value) fail(`sale wealth ${sold.wealth}, want ${after.wealth - 1000 + value}`);
  if (sold.wealth < 0) fail(`wealth below zero after selling: ${sold.wealth}`);
}

// 4a. While held, 자산 counts the holding at each month's price, so selling only turns it into cash.
{
  const life = atTurningPoint();
  let s = resolveChoice(life, "1", "비트코인에 투자한다", { change: "none" });
  for (let i = 0; i < 40 && s.mi < life.mi + 18 && !s.dead; i++) {
    s = advanceTurn({ ...s, pending: null }).state;
    const h = s.flags.holding;
    if (!h) break;
    if (h.mark !== worth(h, s.mi)) fail(`holding counted at ${h.mark}, worth ${worth(h, s.mi)} in month ${s.mi}`);
  }
  const h = s.flags.holding;
  if (!h || (h.mark ?? 0) < 5000) fail(`2014 Bitcoin not counted at its price in 자산: ${JSON.stringify(h)}`);
  console.log(`held 1y+ → 자산 ${s.wealth} (비트코인 평가액 ${h?.mark})`);
  const ev = eventById("invest-check")!;
  const sold = resolveChoice({ ...s, pending: pendingFor(ev, s) }, "sell");
  if (sold.wealth !== s.wealth) fail(`selling changed 자산 ${s.wealth} → ${sold.wealth}; it was already counted`);
}

// 4c. The 2021 home-price boom raises the home's price, and 자산 by that much, not every won the life has.
{
  const life = atTurningPoint();
  const s0: LifeState = { ...life, pending: null, mi: 2021 * 12 + 4, wealth: 10000, flags: { ...life.flags, homeOwner: true, homeArea: "서울", homeValue: 50000, mortgage: 20000 } };
  const s1 = advanceTurn(s0).state;
  if (s1.log.some((l) => /집값과 코인/.test(l.text))) {
    if (s1.flags.homeValue !== 57500) fail(`home after the 2021 boom ${s1.flags.homeValue}, want 57500`);
    console.log(`2021 boom → 집 시세 ${s1.flags.homeValue}, 자산 ${s0.wealth} → ${s1.wealth}`);
  } else fail("2021 boom news didn't show");
}

// 4b. The narrator reading it as a business doesn't open one.
{
  const life = atTurningPoint();
  const after = resolveChoice(life, "1", "비트코인에 투자한다", { change: "startBusiness", title: "투자자" });
  if (after.flags.holding?.name !== "비트코인" || after.flags.selfEmployed) fail(`classify startBusiness → ${outcome(after)}`);
}

// 5. Over many lives and years a loss stays inside the stake, and 2013 Bitcoin held to 2017 is far up on most lives.
{
  let up = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const h = { asset: "crypto" as const, name: "비트코인", cost: 1000, units: 0, since: 2013 * 12, seed };
    const priced = { ...h, units: 1000 / Math.exp(Math.log(14)) };
    const v = worth(priced, 2017 * 12 + 11);
    if (v < 0) fail(`negative worth ${v}`);
    if (v > 5000) up++;
    for (const asset of ["stock", "fund", "altcoin"] as const) {
      const w = worth({ ...priced, asset }, 2060 * 12);
      if (w < 0 || !Number.isFinite(w)) fail(`${asset} worth ${w}`);
    }
  }
  if (up < 150) fail(`2013→2017 Bitcoin up 5x in only ${up}/200 lives`);
}

// 6. A generic gamble costs a share of what one has, not a fixed 2,500만원.
{
  const life = atTurningPoint([
    { label: "1000만원을 저축한다", preset: "original" },
    { label: "새로운 일에 도전한다", preset: "risk" },
    { label: "남들과 다른 길을 간다", preset: "risk" },
  ]);
  let worst = 0;
  for (let i = 0; i < 40; i++) {
    const after = resolveChoice({ ...life, rng: i + 1 }, "1");
    worst = Math.min(worst, after.wealth - life.wealth);
  }
  if (worst < -1000 * 1.6) fail(`a gamble with 1,000만원 lost ${-worst}`);
}

// 6b. A company with its own prices: Samsung bought in January 2013 and sold in January 2021 follows Samsung (about ×2.9),
// Tesla bought in mid-2019 and sold at the end of 2021 follows Tesla (×25+), and a company not listed yet is the market's shares.
{
  const cases: [string, number, number, number, number][] = [
    ["삼성전자 주식을 1000만원어치 산다", 2013 * 12, 2021 * 12, 2.5, 3.3],
    ["테슬라 주식에 투자한다", 2019 * 12 + 5, 2021 * 12 + 10, 20, 30],
  ];
  for (const [text, from, to, lo, hi] of cases) {
    const life = { ...atTurningPoint(), mi: from };
    const after = resolveChoice(life, "0", text);
    const h = after.flags.holding;
    const r = h ? worth(h, to) / h.cost : 0;
    console.log(`"${text}" → ${h?.name} ×${r.toFixed(2)}`);
    if (!h?.ticker || r < lo || r > hi) fail(`"${text}": ${h?.name} ×${r.toFixed(2)}, want ${lo}-${hi}`);
  }
  const early = resolveChoice({ ...atTurningPoint(), mi: 1999 * 12 }, "0", "현대차 주식에 투자한다").flags.holding;
  if (early?.ticker || early?.name !== "주식") fail(`현대차 in 1999 → ${JSON.stringify(early)}`);
  if (investIn("애플 노트북을 산다")) fail("애플 노트북을 산다 read as Apple shares");
}

// 7. English.
{
  const life = atTurningPoint(undefined, "en");
  const after = resolveChoice(life, "0", "Put my savings into Bitcoin");
  console.log(`en → ${outcome(after)}`);
  if (!/Bitcoin/.test(outcome(after)) || /[가-힣]/.test(outcome(after))) fail(`English outcome: ${outcome(after)}`);
  const later: LifeState = { ...after, mi: after.mi + 30 };
  const pending = pendingFor(eventById("invest-check")!, later);
  const sold = resolveChoice({ ...later, pending }, "sell");
  console.log(`  ${pending.scene}\n  → ${outcome(sold)}`);
  if (/[가-힣]/.test(outcome(sold))) fail(`English sale: ${outcome(sold)}`);
  if (!/Holds Bitcoin/.test(lifeFacts(after))) fail(`English facts: ${lifeFacts(after)}`);
}

console.log(failures.length ? `\nFAIL\n- ${failures.join("\n- ")}` : "\nPASS");
if (failures.length) process.exit(1);
