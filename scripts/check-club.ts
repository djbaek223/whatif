// A club is joined, not worked at: a 19-year-old university student who types "영어학술동아리에 들어간다"
// stays a student, instead of "영어학술동아리에 사원으로 입사했다. 연봉 3,950만원." (reported 2026-11-07).
// Real jobs typed by a student still count ("LG전자에 입사한다"), and so does a shop ("동네 빵집에서 일한다").
// Run: npx tsx scripts/check-club.ts
import { createLife, intentFromText, resolveChoice, type Intent } from "../src/lib/engine";
import { employerIn, isGroup, joinsGroup } from "../src/lib/catalog";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const profile: Profile = {
  name: "SkyWhale", birthDate: "1979-01-02", gender: "남", hometown: "서울", elementary: "", middle: "", high: "", university: "", major: "",
  family: "", mbti: "INTJ", personality: "", currentLife: "",
};
const tp: TurningPoint = { date: "1998-03", situation: "대학에 막 입학했다.", actualChoice: "", regret: "", kind: "진로" };
const failures: string[] = [];
const fail = (m: string) => failures.push(m);

/** A first-year student at an AI-written fork about the club sign-up board (no option changes work). */
function student(seed = 0): LifeState {
  const life = createLife(profile, tp, fallbackOpening(profile, tp));
  const none = (outcome: string) => ({ outcome, stats: { happiness: 2 }, money: 0, change: "none" as const, chance: 1, failure: "" });
  const pending = {
    eventId: "ai-club-board", title: "게시판 앞의 신청서", scene: "학생회관 게시판에 동아리 신청서가 붙어 있다.",
    options: [{ id: "a", label: "밴드 동아리에 지원한다" }, { id: "b", label: "그냥 지나친다" }],
    custom: { a: none("밴드 동아리 오디션을 봤다."), b: none("신청서를 지나쳤다.") },
  } as unknown as LifeState["pending"];
  return { ...life, rng: life.rng + seed * 7919, flags: { ...life.flags, education: "university", employed: false, job: "", company: undefined }, income: 0, pending };
}

// 1. Reading the words alone.
for (const w of ["영어학술동아리", "봉사동아리", "경영학회", "토익스터디", "총학생회", "Debate Club"]) if (!isGroup(w)) fail(`isGroup("${w}") false`);
for (const w of ["LG전자", "동네빵집", "카카오"]) if (isGroup(w)) fail(`isGroup("${w}") true`);
for (const t of ["영어학술동아리에 들어간다", "영어학술동아리에 들어가서 활동한다", "봉사동아리에 가입한다", "경영학회에 들어간다", "토익스터디에 들어간다"]) {
  if (employerIn(t)) fail(`employerIn("${t}") = ${employerIn(t)}`);
  if (!joinsGroup(t)) fail(`joinsGroup("${t}") false`);
}
for (const t of ["LG전자에 입사한다", "동네 빵집에서 일한다"]) if (!employerIn(t)) fail(`employerIn("${t}") missed the employer`);
if (joinsGroup("동아리 선배 소개로 LG전자에 입사한다")) fail("a real job via a club senior read as joining a club");

// 2. The report, with or without the narrator's reading (it may wrongly say hire, even naming the club).
const TEXT = "영어학술동아리에 들어간다";
const readings: (Intent | null)[] = [null, { change: "none" }, { change: "hire" }, { change: "hire", place: "영어학술동아리" }];
for (const intent of readings) {
  for (let seed = 0; seed < 6; seed++) {
    const s = student(seed);
    if (intentFromText(TEXT, s)) fail(`intentFromText read ${JSON.stringify(intentFromText(TEXT, s))}`);
    for (const opt of ["a", "b"]) {
      const after = resolveChoice(s, opt, TEXT, intent);
      const out = after.log.filter((l) => l.kind === "outcome").at(-1)?.text ?? "";
      if (after.flags.employed || after.flags.company || after.income > 0 || /입사|연봉/.test(out))
        fail(`${JSON.stringify(intent)} opt ${opt} #${seed} → employed at ${after.flags.company} · ${out}`);
      if (after.flags.education !== "university") fail(`${JSON.stringify(intent)} #${seed}: left university (${after.flags.education})`);
    }
  }
}

// 3. A student who types a real job still gets it.
{
  const s = student();
  const after = resolveChoice(s, "b", "LG전자에 입사한다", null);
  if (!after.flags.employed || after.flags.company !== "LG전자") {
    // A first-year student has no degree, so LG전자 may be gated; a job of some kind must still follow.
    if (!after.flags.employed) fail(`typed a real job → not employed · ${after.log.at(-1)?.text}`);
  }
}

if (failures.length) {
  console.error(`check:club FAILED (${failures.length})\n` + failures.slice(0, 30).join("\n"));
  process.exit(1);
}
console.log("check:club ok");
