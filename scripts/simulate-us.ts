// Plays many American lives with template narration and auto-picked choices, then prints balance numbers and the
// texts still missing English. Run: npm run simulate:us [-- <lives>]
import { advanceUntilStop, autoPick, createLife, formatMi, formatWealth, resolveChoice, statusLabel } from "../src/lib/engine";
import { missing } from "../src/lib/i18n";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { inRegion } from "../src/lib/region";
import { Rng } from "../src/lib/rng";
import type { LifeState, Profile, TurningPoint } from "../src/lib/types";

const rng = new Rng(7);
const PEOPLE: [Partial<Profile>, TurningPoint][] = [
  [{ birthDate: "1990-04-12", hometown: "Columbus, Ohio", high: "Westerville North High School", university: "Ohio State University", major: "Business" }, { date: "2008-04", situation: "I got into NYU but it cost twice as much as Ohio State.", actualChoice: "Went to Ohio State", regret: "" }],
  [{ birthDate: "1975-09-30", gender: "여", hometown: "Fresno, California", university: "", major: "" }, { date: "1998-06", situation: "My manager offered me a transfer to Seattle.", actualChoice: "Stayed in Fresno", regret: "" }],
  [{ birthDate: "1950-02-03", hometown: "Dayton, Ohio", university: "", major: "" }, { date: "1969-12", situation: "The draft lottery was coming.", actualChoice: "Waited for my number", regret: "" }],
  [{ birthDate: "2001-07-21", gender: "여", hometown: "Austin, Texas", university: "University of Texas at Austin", major: "Computer Science" }, { date: "2019-03", situation: "I had to choose between college and a coding bootcamp.", actualChoice: "Went to UT Austin", regret: "" }],
];
const base: Profile = { name: "Alex", birthDate: "1990-01-01", gender: "남", hometown: "", elementary: "", middle: "", high: "", university: "", major: "", family: "", mbti: "", personality: "Careful, but stubborn once I decide.", currentLife: "" };

function playLife(i: number): LifeState {
  const [p, tp] = PEOPLE[i % PEOPLE.length];
  const profile = { ...base, ...p, mbti: rng.pick(["INTJ", "ENFP", "ISFJ", "ESTP", ""]) };
  let life = inRegion("us", () => createLife(profile, tp, fallbackOpening(profile, tp), { region: "us" }));
  for (let guard = 0; guard < 2000 && !life.dead; guard++) {
    if (life.pending) life = resolveChoice(life, autoPick(life) ?? life.pending.options[0].id);
    else life = advanceUntilStop(life).state;
  }
  return life;
}

const n = Number(process.argv[2] ?? 300);
const lives = Array.from({ length: n }, (_, i) => playLife(i));
const ages = lives.map((l) => l.deathAge ?? -1).sort((a, b) => a - b);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (xs: number[], p: number) => xs[Math.floor((xs.length - 1) * p)];
inRegion("us", () => {
  console.log(`lives: ${n}`);
  console.log(`death age  mean ${avg(ages).toFixed(1)}  p10 ${pct(ages, 0.1)}  median ${pct(ages, 0.5)}  p90 ${pct(ages, 0.9)}`);
  console.log(`choices per life  mean ${avg(lives.map((l) => l.choices.length)).toFixed(1)}`);
  console.log(`married ${((lives.filter((l) => l.flags.partner !== "none" && l.flags.partner !== "dating").length / n) * 100).toFixed(0)}%  kids ${((lives.filter((l) => l.flags.children > 0).length / n) * 100).toFixed(0)}%  home ${((lives.filter((l) => l.flags.homeOwner).length / n) * 100).toFixed(0)}%  served ${((lives.filter((l) => l.flags.serviceUntil !== undefined).length / n) * 100).toFixed(0)}%`);
  console.log(`degree  ${["none", "high", "college", "bachelor", "master", "phd"].map((d) => `${d} ${((lives.filter((l) => (l.flags.degree ?? "none") === d).length / n) * 100).toFixed(0)}%`).join("  ")}`);
  const w = lives.map((l) => l.wealth).sort((a, b) => a - b);
  console.log(`final wealth  p10 ${formatWealth(pct(w, 0.1))}  median ${formatWealth(pct(w, 0.5))}  p90 ${formatWealth(pct(w, 0.9))}`);
  const hangul = lives.flatMap((l) => l.log.map((x) => x.text)).filter((t) => /[가-힣]/.test(t));
  console.log(`log lines still in Korean: ${hangul.length}  distinct texts missing English: ${missing.size}`);
  const sample = lives[0];
  console.log(`\n── sample life: died ${sample.deathAge} (${statusLabel(sample)}) ──`);
  for (const l of sample.log.filter((l) => l.kind !== "turn").slice(0, 70)) console.log(`${formatMi(l.mi)} [${l.kind}] ${l.text.split("\n")[0].slice(0, 110)}`);
});
