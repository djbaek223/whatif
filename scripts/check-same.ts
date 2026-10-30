// Plays fixed-seed lives with template narration and prints a fingerprint of every life, so a refactor that must not
// change the Korean game can be compared before and after. Run: npm run check:same [-- <lives>] > out.txt
import { createHash } from "node:crypto";
import { advanceUntilStop, autoPick, createLife, resolveChoice } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

let seed = 12345;
Math.random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const base: Profile = {
  name: "테스트", birthDate: "1991-05-12", gender: "남", hometown: "대전", elementary: "", middle: "", high: "대전고",
  university: "충남대", major: "경영학", family: "", mbti: "INFP", personality: "신중하지만 한번 정하면 밀고 나간다.", currentLife: "IT 회사 기획자, 미혼",
};
const cases: [Partial<Profile>, TurningPoint][] = [
  [{}, { date: "2009-11", situation: "수능을 망쳤다.", actualChoice: "재수하지 않고 지방대에 갔다", regret: "" }],
  [{ birthDate: "1975-02-03", gender: "여", major: "컴퓨터공학" }, { date: "1998-03", situation: "외환위기로 입사가 취소됐다.", actualChoice: "대학원에 갔다", regret: "" }],
  [{ birthDate: "1988-09-30", major: "의예과" }, { date: "2016-06", situation: "창업 제안을 받았다.", actualChoice: "회사에 남았다", regret: "" }],
  [{ birthDate: "2001-12-01", gender: "여" }, { date: "2010-04", situation: "학원을 그만두고 싶었다.", actualChoice: "계속 다녔다", regret: "" }],
];

function play(profile: Profile, tp: TurningPoint): LifeState {
  let life = createLife(profile, tp, fallbackOpening(profile, tp));
  for (let guard = 0; guard < 2000 && !life.dead; guard++) {
    if (life.pending) life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
    else life = advanceUntilStop(life).state;
  }
  return life;
}

const n = Number(process.argv[2] ?? 40);
const all = createHash("sha256");
for (let i = 0; i < n; i++) {
  const [p, tp] = cases[i % cases.length];
  const life = play({ ...base, ...p }, tp);
  const json = JSON.stringify(life);
  all.update(json);
  console.log(`${i} ${life.deathAge} ${life.log.length} ${createHash("sha256").update(json).digest("hex").slice(0, 16)}`);
}
console.log(`all ${all.digest("hex")}`);
