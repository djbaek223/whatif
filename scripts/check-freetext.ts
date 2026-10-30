// A choice written in the player's own words plays as written: "미국 대학 석사에 도전한다" studies in the US,
// even when the nearest listed option named 고려대 대학원.
// Run: npx tsx scripts/check-freetext.ts
import { eventById } from "../src/lib/events";
import { createLife, fillMoment, pendingFor, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const profile: Profile = {
  name: "테스트", birthDate: "1998-05-02", gender: "남", hometown: "서울", elementary: "", middle: "", high: "", university: "경희대학교", major: "컴퓨터공학",
  family: "", mbti: "INTJ", personality: "꼼꼼하다.", currentLife: "회사원",
};
const tp: TurningPoint = { date: "2021-03", situation: "대학 4학년, 진로를 고민했다.", actualChoice: "계속 다녔다", regret: "", kind: "진로" };
const failures: string[] = [];
const fail = (m: string) => failures.push(m);

/** A life at its graduation, with the grad-school option promising 고려대학교 대학원. */
function atGraduation(): LifeState {
  const life = createLife(profile, tp, fallbackOpening(profile, tp));
  const s: LifeState = { ...life, flags: { ...life.flags, education: "university", school: "경희대학교" }, pending: null };
  const pending = pendingFor(eventById("graduation")!, s);
  const grad = pending.options.find((o) => o.id === "grad-school")!;
  grad.plan = { ...grad.plan, kind: "enroll", place: "고려대학교 대학원", tuition: 1100 };
  return { ...s, pending };
}

const school = (s: LifeState) => s.flags.school ?? "";
const outcome = (s: LifeState) => s.log.filter((l) => l.kind === "outcome").at(-1)?.text ?? "";

// 1. Free text vs. the listed option's school, without the narrator and with it (classify gave a place, or none).
for (const [text, place, want] of [
  ["미국 대학 석사에 도전한다", undefined, /^미국 /],
  ["미국 대학 석사에 도전한다", "미국", /^미국 /],
  ["영국으로 유학 가서 석사를 한다", undefined, /^영국 /],
  ["해외 대학원으로 간다", undefined, /^(미국|영국|독일|일본|싱가포르)/],
  ["서울대 대학원에 간다", undefined, /^서울대학교 대학원$/],
  ["카이스트 석사", undefined, /^KAIST 대학원$/],
  ["대학원에 간다", undefined, /^고려대학교 대학원$/], // no place named: the option's plan stands
] as const) {
  const life = atGraduation();
  const after = resolveChoice(life, "grad-school", text, place ? { change: "none", place } : null);
  console.log(`"${text}" → ${school(after)} · ${outcome(after)}`);
  if (!want.test(school(after))) fail(`"${text}" → ${school(after)}`);
  if (want.source !== "^고려대학교 대학원$" && /고려대/.test(outcome(after))) fail(`"${text}" outcome still names 고려대: ${outcome(after)}`);
  if (after.flags.education !== "graduate") fail(`"${text}" → education ${after.flags.education}`);
}

// 2. A tuition that fits: a self-funded master's abroad costs more than at home.
{
  const after = resolveChoice(atGraduation(), "grad-school", "미국 대학 석사에 도전한다");
  if ((after.flags.tuition ?? 0) < 3000) fail(`US master's tuition ${after.flags.tuition}`);
}

// 3. An AI-written option that names 고려대 in its outcome.
{
  const base = atGraduation();
  const life: LifeState = { ...base, flags: { ...base.flags, education: "done" }, pending: { eventId: "personal", title: "…", scene: "", options: [], freeText: true } };
  const filled = fillMoment(life, `personal@${life.mi}`, {
    title: "대학원", type: "work", keywords: ["대학원"], tone: "담담함", scene: "…",
    options: [
      { label: "고려대 석사에 지원한다", theme: "study", change: "enrollGraduate", place: "고려대학교 대학원", jobTitle: "", salary: 0, money: 0, stats: { health: 0, happiness: 2, knowledge: 5, relationships: 0 }, chance: 1, outcome: "고려대학교 대학원 석사 과정에 입학했다.", failure: "" },
      { label: "취업한다", theme: "career", change: "hire", place: "", jobTitle: "", salary: 0, money: 0, stats: { health: 0, happiness: 1, knowledge: 0, relationships: 0 }, chance: 1, outcome: "회사에 들어갔다.", failure: "" },
    ],
    followUp: "",
  });
  if (!filled) fail("AI moment dropped");
  else {
    const after = resolveChoice(filled, "0", "미국 대학 석사에 도전한다", { change: "enrollGraduate", place: "미국 대학원" });
    console.log(`AI option → ${school(after)} · ${outcome(after)}`);
    if (!/^미국 /.test(school(after))) fail(`AI option → ${school(after)}`);
    if (/고려대/.test(outcome(after))) fail(`AI option outcome names 고려대: ${outcome(after)}`);
  }
}

console.log(failures.length ? `\nFAIL\n- ${failures.join("\n- ")}` : "\nPASS");
if (failures.length) process.exit(1);
