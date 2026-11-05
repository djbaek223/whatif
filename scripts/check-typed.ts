// A choice the player writes as done is done: "LG전자에 다니며 인생을 이어간다" puts them at LG전자,
// and the next choices don't ask a job-hunter where to apply. Also moves, a first job named in English,
// a university named with "입학한다", the degree a named employer needs, and words of trying (the gamble stays).
// Run: npx tsx scripts/check-typed.ts
import { eventById } from "../src/lib/events";
import { advanceUntilStop, createLife, lifeFacts, pendingFor, resolveChoice, type Intent } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { inRegion } from "../src/lib/region";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const profile: Profile = {
  name: "테스트", birthDate: "1995-05-02", gender: "남", hometown: "서울", elementary: "", middle: "", high: "", university: "경희대학교", major: "전자공학",
  family: "", mbti: "INTJ", personality: "꼼꼼하다.", currentLife: "회사원",
};
const tp: TurningPoint = { date: "2020-03", situation: "졸업 후 취업을 준비했다.", actualChoice: "", regret: "", kind: "진로" };
const failures: string[] = [];
const fail = (m: string) => failures.length < 30 && failures.push(m);
const outcome = (s: LifeState) => s.log.filter((l) => l.kind === "outcome").at(-1)?.text ?? "";

/** A life at a choice: job-hunting after a bachelor's (or at graduation, or a high school graduate), or at a company. */
function at(eventId: string, opts: { seed?: number; employedAt?: string; degree?: "bachelor" | "high"; lang?: "en" } = {}): LifeState {
  const life = createLife(profile, tp, fallbackOpening(profile, tp), opts.lang ? { lang: opts.lang } : {});
  const grad = eventId === "graduation";
  const s: LifeState = {
    ...life,
    rng: life.rng + (opts.seed ?? 0) * 7919,
    income: opts.employedAt ? 300 : 0,
    flags: {
      ...life.flags,
      education: grad ? "university" : "done",
      degree: opts.degree ?? "bachelor",
      school: opts.degree === "high" ? undefined : "경희대학교",
      eduUntil: life.mi,
      employed: !!opts.employedAt,
      job: opts.employedAt ? "사원" : "",
      company: opts.employedAt,
      selfEmployed: undefined,
    },
    pending: null,
  };
  const ev = eventById(eventId)!;
  const pending = inRegion("kr", () => pendingFor(ev, s), opts.lang);
  return { ...s, pending };
}

/** Plays on for a year: no choice may treat them as still job-hunting, and the job must hold unless a choice moved it. */
function noJobHunt(life: LifeState, label: string) {
  const HUNT = new Set(["job-search", "jobless-gap", "graduation", "job-hunt-blues", "childcare-job"]);
  const end = life.mi + 12;
  while (life.mi < end && !life.dead) {
    if (life.pending) {
      if (HUNT.has(life.pending.eventId)) fail(`${label}: asked "${life.pending.title}" while at ${life.flags.company}`);
      // Pick an option that changes nothing about work, so a later move isn't mistaken for the bug.
      const keep = life.pending.options.find((o) => !o.plan && !/그만|퇴사|이직|창업|사표|quit|resign/i.test(o.label)) ?? life.pending.options[0];
      life = resolveChoice(life, keep.id);
      continue;
    }
    life = advanceUntilStop(life).state;
  }
}

const NONE: Intent | null = null;
const read = (change: Intent["change"], place = "LG전자"): Intent => ({ change, place });

// 1. The report: "LG전자에 다니며 인생을 이어간다" at every choice where a job-hunter stands, with or without the narrator's reading.
for (const ev of ["job-search", "graduation", "jobless-gap"]) {
  for (const intent of [NONE, read("none"), read("hire"), read("switchJob")]) {
    for (let seed = 0; seed < 6; seed++) {
      const life = at(ev, { seed });
      const after = resolveChoice(life, life.pending!.options[0].id, "LG전자에 다니며 인생을 이어간다", intent);
      const label = `${ev} ${JSON.stringify(intent)} #${seed}`;
      if (!after.flags.employed || after.flags.company !== "LG전자") {
        fail(`${label} → ${after.flags.employed ? after.flags.company : "still job-hunting"} · ${outcome(after)}`);
        continue;
      }
      if (!/LG전자/.test(lifeFacts(after))) fail(`${label}: narrator facts miss LG전자`);
      if (!(after.memory ?? []).some((m) => /LG전자/.test(m))) fail(`${label}: memory misses LG전자`);
      if (seed === 0) noJobHunt(after, label);
    }
  }
}
console.log(`"LG전자에 다니며…" → ${outcome(resolveChoice(at("job-search"), "regular", "LG전자에 다니며 인생을 이어간다"))}`);

