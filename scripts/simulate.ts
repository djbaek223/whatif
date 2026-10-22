// Plays many lives with template narration and auto-picked choices, then prints balance numbers.
// Run: npm run simulate [-- <lives>]
import { advanceUntilStop, autoPick, createLife, formatMi, formatWealth, resolveChoice, statusLabel } from "../src/lib/engine";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const profile: Profile = {
  name: "테스트",
  birthDate: "1991-05-12",
  gender: "남",
  hometown: "대전",
  elementary: "",
  middle: "",
  high: "대전고",
  university: "충남대",
  major: "경영학",
  family: "",
  mbti: "INFP",
  personality: "신중하지만 한번 정하면 밀고 나간다.",
  currentLife: "IT 회사 기획자, 미혼",
};
const turningPoint: TurningPoint = { date: "2009-11", situation: "수능을 망쳤다.", actualChoice: "재수하지 않고 지방대에 갔다", regret: "" };

function playLife(): { life: LifeState; turns: number } {
  let life = createLife(profile, turningPoint, fallbackOpening(profile, turningPoint));
  let turns = 0;
  for (let guard = 0; guard < 2000 && !life.dead; guard++) {
    if (life.pending) {
      life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
      continue;
    }
    const before = life.log.length;
    const r = advanceUntilStop(life);
    turns += r.state.log.length - before;
    life = r.state;
  }
  return { life, turns };
}

const n = Number(process.argv[2] ?? 300);
const results = Array.from({ length: n }, playLife);
const ages = results.map((r) => r.life.deathAge ?? -1).sort((a, b) => a - b);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (p: number) => ages[Math.floor((ages.length - 1) * p)];
console.log(`lives: ${n}`);
console.log(`death age  mean ${avg(ages).toFixed(1)}  p10 ${pct(0.1)}  median ${pct(0.5)}  p90 ${pct(0.9)}`);
console.log(`choices per life  mean ${avg(results.map((r) => r.life.choices.length)).toFixed(1)}`);
console.log(`log lines per life  mean ${avg(results.map((r) => r.turns)).toFixed(0)}`);
console.log(`married ${(results.filter((r) => ["married", "widowed"].includes(r.life.flags.partner) || r.life.flags.partner === "divorced").length / n * 100).toFixed(0)}%  with kids ${(results.filter((r) => r.life.flags.children > 0).length / n * 100).toFixed(0)}%  home ${(results.filter((r) => r.life.flags.homeOwner).length / n * 100).toFixed(0)}%`);
console.log(`final wealth median ${formatWealth(results.map((r) => r.life.wealth).sort((a, b) => a - b)[Math.floor(n / 2)])}`);

const sample = results[0].life;
console.log(`\n── sample life: died ${sample.deathAge} (${statusLabel(sample)}) ──`);
for (const l of sample.log.filter((l) => l.kind !== "turn").slice(0, 60)) console.log(`${formatMi(l.mi)} [${l.kind}] ${l.text.split("\n")[0].slice(0, 90)}`);
