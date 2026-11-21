// Plays many lives and checks the school and army calendar: a retake enters university two Marches later,
// a four-year course never ends before four years (plus military leave), and service lasts as long as it did
// in the year of enlistment. Also checks the narrator is told the dates.
// Run: npm run check:timeline
import { advanceUntilStop, autoPick, createLife, formatMi, lifeFacts, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { inService, owesService, serviceLength, serviceMonths } from "../src/lib/timeline";
import type { LifeFlags, LifeState, Profile, TurningPoint } from "../src/lib/types";

const failures: string[] = [];
const fail = (m: string) => failures.length < 25 && failures.push(m);
const mi = (y: number, m: number) => y * 12 + m - 1;

// 1. The service table.
for (const [y, m, want] of [[1965, 6, 30], [1970, 6, 36], [1980, 6, 33], [1986, 6, 30], [1995, 6, 26], [2000, 6, 26], [2004, 6, 24], [2013, 6, 21], [2022, 6, 18]] as const)
  if (serviceMonths(mi(y, m)) !== want) fail(`service ${y}-${m}: ${serviceMonths(mi(y, m))}개월, expected ${want}`);
if (serviceMonths(mi(1991, 1)) >= 30 || serviceMonths(mi(1991, 1)) <= 26) fail(`1991 should be in the 30→26 transition, got ${serviceMonths(mi(1991, 1))}`);

const profile: Profile = {
  name: "테스트", birthDate: "1978-05-12", gender: "남", hometown: "부산", elementary: "", middle: "", high: "부산고", university: "부산대학교", major: "기계공학",
  family: "", mbti: "ISTJ", personality: "꾸준하고 신중하다.", currentLife: "회사원, 기혼",
};
// Dongjun's example: the 1996 exam went badly and the player now retakes.
const tp: TurningPoint = { date: "1996-11", situation: "수능을 망쳤다. 재수할지, 성적에 맞춰 지방대에 갈지 고민했다.", actualChoice: "재수하지 않고 지방대에 갔다", regret: "", kind: "입시" };

interface Seen { retakeAt?: number; entered?: number; enteredAt?: number; graduated?: number; service: [number, number][] }

/** Watches one flag change at a time and checks it against the calendar. */
function watch(a: LifeFlags, s: LifeState, seen: Seen, label: string) {
  const b = s.flags;
  if (b.retakes !== a.retakes) seen.retakeAt = s.mi;
  if (b.entered !== undefined && b.entered !== a.entered && b.education === "university" && a.education !== "university") {
    seen.entered = b.entered;
    seen.enteredAt = s.mi;
    if (b.entered % 12 !== 2) fail(`${label}: university starts in ${formatMi(b.entered)}, not March`);
    if (seen.retakeAt !== undefined && Math.floor(b.entered / 12) < Math.floor(seen.retakeAt / 12) + 2)
      fail(`${label}: retake decided ${formatMi(seen.retakeAt)} but entered ${formatMi(b.entered)}`);
  }
  if (b.serviceFrom !== undefined && b.serviceFrom !== a.serviceFrom) {
    const len = b.serviceUntil! - b.serviceFrom;
    seen.service.push([b.serviceFrom, b.serviceUntil!]);
    if (len !== serviceLength(b.serviceFrom, b.serviceKind)) fail(`${label}: enlisted ${formatMi(b.serviceFrom)} (${b.serviceKind}) for ${len}개월, expected ${serviceLength(b.serviceFrom, b.serviceKind)}`);
    if (b.serviceKind !== "reserve" && b.draft === "reserve") fail(`${label}: judged 보충역 but went in as ${b.serviceKind}`);
  }
  if (a.education === "university" && b.education !== "university" && seen.entered !== undefined && b.education === "done") {
    seen.graduated = s.mi;
    const leave = seen.service.reduce((sum, [f, u]) => sum + Math.max(0, Math.min(u, s.mi) - Math.max(f, seen.entered!)), 0);
    if (s.mi - seen.entered < 47 + leave - 6) fail(`${label}: entered ${formatMi(seen.entered)}, served ${leave}개월 meanwhile, finished ${formatMi(s.mi)}`);
    for (const [f, u] of seen.service) if (s.mi >= f && s.mi < u) fail(`${label}: graduated ${formatMi(s.mi)} while in the army`);
  }
  // Military service comes before the career: no diploma-to-job or wedding while it is still owed, no job while serving.
  if (a.education === "university" && b.education === "done" && owesService(s) && s.mi < b.eduUntil + 12) fail(`${label}: graduated ${formatMi(s.mi)} without military service`);
  if (b.partner === "married" && a.partner !== "married" && (owesService(s) || inService(s))) fail(`${label}: married ${formatMi(s.mi)} before or during military service`);
  if (inService(s) && b.employed) fail(`${label}: employed (${b.job}) while serving, ${formatMi(s.mi)}`);
}

/** Plays to 2015 or so. With retakeFirst, the first exam result is answered with a retake. */
function play(life: LifeState, label: string, seen: Seen = { service: [] }, retakeFirst = false) {
  let facts = false;
  for (let guard = 0; guard < 600 && !life.dead; guard++) {
    if (/날짜: (재수|대학|군 복무 중)/.test(lifeFacts(life))) facts = true;
    const before = structuredClone(life.flags);
    const forced = retakeFirst && life.pending?.eventId === "csat" && !life.flags.retakes ? "retake" : null;
    life = life.pending ? resolveChoice(life, forced ?? autoPick(life) ?? life.pending.options[0].id) : advanceUntilStop(life).state;
    watch(before, life, seen, label);
      if (life.mi > mi(2015, 1) && life.mi - mi(Number(life.profile.birthDate.slice(0, 4)), 1) > 35 * 12) break;
  }
  return { life, seen, facts };
}

// 2. The turning point: pick the retake.
let retakers = 0, entered = 0, served = 0, graduated = 0, told = 0;
let sample: string[] = [];
for (let i = 0; i < 300; i++) {
  // The narrator's usual offer for this turning point (the template opening has no retake path).
  const opening = fallbackOpening(profile, tp);
  opening.choices[1] = { label: "재수해서 원하던 대학에 다시 도전한다", preset: "study", jobTitle: "", place: "", original: false, education: "highschool" };
  let life = createLife(profile, tp, opening);
  const retake = life.pending!.options[1];
  const seen: Seen = { service: [] };
  const before = structuredClone(life.flags);
  life = resolveChoice(life, retake.id);
  watch(before, life, seen, `tp#${i}`);
  if (life.flags.retaking === undefined) { fail(`tp#${i}: picked "${retake.label}" but not retaking (${life.flags.education})`); continue; }
  retakers++;
  const r = play(life, `tp#${i}`, seen);
  if (r.facts) told++;
  if (seen.entered !== undefined) entered++;
  if (seen.service.length) served++;
  if (seen.graduated !== undefined) graduated++;
  if (!sample.length && seen.entered !== undefined && seen.service.length && seen.graduated !== undefined)
    sample = (r.life.memory ?? []).slice(0, 8);
}
// 4. The draft exam: 현역, 보충역 or 면제 at 19, then the notice; a student mostly goes after the first or second year.
{
  const kinds: Record<string, number> = {};
  const afterEntry: number[] = [];
  for (const birth of ["1966-04-01", "1990-04-01", "2004-04-01"]) {
    const p = { ...profile, birthDate: birth, universityYear: undefined };
    const t: TurningPoint = { date: `${Number(birth.slice(0, 4)) + 16}-03`, situation: "고등학교에 막 올라갔다.", actualChoice: "공부를 열심히 했다", regret: "", kind: "입시" };
    for (let i = 0; i < 100; i++) {
      let life = createLife(p, t, fallbackOpening(p, t));
      for (let guard = 0; guard < 600 && !life.dead && life.mi < Number(birth.slice(0, 4)) * 12 + 30 * 12; guard++) {
        const before = structuredClone(life.flags);
        // Pick 현역 or 보충역, never the deferral, to measure when the notice comes on its own.
        const own = life.pending?.eventId === "military" ? life.pending.options.find((o) => o.id !== "delay")?.id : null;
        life = life.pending ? resolveChoice(life, own ?? autoPick(life) ?? life.pending.options[0].id) : advanceUntilStop(life).state;
        if (life.flags.serviceFrom !== undefined && before.serviceFrom === undefined && before.education === "university" && before.entered !== undefined) afterEntry.push(life.flags.serviceFrom - before.entered);
      }
      const k = life.flags.draft ?? "none";
      kinds[k] = (kinds[k] ?? 0) + 1;
      if (life.flags.draft !== "exempt" && !life.flags.serviceFrom) fail(`${birth}#${i}: ${life.flags.draft} but never served by 30`);
    }
  }
  const sorted = afterEntry.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(`draft exam over 300 men: ${JSON.stringify(kinds)}; students enlist a median ${median} months after entering (n=${sorted.length})`);
  if (!kinds.active || !kinds.reserve || !kinds.exempt) fail(`draft exam outcomes missing: ${JSON.stringify(kinds)}`);
  if (kinds.active < 200) fail(`too few 현역: ${kinds.active}/300`);
  if (median < 9 || median > 24) fail(`students enlist a median ${median} months after entering, expected after the first or second year`);
  if (sorted.at(-1)! > 30) fail(`a student enlisted ${sorted.at(-1)} months after entering without deferring`);
}

console.log(`turning point 1996-11 retake: ${retakers}/300 retaking, ${entered} entered university, ${served} served, ${graduated} graduated, ${told} told the dates`);
if (sample.length) console.log(`sample memory:\n  ${sample.join("\n  ")}`);

// 3. Lives that start before the exam, in other decades, so the exam, retake and enlistment come up on their own.
for (const [birth, date] of [["1962-03-20", "1978-03"], ["1985-09-02", "2001-03"], ["1999-07-07", "2015-03"]] as const) {
  const p = { ...profile, birthDate: birth, universityYear: undefined };
  const t: TurningPoint = { date, situation: "고등학교에 막 올라갔다.", actualChoice: "공부를 열심히 했다", regret: "", kind: "입시" };
  for (let i = 0; i < 150; i++) {
    const life = createLife(p, t, fallbackOpening(p, t));
    play(life, `${birth.slice(0, 4)}#${i}`, { service: [] }, i % 2 === 0);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nall timeline checks passed");
