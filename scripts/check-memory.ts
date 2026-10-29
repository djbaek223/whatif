// Plays lives that open a cafe and checks the life keeps it: no office moments for a shop owner,
// the narrator's facts and memory say so, and the player's own words ("카페를 차린다") set the state.
// Run: npx tsx scripts/check-memory.ts
import { advanceUntilStop, autoPick, createLife, fillMoment, intentFromText, lifeFacts, lifeSummary, resolveChoice, statusLabel } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";
import { ownsBusiness } from "../src/lib/work";

const profile: Profile = {
  name: "테스트", birthDate: "1985-03-02", gender: "여", hometown: "서울", elementary: "", middle: "", high: "", university: "경희대학교", major: "경영학",
  family: "", mbti: "ENFP", personality: "즉흥적이고 도전을 좋아한다.", currentLife: "회사원",
};
const tp: TurningPoint = { date: "2019-03", situation: "10년 다닌 회사에 남을지, 친구와 카페를 창업할지 고민했다.", actualChoice: "회사에 남았다", regret: "", kind: "이직·창업" };

const OFFICE = new Set(["overtime", "team-dinner", "big-project", "coworker-leaves", "business-trip", "bad-boss", "certificate", "burnout", "promotion", "job-offer", "startup-itch", "layoff", "parental-leave", "work-award", "new-boss", "era-imf"]);
const failures: string[] = [];
const fail = (m: string) => failures.length < 20 && failures.push(m);

/** Plays until the venture is settled or closed, watching every choice and event on the way. */
function play(life: LifeState, label: string) {
  for (let guard = 0; guard < 400 && !life.dead; guard++) {
    if (!ownsBusiness(life.flags)) break;
    if (life.pending) {
      if (OFFICE.has(life.pending.eventId)) fail(`${label}: office choice "${life.pending.title}" for ${statusLabel(life)}`);
      if (!/자영업/.test(lifeFacts(life))) fail(`${label}: facts lost the business: ${lifeFacts(life).split("\n")[3]}`);
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
      continue;
    }
    const before = life.log.length;
    const { state } = advanceUntilStop(life);
    // Headlines are about the world; only how one touched this life (the reaction) has to fit it.
    for (const l of state.log.slice(before)) {
      const text = l.kind === "news" ? (l.reaction ?? "") : l.text;
      if (/출퇴근|출근|회식|팀장|상사|승진|야근|연봉|입사 동기|인사팀|회사가/.test(text)) fail(`${label}: "${text}" while ${statusLabel(life)}`);
    }
    life = state;
  }
  return life;
}

// 1. The turning point: pick the cafe.
let owners = 0;
for (let i = 0; i < 200; i++) {
  let life = createLife(profile, tp, fallbackOpening(profile, tp));
  const cafe = life.pending!.options.find((o) => /카페|창업/.test(o.label));
  if (!cafe) { fail(`no cafe option: ${life.pending!.options.map((o) => o.label).join(" | ")}`); break; }
  life = resolveChoice(life, cafe.id);
  if (!ownsBusiness(life.flags)) { fail(`picked "${cafe.label}" but is ${statusLabel(life)}`); continue; }
  if (life.flags.company && /전자|그룹|회사/.test(life.flags.company)) fail(`kept the old employer: ${life.flags.company}`);
  owners++;
  if (i === 0) console.log(`turning point → ${statusLabel(life)}\n${life.log.at(-1)!.text}\n`);
  life = play(life, "tp");
  if (i === 0) console.log(`memory:\n  ${(life.memory ?? []).join("\n  ")}\n`);
}
console.log(`turning point: ${owners}/200 became shop owners`);

// 2. Free text at a later choice: the player's words decide the change.
const employee = (() => {
  const life = createLife(profile, tp, fallbackOpening(profile, tp));
  return resolveChoice(life, life.pending!.options.findIndex((o) => /원래/.test(o.label)).toString());
})();
for (const [text, expect] of [["회사를 그만두고 카페를 차린다", "startBusiness"], ["퇴사한다", "quitJob"], ["창업은 하지 않는다", null], ["이직한다", "switchJob"]] as const) {
  const got = intentFromText(text, employee)?.change ?? null;
  if (got !== expect) fail(`intentFromText("${text}") = ${got}, want ${expect}`);
}
{
  let life = employee;
  // Any choice that isn't already about opening a business.
  for (let g = 0; g < 50 && (!life.pending || life.pending.eventId === "biz-offer"); g++)
    life = life.pending ? resolveChoice(life, "decline") : advanceUntilStop(life).state;
  const first = life.pending!.options[0];
  const after = resolveChoice(life, first.id, "회사를 그만두고 카페를 차린다");
  console.log(`free text at "${life.pending!.title}" (nearest "${first.label}") → ${statusLabel(after)}`);
  if (!ownsBusiness(after.flags) || after.flags.job !== "카페 사장") fail(`free text cafe → ${statusLabel(after)}`);
  if (after.flags.company) fail(`free text cafe kept employer ${after.flags.company}`);
}

// 3. An AI moment that opens a shop.
{
  let life = employee;
  life = { ...life, pending: { eventId: "personal", title: "…", scene: "", options: [], freeText: true } };
  const filled = fillMoment(life, `personal@${life.mi}`, {
    title: "골목 카페", type: "work", keywords: ["카페"], tone: "담담함", rarity: "common", scene: "…",
    options: [
      { label: "골목에 카페를 연다", theme: "risk", change: "startBusiness", place: "연남동 작은 카페", jobTitle: "카페 사장", salary: 0, money: -3000, stats: { health: 0, happiness: 5, knowledge: 0, relationships: 0 }, chance: 1, outcome: "연남동에 작은 카페를 열었다.", failure: "" },
      { label: "회사에 남는다", theme: "career", change: "none", place: "", jobTitle: "", salary: 0, money: 0, stats: { health: 0, happiness: -2, knowledge: 0, relationships: 0 }, chance: 1, outcome: "회사에 남았다.", failure: "" },
    ],
  });
  if (!filled) fail("moment with startBusiness was dropped");
  else {
    const after = resolveChoice(filled, "0");
    console.log(`AI moment → ${statusLabel(after)}`);
    if (!ownsBusiness(after.flags) || after.flags.company !== "연남동 작은 카페") fail(`AI moment cafe → ${statusLabel(after)}`);
    if (!/연남동 작은 카페/.test(lifeSummary(after))) fail("summary has no memory of the cafe");
    const played = play(after, "moment");
    console.log(`  … later: ${statusLabel(played)}`);
  }
}

console.log(failures.length ? `\nFAIL\n- ${failures.join("\n- ")}` : "\nPASS");
if (failures.length) process.exit(1);