// 2. Other ways of saying it.
for (const [text, ev, want, opts] of [
  ["엘지전자 입사해서 다닌다", "job-search", /^LG전자$/, {}],
  ["삼성전자에서 일하며 산다", "graduation", /^삼성전자$/, {}],
  ["동네 빵집에서 일한다", "job-search", /^빵집$/, {}],
  ["네이버로 이직한다", "job-offer", /^네이버$/, { employedAt: "한결정밀" }],
  ["회사를 그만두고 카카오에 입사한다", "job-offer", /^카카오$/, { employedAt: "한결정밀" }],
  ["I keep working at LG Electronics", "job-search", /^LG전자$/, { lang: "en" as const }],
] as const) {
  for (let seed = 0; seed < 4; seed++) {
    const life = at(ev, { ...opts, seed });
    const after = resolveChoice(life, life.pending!.options[0].id, text, null);
    if (seed === 0) console.log(`"${text}" → ${after.flags.company ?? "-"} · ${outcome(after)}`);
    if (!after.flags.employed || !want.test(after.flags.company ?? "")) fail(`"${text}" #${seed} → ${after.flags.company ?? "jobless"} · ${outcome(after)}`);
  }
}

// 3. Staying where they already work changes nothing.
{
  const life = at("job-offer", { employedAt: "LG전자" });
  const stay = life.pending!.options.find((o) => o.id === "stay")!;
  const after = resolveChoice(life, stay.id, "LG전자에 계속 다닌다", null);
  if (after.flags.company !== "LG전자") fail(`staying at LG전자 → ${after.flags.company}`);
}

// 4. A university named with "입학한다" is that university.
{
  const life = at("job-search", { degree: "high" });
  const after = resolveChoice({ ...life, flags: { ...life.flags, education: "highschool", school: undefined } }, life.pending!.options[0].id, "서울대에 입학한다", null);
  console.log(`"서울대에 입학한다" → ${after.flags.school} · ${outcome(after)}`);
  if (after.flags.school !== "서울대학교") fail(`"서울대에 입학한다" → ${after.flags.school ?? after.flags.education}`);
}

// 5. A named employer the degree doesn't reach: they get a job they can, and the story says why.
{
  const life = at("job-search", { degree: "high" });
  const after = resolveChoice(life, life.pending!.options[0].id, "LG전자에 다니며 인생을 이어간다", read("hire"));
  console.log(`high school graduate → ${after.flags.company} · ${outcome(after)}`);
  if (after.flags.company === "LG전자") fail("a high school graduate joined LG전자");
  if (!after.flags.employed) fail("the degree gate left them job-hunting");
  if (!/LG전자/.test(outcome(after)) || !/고졸|대졸/.test(outcome(after))) fail(`no reason given: ${outcome(after)}`);
}

// 6. Words of trying keep the gamble: some fail.
{
  let failed = 0;
  for (let seed = 0; seed < 40; seed++) {
    const life = at("job-search", { seed });
    const after = resolveChoice(life, "regular", "삼성전자 공채에 도전한다", read("hire", "삼성전자"));
    if (!after.flags.employed) failed++;
    else if (after.flags.company !== "삼성전자") fail(`a try that worked went to ${after.flags.company}`);
  }
  console.log(`"삼성전자 공채에 도전한다": ${failed}/40 failed`);
  if (!failed) fail("a try always works");
}

console.log(failures.length ? `\nFAIL\n- ${failures.join("\n- ")}` : "\nPASS");
if (failures.length) process.exit(1);
