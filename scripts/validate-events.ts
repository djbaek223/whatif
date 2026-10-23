// Plays 300 lives to the end with the rules engine only (template narration, auto-picked choices)
// and checks that events stay varied. Exits with 1 when a check fails.
// Run: npm run validate:events [-- <lives>]
import { EVENTS, ageAt } from "../src/lib/events";
import { advanceUntilStop, autoPick, createLife, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { eventCategory } from "../src/lib/personal";
import { Rng } from "../src/lib/rng";
import { CATEGORY_LABELS, type Category, type Gender, type LifeState, type Profile, type TurningPoint } from "../src/lib/types";

const MIN_DISTINCT = 25;
const MIN_YEARS = 30; // the distinct-events check counts lives played at least this long after the turning point
const MAX_REPEATS = 3;
const LIFESPAN: [number, number] = [70, 85];

const MBTI = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ", ""];
const PERSONALITY = ["외향적이고 도전을 좋아한다.", "신중하고 계획적이다.", "조용하고 혼자 있는 걸 좋아한다.", "다정하고 공감을 잘한다.", "즉흥적이고 자유로운 편이다.", "성실하고 책임감이 강하다.", ""];
const TOWNS = ["서울", "부산", "대구", "인천", "광주", "대전", "수원", "전주"];
const UNIS = ["서울대학교", "부산대학교", "충남대학교", "경희대학교", "전남대학교", ""];
const MAJORS = ["경영학", "컴퓨터공학", "국어국문학", "기계공학", "간호학", "경제학", ""];
const SITUATIONS = ["수능을 망쳤다.", "첫 직장을 고민했다.", "결혼을 앞두고 망설였다.", "이직 제안을 받았다.", "창업을 고민했다."];

function randomPerson(rng: Rng): { profile: Profile; tp: TurningPoint } {
  const birthYear = 1960 + Math.floor(rng.next() * 46); // 1960-2005
  const birthDate = `${birthYear}-${String(1 + Math.floor(rng.next() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng.next() * 28)).padStart(2, "0")}`;
  const profile: Profile = {
    name: "테스트",
    birthDate,
    gender: rng.pick<Gender>(["남", "여"]),
    hometown: rng.pick(TOWNS),
    elementary: "",
    middle: "",
    high: "",
    university: rng.pick(UNIS),
    major: rng.pick(MAJORS),
    family: "",
    mbti: rng.pick(MBTI),
    personality: rng.pick(PERSONALITY),
    currentLife: "",
  };
  const tpAge = 12 + Math.floor(rng.next() * 24); // 12-35, so school years get played too
  const tp: TurningPoint = { date: `${birthYear + tpAge}-${String(1 + Math.floor(rng.next() * 12)).padStart(2, "0")}`, situation: rng.pick(SITUATIONS), actualChoice: "원래 하던 대로 했다", regret: "" };
  return { profile, tp };
}

function playLife(profile: Profile, tp: TurningPoint): LifeState {
  let life = createLife(profile, tp, fallbackOpening(profile, tp));
  for (let guard = 0; guard < 3000 && !life.dead; guard++) {
    if (life.pending) {
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
      continue;
    }
    life = advanceUntilStop(life).state;
  }
  return life;
}

const n = Number(process.argv[2] ?? 300);
const rng = new Rng(20261023);
const lives = Array.from({ length: n }, () => {
  const { profile, tp } = randomPerson(rng);
  return { life: playLife(profile, tp), tpAge: ageAt(profile.birthDate, Number(tp.date.slice(0, 4)) * 12 + Number(tp.date.slice(5)) - 1) };
});

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const byId = new Map(EVENTS.map((e) => [e.id, e]));
const repeatable = new Set(EVENTS.filter((e) => e.repeatable).map((e) => e.id));

// ── The pool ───────────────────────────────────────────
const BANDS: [string, number, number][] = [
  ["10대", 10, 19],
  ["20대", 20, 29],
  ["30대", 30, 39],
  ["40대", 40, 49],
  ["50대", 50, 59],
  ["60+", 60, 120],
];
const cats = Object.keys(CATEGORY_LABELS) as Category[];
console.log(`event pool: ${EVENTS.length} (choice ${EVENTS.filter((e) => e.choices).length}, small dilemmas ${EVENTS.filter((e) => e.small).length}, rare ${EVENTS.filter((e) => e.rare).length}, year-specific ${EVENTS.filter((e) => eventCategory(e) === "era").length})`);
console.log(`\npool by age band × category (events that can happen in that band)`);
console.log(`${"".padEnd(6)}${cats.map((c) => CATEGORY_LABELS[c].padStart(5)).join("")}  total`);
for (const [label, lo, hi] of BANDS) {
  const inBand = EVENTS.filter((e) => e.minAge <= hi && e.maxAge >= lo);
  console.log(`${label.padEnd(6)}${cats.map((c) => String(inBand.filter((e) => eventCategory(e) === c).length).padStart(5)).join("")}  ${String(inBand.length).padStart(5)}`);
}

// ── What happened ──────────────────────────────────────
const distinct = lives.map(({ life }) => Object.keys(life.counts ?? {}).length);
const played = lives.map(({ life, tpAge }) => (life.deathAge ?? 0) - tpAge);
const fullDistinct = distinct.filter((_, i) => played[i] >= MIN_YEARS);
const short = lives.filter((_, i) => played[i] < MIN_YEARS);
const worst = lives.map(({ life }) => {
  const [id, times] = Object.entries(life.counts ?? {})
    .filter(([id]) => !repeatable.has(id))
    .sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  return { id, times };
});
const ages = lives.map(({ life }) => life.deathAge ?? 0);
const happened = new Map<string, number>();
const catTotals = Object.fromEntries(cats.map((c) => [c, 0])) as Record<Category, number>;
for (const { life } of lives)
  for (const [id, times] of Object.entries(life.counts ?? {})) {
    happened.set(id, (happened.get(id) ?? 0) + 1);
    const ev = byId.get(id);
    if (ev) catTotals[eventCategory(ev)] += times;
  }
const rareLives = lives.filter(({ life }) => (life.rares?.length ?? 0) > 0).length;
const smallGaps = lives.flatMap(({ life }) => {
  const small = life.choices.filter((c) => EVENTS.some((e) => e.small && e.title === c.title)).map((c) => c.mi);
  return small.slice(1).map((mi, i) => (mi - small[i]) / 12);
});
const smallPerLife = avg(lives.map(({ life }) => life.choices.filter((c) => EVENTS.some((e) => e.small && e.title === c.title)).length));
const adultYears = avg(lives.map(({ life, tpAge }) => Math.max(1, (life.deathAge ?? 0) - tpAge)));

console.log(`\nlives: ${n}`);
console.log(`death age  mean ${avg(ages).toFixed(1)}  min ${Math.min(...ages)}  max ${Math.max(...ages)}`);
console.log(`distinct events per life  mean ${avg(distinct).toFixed(1)}  min ${Math.min(...distinct)}  under ${MIN_DISTINCT}: ${distinct.filter((d) => d < MIN_DISTINCT).length}`);
console.log(
  `  lives played ${MIN_YEARS}+ years: ${fullDistinct.length}, min ${Math.min(...fullDistinct)}; shorter lives (early deaths): ${short.length}, distinct ${short.map((l) => Object.keys(l.life.counts ?? {}).length).join(" ") || "-"}`,
);
console.log(`choices per life  mean ${avg(lives.map(({ life }) => life.choices.length)).toFixed(1)}  (small dilemmas ${smallPerLife.toFixed(1)}, about one every ${(adultYears / Math.max(0.1, smallPerLife)).toFixed(1)} years; median gap ${smallGaps.sort((a, b) => a - b)[Math.floor(smallGaps.length / 2)]?.toFixed(1) ?? "-"} years)`);
console.log(`rare moments  ${rareLives} lives (${((rareLives / n) * 100).toFixed(0)}%) had at least one`);
console.log(`events seen at least once across all lives: ${happened.size} / ${EVENTS.length}`);
console.log(`occurrences by category: ${cats.map((c) => `${CATEGORY_LABELS[c]} ${catTotals[c]}`).join(", ")}`);
const neverSeen = EVENTS.filter((e) => !happened.has(e.id) && e.id !== "personal").map((e) => e.id);
if (neverSeen.length) console.log(`never happened in ${n} lives: ${neverSeen.join(", ")}`);
const repeats = Object.values(Object.groupBy(lives.flatMap(({ life }) => Object.entries(life.counts ?? {}).filter(([id]) => repeatable.has(id))), ([id]) => id)).map(
  (rows) => `${rows![0][0]} max ${Math.max(...rows!.map(([, t]) => t))}`,
);
console.log(`life-stage events allowed to repeat: ${repeats.join(", ")}`);

// ── Checks ─────────────────────────────────────────────
const failures: string[] = [];
const underDistinct = fullDistinct.filter((d) => d < MIN_DISTINCT).length;
if (underDistinct) failures.push(`${underDistinct} lives played ${MIN_YEARS}+ years had fewer than ${MIN_DISTINCT} distinct events`);
const overRepeat = worst.filter((w) => w.times > MAX_REPEATS);
if (overRepeat.length) failures.push(`${overRepeat.length} lives repeated an event more than ${MAX_REPEATS} times (e.g. ${overRepeat[0].id} ×${overRepeat[0].times})`);
const meanAge = avg(ages);
if (meanAge < LIFESPAN[0] || meanAge > LIFESPAN[1]) failures.push(`mean lifespan ${meanAge.toFixed(1)} is outside ${LIFESPAN[0]}-${LIFESPAN[1]}`);

console.log(`\n${failures.length ? "FAIL" : "PASS"}`);
console.log(`- ${MIN_DISTINCT}+ distinct events in every life played ${MIN_YEARS}+ years: ${underDistinct ? "no" : "yes"} (min ${Math.min(...fullDistinct)})`);
console.log(`- no event more than ${MAX_REPEATS} times (life-stage events excepted): ${overRepeat.length ? "no" : "yes"} (max ${Math.max(...worst.map((w) => w.times))})`);
console.log(`- mean lifespan within ${LIFESPAN[0]}-${LIFESPAN[1]}: ${meanAge >= LIFESPAN[0] && meanAge <= LIFESPAN[1] ? "yes" : "no"} (${meanAge.toFixed(1)})`);
for (const f of failures) console.log(`  ✗ ${f}`);
if (failures.length) process.exit(1);
