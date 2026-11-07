// Measures how long a life takes to play: choices, auto turns and estimated minutes, by life stage and choice kind.
// Plays lives with AI + hybrid on against a stand-in narrator (every written moment gets options), like check:hybrid.
// Two modes: the default (작은 선택은 맡기기 on, as the game starts) and --ask-all (맡기기 off: every choice stops).
// Times are estimates from the counts (see the time model below), not measured in a browser.
// Run: npm run measure:pace [-- <lives>] [--ask-all]
import { eventById } from "../src/lib/events";
import { advanceTurn, asksPlayer, autoPick, createLife, fillMoment, fillScene, isBigChoice, pendingKeyOf, resolveChoice, slotFallback, TURNING_POINT_ID } from "../src/lib/engine";
import { ageAt } from "../src/lib/events";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { choiceRequest } from "../src/lib/narrator/requests";
import type { MomentResult, NarrateRequest, SceneResult } from "../src/lib/narrator/schema";
import { eventCategory } from "../src/lib/personal";
import { Rng } from "../src/lib/rng";
import { CATEGORY_LABELS, type Gender, type LifeState, type Profile, type TurningPoint } from "../src/lib/types";

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
const AUTO_SMALL = !args.includes("--ask-all");

// Time model (seconds)
const TICK = 0.8; // 선택까지 진행: one turn per 800ms
const CALL = 8.5; // one narration call (7-10s)
const READ = { big: 25, other: 15 }; // read the scene + options and decide
const CONSEQ = 5; // read the consequence card and tap on (big forks only: Play.tsx shows it for nothing else)
const FIXED = 10 + 20 + 15 + 20; // opening call, read opening/turning point, ending call, read ending

const SCENE = "저녁 산책길에 휴대폰이 울렸다. 오랜만에 보는 이름이었다. 어떻게 할까.";
function fakeMoment(req: Extract<NarrateRequest, { kind: "moment" }>): MomentResult {
  const n = req.slot?.small ? 2 : 3;
  return {
    title: "뜻밖의 연락", type: "relation", keywords: ["연락"], tone: "담담함", scene: SCENE,
    options: Array.from({ length: n }, (_, i) => ({
      label: ["반갑게 전화를 받는다", "나중에 연락하기로 한다", "문자로 짧게 답한다"][i],
      theme: (["leisure", "family", "money"] as const)[i],
      ...(req.slot ? {} : { change: "none" as const, place: "", jobTitle: "", salary: 0 }),
      money: 0, stats: { health: 0, happiness: 1, knowledge: 0, relationships: 1 }, chance: 1, outcome: "그날의 결정은 오래 남았다.", failure: "",
    })),
    followUp: "",
  };
}
const fakeScene = (req: Extract<NarrateRequest, { kind: "scene" }>): SceneResult => ({ scene: SCENE, labels: req.options.map((o) => ({ id: o.id, label: o.label, place: "" })) });

const MBTI = ["ISTJ", "INFP", "ENFP", "ESTJ", "INTJ", "ESFP", ""];
function person(rng: Rng): { profile: Profile; tp: TurningPoint } {
  const by = 1960 + Math.floor(rng.next() * 46);
  const profile: Profile = {
    name: "테스트", birthDate: `${by}-0${1 + Math.floor(rng.next() * 9)}-15`, gender: rng.pick<Gender>(["남", "여"]),
    hometown: rng.pick(["서울", "부산", "대전", "광주"]), elementary: "", middle: "", high: "",
    university: rng.pick(["부산대학교", "경희대학교", ""]), major: rng.pick(["경영학", "컴퓨터공학", ""]), family: "",
    mbti: rng.pick(MBTI), personality: rng.pick(["신중하고 계획적이다.", "외향적이고 도전을 좋아한다.", ""]), currentLife: "",
  };
  const tpAge = 12 + Math.floor(rng.next() * 24);
  return { profile, tp: { date: `${by + tpAge}-0${1 + Math.floor(rng.next() * 9)}`, situation: "진로를 고민했다.", actualChoice: "원래 하던 대로 했다", regret: "" } };
}

