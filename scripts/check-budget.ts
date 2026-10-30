// Plays many lives and checks the education stat and fixed monthly costs:
// nobody works where their degree doesn't reach (대기업 needs a degree, a research institute a master's, a professorship a PhD,
// a hospital a medical degree), degrees are earned only by finishing a course, and adults pay fixed costs that the feed reports.
// Run: npm run check:budget
import { costTotal, monthlyCosts } from "../src/lib/budget";
import { DEGREE_RANK, TIER_NEEDS, guessTier, isMedical, tierOf } from "../src/lib/catalog";
import { degreeOf } from "../src/lib/education";
import { advanceUntilStop, autoPick, createLife, formatMi, lifeFacts, resolveChoice } from "../src/lib/engine";
import { ageOf } from "../src/lib/events";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { employee } from "../src/lib/work";
import { DEGREE_LABELS, type Degree, type LifeState, type Profile, type TurningPoint } from "../src/lib/types";

const failures: string[] = [];
const failed = new Set<string>();
/** One report per life and kind of problem. */
const fail = (m: string, key = m) => {
  if (failed.has(key) || failures.length >= 25) return;
  failed.add(key);
  failures.push(m);
};

const base: Profile = {
  name: "테스트", birthDate: "1985-04-10", gender: "여", hometown: "대전", elementary: "", middle: "", high: "대전고", university: "", major: "",
  family: "", mbti: "ENTJ", personality: "", currentLife: "",
};
const highSchool: TurningPoint = { date: "2001-03", situation: "고등학교에 막 올라갔다.", actualChoice: "공부를 열심히 했다", regret: "", kind: "입시" };

const jobs: Record<string, number> = {};
const degrees: Record<string, number> = {};
let costLines = 0;
let adultLines = 0;
let lives = 0;
let sampleCosts = "";
const wealthAt50: number[] = [];

function play(life: LifeState, label: string) {
  lives++;
  for (let guard = 0; guard < 900 && !life.dead; guard++) {
    const before = degreeOf(life.flags);
    const logged = life.log.length;
    life = life.pending ? resolveChoice(life, autoPick(life) ?? life.pending.options[0].id) : advanceUntilStop(life).state;
    const d = degreeOf(life.flags);
    if (DEGREE_RANK[d] < DEGREE_RANK[before]) fail(`${label}: degree went down ${before} → ${d} at ${formatMi(life.mi)}`);
    // A degree beyond high school only comes with a finished course.
    if (DEGREE_RANK[d] > DEGREE_RANK[before] && DEGREE_RANK[d] >= DEGREE_RANK.college && life.mi < life.flags.eduUntil - 1)
      fail(`${label}: ${DEGREE_LABELS[d]} before the course ended (${formatMi(life.mi)} < ${formatMi(life.flags.eduUntil)})`);
    if (employee(life.flags) && life.flags.company) {
      const tier = tierOf(life.flags.company) ?? guessTier(`${life.flags.company} ${life.flags.job}`);
      if (DEGREE_RANK[d] < DEGREE_RANK[TIER_NEEDS[tier]]) fail(`${label}: ${DEGREE_LABELS[d]} working at ${life.flags.company} (${tier} needs ${TIER_NEEDS[tier]}) ${formatMi(life.mi)}`, `${label}:tier`);
      if (tier === "doctor" && !isMedical(life.profile.major)) fail(`${label}: doctor without a medical major (${life.profile.major})`);
    }
    for (const e of life.log.slice(logged)) {
      if (e.tag !== "budget") continue;
      costLines++;
      if (e.text.startsWith("성인이 되었다")) adultLines++;
      if (!sampleCosts && life.flags.children) sampleCosts = `${formatMi(e.mi)} ${e.text} [${e.facts?.join(" | ")}]`;
    }
    const age = ageOf(life);
    if (age >= 20 && !life.dead && !life.pending) {
      const items = monthlyCosts(life);
      const inArmy = /군 복무 중/.test(lifeFacts(life));
      if (!items.length && !inArmy) fail(`${label}: no fixed costs at ${age}`);
      if (life.flags.children && life.flags.kidsBorn?.some((b) => (life.mi - b) / 12 >= 13 && (life.mi - b) / 12 < 19) && !items.some((i) => i.label === "자녀 학원비"))
        fail(`${label}: a teenager but no 학원비`);
      if (!life.flags.homeOwner && life.flags.partner === "married" && !inArmy && !items.some((i) => i.label === "월세")) fail(`${label}: married renter without 월세`);
    }
    if (age === 50 && wealthAt50.length < lives) wealthAt50.push(life.wealth);
    if (!/월 고정지출: /.test(lifeFacts(life))) fail(`${label}: narrator not told fixed costs`);
    if (!/학력: /.test(lifeFacts(life))) fail(`${label}: narrator not told the degree`);
  }
  const d = degreeOf(life.flags);
  degrees[d] = (degrees[d] ?? 0) + 1;
  for (const m of life.memory ?? []) {
    const hit = m.match(/(?:취업|이직): (.+?)(?:,|$)/);
    if (hit) {
      const tier = tierOf(hit[1].split(" ")[0]) ?? guessTier(hit[1]);
      jobs[tier] = (jobs[tier] ?? 0) + 1;
    }
  }
}

// 1. Teenagers with different majors, so the exam, university, graduate school and jobs come up on their own.
for (const major of ["경영학", "컴퓨터공학", "의예과", "물리학"]) {
  for (let i = 0; i < 120; i++) {
    const p = { ...base, major, mbti: i % 2 ? "INTJ" : "ESFP" };
    play(createLife(p, highSchool, fallbackOpening(p, highSchool)), `${major}#${i}`);
  }
}

// 2. A working adult who names a university starts with that degree; one who doesn't is a high school graduate.
for (const [uni, want] of [["부산대학교", "bachelor"], ["", "high"], ["인하공업전문대학", "college"]] as [string, Degree][]) {
  const p = { ...base, birthDate: "1980-02-01", university: uni, major: "기계공학" };
  const t: TurningPoint = { date: "2012-05", situation: "이직을 고민했다.", actualChoice: "남았다", regret: "", kind: "취업" };
  const life = createLife(p, t, fallbackOpening(p, t));
  if (degreeOf(life.flags) !== want) fail(`start with university "${uni}": ${degreeOf(life.flags)}, expected ${want}`);
  if (!life.expense || costTotal(monthlyCosts(life)) <= 0) fail(`start at 32: no fixed costs`);
}

console.log(`${lives} lives`);
console.log(`final degrees: ${Object.entries(degrees).map(([d, n]) => `${DEGREE_LABELS[d as Degree]} ${n}`).join(", ")}`);
console.log(`jobs taken by league: ${Object.entries(jobs).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(", ")}`);
console.log(`fixed-cost lines in the feed: ${costLines} (${adultLines} at adulthood)`);
if (sampleCosts) console.log(`sample: ${sampleCosts}`);
wealthAt50.sort((a, b) => a - b);
if (wealthAt50.length) console.log(`wealth at 50 (만원): p25 ${wealthAt50[Math.floor(wealthAt50.length / 4)]}, median ${wealthAt50[Math.floor(wealthAt50.length / 2)]}, p75 ${wealthAt50[Math.floor((wealthAt50.length * 3) / 4)]}`);
if (!jobs.doctor) fail("no medical student ever became a doctor");
if (!jobs.professor) fail("nobody ever became a professor");
if (adultLines < lives * 0.5) fail(`only ${adultLines} of ${lives} lives were told they now pay their own costs`);

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nall budget and education checks passed");