type Kind = "big" | "small" | "personal" | "rare" | "fork";
const BANDS: [string, number, number][] = [["~19", 0, 19], ["20대", 20, 29], ["30대", 30, 39], ["40대", 40, 49], ["50대", 50, 59], ["60대", 60, 69], ["70+", 70, 200]];
const band = (age: number) => BANDS.find(([, lo, hi]) => age >= lo && age <= hi)![0];
const kindOf = (p: NonNullable<LifeState["pending"]>): Kind =>
  p.rare ? "rare" : p.eventId === "personal" ? "personal" : p.small ? "small" : isBigChoice(p) ? "big" : "fork";

interface Stop { age: number; kind: Kind; id: string; cat: string; called: boolean }
interface LifeRun { turns: Record<string, number>; stops: Stop[]; autoPicked: number; waitOnly: number; presents: number; years: number; deathAge: number; tpAge: number }

function play(profile: Profile, tp: TurningPoint, seed: number): LifeRun {
  const r = new Rng(seed);
  Math.random = () => r.next();
  let life = createLife(profile, tp, fallbackOpening(profile, tp), { ai: true, hybrid: true });
  const run: LifeRun = { turns: {}, stops: [], autoPicked: 0, waitOnly: 0, presents: 0, years: 0, deathAge: 0, tpAge: 0 };
  const startMi = life.mi;
  run.tpAge = ageAt(profile.birthDate, startMi);
  for (let guard = 0; guard < 5000 && !life.dead; guard++) {
    if (!life.pending) {
      const res = advanceTurn(life);
      life = res.state;
      const age = ageAt(profile.birthDate, life.mi);
      run.turns[band(age)] = (run.turns[band(age)] ?? 0) + 1;
      if (res.stop === "present") run.presents++;
      continue;
    }
    const p = life.pending;
    const key = pendingKeyOf(life)!;
    const age = ageAt(profile.birthDate, life.mi);
    if (p.eventId === TURNING_POINT_ID) { life = resolveChoice(life, autoPick(life) ?? p.options[0].id); continue; }
    const fromScratch = p.eventId === "personal" || (!!p.slot && p.options.length === 0);
    const asks = !AUTO_SMALL || asksPlayer(p); // as the play screen does (Game.tsx stopsProgress)
    const req = choiceRequest(life)!;
    if (asks || fromScratch) {
      if (req.kind === "moment") life = fillMoment(life, key, fakeMoment(req)) ?? (life.pending?.slot ? slotFallback(life, key) : { ...life, pending: null });
      else life = fillScene(life, key, fakeScene(req));
    }
    if (asks) {
      const ev = eventById(p.eventId);
      run.stops.push({ age, kind: kindOf(p), id: p.eventId, cat: ev ? CATEGORY_LABELS[eventCategory(ev)] : "AI", called: true });
    } else {
      run.autoPicked++;
      if (fromScratch) run.waitOnly++;
    }
    if (life.pending) life = resolveChoice(life, autoPick(life) ?? life.pending.options[0]?.id ?? "0");
  }
  run.deathAge = life.deathAge ?? 0;
  run.years = run.deathAge - run.tpAge;
  return run;
}

const runs = Array.from({ length: N }, (_, i) => {
  const { profile, tp } = person(new Rng(5000 + i));
  return play(profile, tp, 77000 + i);
});

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * q)];
const secs = (r: LifeRun) => {
  const turns = Object.values(r.turns).reduce((a, b) => a + b, 0);
  const choice = r.stops.reduce((a, s) => a + CALL + (s.kind === "big" ? READ.big + CONSEQ : READ.other), 0);
  return { turns: turns * TICK, choice, total: turns * TICK + choice + r.waitOnly * CALL + FIXED + r.presents * 5 };
};
const T = runs.map(secs);
const choices = runs.map((r) => r.stops.length);
console.log(`mode: ${AUTO_SMALL ? "작은 선택은 맡기기 on (default)" : "맡기기 off: every choice stops"}, lives ${N}`);
console.log(`death age mean ${avg(runs.map((r) => r.deathAge)).toFixed(1)}, turning-point age mean ${avg(runs.map((r) => r.tpAge)).toFixed(1)}, years played mean ${avg(runs.map((r) => r.years)).toFixed(1)}`);
console.log(`choices/life mean ${avg(choices).toFixed(1)} p10 ${pct(choices, 0.1)} median ${pct(choices, 0.5)} p90 ${pct(choices, 0.9)}; auto-picked ${avg(runs.map((r) => r.autoPicked)).toFixed(1)}`);
console.log(`turns/life mean ${avg(runs.map((r) => Object.values(r.turns).reduce((a, b) => a + b, 0))).toFixed(1)}`);
const mins = T.map((t) => t.total / 60);
console.log(`minutes/life mean ${avg(mins).toFixed(1)} p10 ${pct(mins, 0.1).toFixed(1)} median ${pct(mins, 0.5).toFixed(1)} p90 ${pct(mins, 0.9).toFixed(1)}; of which choices ${(avg(T.map((t) => t.choice)) / 60).toFixed(1)}, auto turns ${(avg(T.map((t) => t.turns)) / 60).toFixed(1)}`);
console.log(`narration calls/life (choices) mean ${avg(runs.map((r) => r.stops.filter((s) => s.called).length)).toFixed(1)}; waiting on narration ${(avg(runs.map((r) => r.stops.length * CALL)) / 60).toFixed(1)} min`);

console.log(`\nby kind (choices/life):`);
const kinds: Kind[] = ["big", "fork", "small", "personal", "rare"];
for (const k of kinds) console.log(`  ${k.padEnd(9)} ${avg(runs.map((r) => r.stops.filter((s) => s.kind === k).length)).toFixed(2)}`);

console.log(`\nby life stage (per life that reached that stage): choices / turns / years played there / choices per year / minutes`);
for (const [b, lo, hi] of BANDS) {
  const here = runs.filter((r) => r.deathAge >= lo && r.tpAge <= hi);
  const yrs = here.map((r) => Math.max(0, Math.min(hi + 1, r.deathAge) - Math.max(lo, r.tpAge)));
  const ch = here.map((r) => r.stops.filter((s) => band(s.age) === b).length);
  const tu = here.map((r) => r.turns[b] ?? 0);
  const m = here.map((r) => (r.turns[b] ?? 0) * TICK + r.stops.filter((s) => band(s.age) === b).reduce((a, s) => a + CALL + (s.kind === "big" ? READ.big + CONSEQ : READ.other), 0));
  const byKind = kinds.map((k) => `${k} ${avg(here.map((r) => r.stops.filter((s) => band(s.age) === b && s.kind === k).length)).toFixed(1)}`).join(", ");
  console.log(`  ${b.padEnd(5)} n=${String(here.length).padStart(3)}  ${avg(ch).toFixed(1).padStart(5)} / ${avg(tu).toFixed(0).padStart(4)} / ${avg(yrs).toFixed(1).padStart(4)}y / ${(avg(ch) / Math.max(0.1, avg(yrs))).toFixed(2)} / ${(avg(m) / 60).toFixed(1)}m   [${byKind}]`);
}

console.log(`\nby category (choices/life):`);
const cats = new Map<string, number>();
for (const r of runs) for (const s of r.stops) cats.set(s.cat, (cats.get(s.cat) ?? 0) + 1);
console.log("  " + [...cats].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${(n / N).toFixed(1)}`).join(", "));

console.log(`\ntop choice events (per life):`);
const ids = new Map<string, { n: number; kind: Kind }>();
for (const r of runs) for (const s of r.stops) ids.set(s.id, { n: (ids.get(s.id)?.n ?? 0) + 1, kind: s.kind });
console.log("  " + [...ids].sort((a, b) => b[1].n - a[1].n).slice(0, 25).map(([id, v]) => `${id}(${v.kind}) ${(v.n / N).toFixed(2)}`).join(", "));
