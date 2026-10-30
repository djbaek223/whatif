// Checks the hybrid events (hybrid.ts) and measures what they cost in narration tokens.
// Plays lives with AI on against a stand-in narrator that answers every call with replies of typical length,
// once with hybrid off (every event from the pool, as before) and once with it on, from the same seeds.
// Run: npm run check:hybrid [-- <lives>]
// For exact DeepSeek token counts, point TOKENIZER_DIR at a folder where `npm i @lenml/tokenizer-deepseek_v3` was run;
// without it tokens are estimated from characters.
import { createRequire } from "node:module";
import { EVENTS } from "../src/lib/events";
import { advanceUntilStop, autoPick, createLife, fillMoment, fillScene, isBigChoice, lifeSummary, pendingKeyOf, resolveChoice, slotFallback, TURNING_POINT_ID } from "../src/lib/engine";
import { aiWritable, conflictIn, stateKey, stockEpisodes, takeEpisode } from "../src/lib/hybrid";
import { fallbackOpening } from "../src/lib/narrator/fallback";
import { promptFor, systemFor } from "../src/lib/narrator/prompts";
import { choiceRequest } from "../src/lib/narrator/requests";
import type { EpisodeResult, MomentResult, NarrateRequest, SceneResult } from "../src/lib/narrator/schema";
import { Rng } from "../src/lib/rng";
import type { Gender, LifeState, Profile, TurningPoint } from "../src/lib/types";

// ── Tokens and price ───────────────────────────────────
// DeepSeek's list price for V4 Flash (USD per million tokens, cache miss). BytePlus ModelArk may differ: check the console.
const PRICE_IN = 0.14;
const PRICE_OUT = 0.28;
const KRW_PER_USD = 1400;

let encode: ((s: string) => number) | null = null;
if (process.env.TOKENIZER_DIR) {
  const mod = createRequire(import.meta.url)(`${process.env.TOKENIZER_DIR}/node_modules/@lenml/tokenizer-deepseek_v3`);
  const tok = mod.fromPreTrained();
  encode = (s) => tok.encode(s).length;
}
// Measured on this project's prompts with the DeepSeek V3 tokenizer: about 0.62 tokens a character (Korean with JSON).
const tokens = (s: string) => (encode ? encode(s) : Math.round(s.length * 0.62));

// ── Stand-in narrator: replies of typical length ───────
const SCENE = "저녁 산책길에 휴대폰이 울렸다. 오랜만에 보는 이름이었다. 당신은 잠시 화면을 내려다보다가 창밖으로 지나가는 불빛을 바라본다. 어떻게 할까.";
const OUTCOME = "그날의 결정은 생각보다 오래 마음에 남았다. 돌아보면 나쁘지 않은 선택이었다.";
const EPISODES: EpisodeResult[] = [
  { title: "동네 산책", type: "daily", text: "저녁을 먹고 동네를 한 바퀴 걸었다. 새로 생긴 빵집 앞에서 한참을 서 있었다.", stats: { health: 1, happiness: 1, knowledge: 0, relationships: 0 }, money: 0, keywords: ["산책", "빵집"] },
  { title: "오랜 친구", type: "relation", text: "고등학교 친구에게서 안부 문자가 왔다. 짧은 답장을 보내고 한참 웃었다.", stats: { health: 0, happiness: 2, knowledge: 0, relationships: 2 }, money: 0, keywords: ["친구", "문자"] },
  { title: "감기", type: "health", text: "환절기 감기가 길게 갔다. 일주일 내내 목이 잠겨 있었다.", stats: { health: -3, happiness: -2, knowledge: 0, relationships: 0 }, money: -20, keywords: ["감기"] },
];

function fakeMoment(req: Extract<NarrateRequest, { kind: "moment" }>): MomentResult {
  const n = req.slot?.small ? 2 : 3;
  return {
    title: "뜻밖의 연락",
    type: "relation",
    keywords: ["연락", "옛 친구"],
    tone: "담담함",
    scene: SCENE,
    options: Array.from({ length: n }, (_, i) => ({
      label: ["반갑게 전화를 받는다", "나중에 연락하기로 한다", "문자로 짧게 답한다"][i],
      theme: (["leisure", "family", "money"] as const)[i],
      ...(req.slot ? {} : { change: "none" as const, place: "", jobTitle: "", salary: 0 }),
      money: req.slot?.rare ? 999999 : i === 2 ? -30 : 0,
      stats: { health: 0, happiness: 3 - i * 2, knowledge: 0, relationships: 2 },
      chance: i === 1 ? 0.6 : 1,
      outcome: OUTCOME,
      failure: i === 1 ? "생각처럼 되지는 않았다." : "",
    })),
    followUp: "연락해 온 친구가 몇 달 뒤 함께 일해 보자고 할 수 있다.",
    ...(req.episodes ? { episodes: EPISODES } : {}),
  };
}

function fakeScene(req: Extract<NarrateRequest, { kind: "scene" }>): SceneResult {
  return {
    scene: SCENE,
    labels: req.options.map((o) => ({ id: o.id, label: `${o.label.slice(0, 18)} 쪽으로 마음을 정한다`, place: "" })),
    ...(req.episodes ? { episodes: EPISODES } : {}),
  };
}

const OPENING_OUT = 1100; // tokens: persona, era (2-3 paragraphs), situation, initial state, three choices
const ENDING_OUT = 1300; // tokens: a 4-6 paragraph memoir, epitaph and comparison

// ── Lives ──────────────────────────────────────────────
const MBTI = ["ISTJ", "INFP", "ENFP", "ESTJ", "INTJ", "ESFP", ""];
function person(rng: Rng): { profile: Profile; tp: TurningPoint } {
  const by = 1965 + Math.floor(rng.next() * 40);
  const profile: Profile = {
    name: "테스트",
    birthDate: `${by}-0${1 + Math.floor(rng.next() * 9)}-15`,
    gender: rng.pick<Gender>(["남", "여"]),
    hometown: rng.pick(["서울", "부산", "대전", "광주"]),
    elementary: "",
    middle: "",
    high: "",
    university: rng.pick(["부산대학교", "경희대학교", ""]),
    major: rng.pick(["경영학", "컴퓨터공학", ""]),
    family: "",
    mbti: rng.pick(MBTI),
    personality: rng.pick(["신중하고 계획적이다.", "외향적이고 도전을 좋아한다.", ""]),
    currentLife: "회사원",
  };
  const tpAge = 16 + Math.floor(rng.next() * 18);
  return { profile, tp: { date: `${by + tpAge}-0${1 + Math.floor(rng.next() * 9)}`, situation: "진로를 고민했다.", actualChoice: "원래 하던 대로 했다", regret: "" } };
}

interface Call {
  kind: string;
  input: number;
  output: number;
}
interface Run {
  calls: Call[];
  turns: number;
  aiMoments: number; // choices the narrator wrote from scratch (personal + pool slots)
  episodesPlayed: number;
  rares: number;
  lives: LifeState[];
}

const sizeOf = (req: NarrateRequest) => {
  const { schema, prompt } = promptFor(req);
  return tokens(systemFor(schema)) + tokens(prompt) + 8; // + chat template overhead
};

/** Plays one life. `auto`: auto-decide mode, where only big choices and written-from-scratch moments wait for the narrator. */
function play(profile: Profile, tp: TurningPoint, seed: number, hybrid: boolean, auto: boolean, failAll: boolean, run: Run) {
  const r = new Rng(seed);
  Math.random = () => r.next(); // createLife seeds from Math.random
  const opening = fallbackOpening(profile, tp);
  run.calls.push({ kind: "opening", input: sizeOf({ kind: "opening", profile, turningPoint: tp, eraHints: [], age: 20 }), output: OPENING_OUT });
  let life = createLife(profile, tp, opening, { ai: true, hybrid });
  for (let guard = 0; guard < 4000 && !life.dead; guard++) {
    if (!life.pending) {
      const before = life.log.length;
      life = advanceUntilStop(life).state;
      run.turns += Math.max(1, life.log.length - before);
      run.episodesPlayed += life.log.slice(before).filter((l) => l.kind === "event" && EPISODES.some((e) => e.text === l.text)).length;
      continue;
    }
    const p = life.pending;
    const key = pendingKeyOf(life)!;
    const fromScratch = p.eventId === "personal" || (!!p.slot && p.options.length === 0);
    if (p.eventId !== TURNING_POINT_ID && (fromScratch || !auto || isBigChoice(p))) {
      const req = choiceRequest(life)!;
      if (req.kind === "moment") {
        const res = failAll ? null : fakeMoment(req);
        run.calls.push({ kind: req.slot ? (req.slot.rare ? "moment·rare" : "moment·pool") : "moment·personal", input: sizeOf(req), output: res ? tokens(JSON.stringify(res)) : 0 });
        const filled = res && fillMoment(life, key, res);
        if (filled) run.aiMoments++;
        life = filled ?? (life.pending?.slot ? slotFallback(life, key) : { ...life, pending: null });
      } else {
        const res = failAll ? null : fakeScene(req);
        run.calls.push({ kind: req.episodes ? "scene+episodes" : "scene", input: sizeOf(req), output: res ? tokens(JSON.stringify(res)) : 0 });
        if (res) life = fillScene(life, key, res);
      }
    }
    if (life.pending) life = resolveChoice(life, autoPick(life) ?? life.pending.options[0]?.id ?? "0");
  }
  run.calls.push({ kind: "ending", input: sizeOf({ kind: "ending", summary: lifeSummary(life, 30), persona: life.persona, profile, turningPoint: tp, deathAge: life.deathAge ?? 80 }), output: ENDING_OUT });
  run.rares += life.rares?.length ?? 0;
  run.lives.push(life);
}

const n = Number(process.argv[2] ?? 60);
const people = Array.from({ length: n }, (_, i) => ({ ...person(new Rng(7000 + i)), seed: 91000 + i }));
const runOf = (hybrid: boolean, auto: boolean, failAll = false) => {
  const run: Run = { calls: [], turns: 0, aiMoments: 0, episodesPlayed: 0, rares: 0, lives: [] };
  for (const x of people) play(x.profile, x.tp, x.seed, hybrid, auto, failAll, run);
  return run;
};

const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures.push(what);
};

// ── 1. Which events the narrator writes ────────────────
const written = EVENTS.filter(aiWritable);
console.log(`pool ${EVENTS.length}: narrator-written ${written.length} (choices ${written.filter((e) => e.choices).length}, of which small dilemmas ${written.filter((e) => e.small).length}; everyday with no choice ${written.filter((e) => !e.choices && !e.rare).length}; rare ${written.filter((e) => e.rare).length})`);
console.log(`  kept as written: ${EVENTS.length - written.length} (big forks, era events, milestones, chain steps, anything that changes job/school/partner/home/pay)`);
check(!written.some((e) => ["csat", "graduation", "job-search", "marriage", "baby", "retirement", "house"].includes(e.id) || e.id.startsWith("era-")), "big forks and era events stay in the pool");

// ── 2. Contradictions ──────────────────────────────────
const base = createLife(people[0].profile, people[0].tp, fallbackOpening(people[0].profile, people[0].tp), { ai: true });
const single: LifeState = { ...base, dead: false, mi: base.mi, flags: { ...base.flags, education: "done", partner: "none", children: 0, employed: false, retired: false, job: "", homeOwner: false } };
check(conflictIn("아내와 저녁을 먹었다.", single) === "배우자", "a single person has no spouse");
check(conflictIn("회식 자리에서 팀장님이 잔을 건넸다.", single) === "회사", "someone without a job has no office");
check(conflictIn("아들이 첫 월급을 받았다.", single) === "자녀", "no children, no son");
const owner: LifeState = { ...single, flags: { ...single.flags, employed: true, selfEmployed: true, job: "카페 사장", company: "연남동 카페" } };
check(conflictIn("이번 달 가게 매출이 조금 올랐다.", owner) === null, "a cafe owner can talk about sales");
check(conflictIn("승진 발표가 났다.", owner) === "회사", "a cafe owner gets no promotion");
const pendingSlot = { eventId: "d-wedding-gift", title: "축의금", scene: "", options: [{ id: "a", label: "5만원" }, { id: "b", label: "10만원" }], freeText: true, slot: true };
const withSlot: LifeState = { ...single, pending: pendingSlot };
const key = pendingKeyOf(withSlot)!;
const bad = fakeMoment({ kind: "moment", summary: "", facts: "", persona: "", allowed: ["none"], recent: [], seeds: [], eraHints: [], slot: { title: "", intro: "", category: "", keywords: [], small: true, rare: false } });
check(fillMoment(withSlot, key, { ...bad, scene: "아내가 축의금 봉투를 내밀었다." }) === null, "a moment that contradicts the life is refused");
const fb = slotFallback(withSlot, key);
check(fb.pending?.options.length === 2 && !fb.pending.slot, "a refused moment plays the pool's options");

// ── 3. Everyday moments and follow-ups ─────────────────
const q: LifeState = structuredClone(single);
stockEpisodes(q, [...EPISODES, { ...EPISODES[0], text: "남편과 장을 봤다." }]);
check(q.episodes?.items.length === 3, "episodes that contradict the life are not queued");
const married = structuredClone(q);
married.flags.partner = "married";
check(stateKey(married) !== stateKey(q) && takeEpisode(married) === null, "episodes written before a marriage are dropped after it");
check(takeEpisode(q)?.text === EPISODES[0].text, "an episode that still fits is played");
const told = fillMoment(withSlot, key, bad)!;
check(!!told && (told.threads?.length ?? 0) === 1 && told.threads![0].due > told.mi, "a follow-up is scheduled for later");
const later: LifeState = { ...told, mi: told.threads![0].due, pending: { eventId: "personal", title: "", scene: "", options: [], freeText: true } };
const req = choiceRequest(later);
check(req?.kind === "moment" && !!req.thread, "a due follow-up goes into the next moment");

// ── 4. Rare stays the engine's ─────────────────────────
const pool = runOf(false, false);
const hyb = runOf(true, false);
const failed = runOf(true, false, true);
const rareSlots = hyb.calls.filter((c) => c.kind === "moment·rare").length;
console.log(`rare moments per life: pool ${(pool.rares / n).toFixed(2)}, hybrid ${(hyb.rares / n).toFixed(2)} (narrator-written ${rareSlots}), hybrid with every call failing ${(failed.rares / n).toFixed(2)}`);
const rareMoney = hyb.lives.flatMap((l) => l.log.filter((e) => e.rare && (e.money ?? 0) > 0).map((e) => e.money!));
check(rareMoney.every((m) => m <= 150000), "a rare windfall never exceeds the pool's own (15억)");
// Every stand-in moment is titled "뜻밖의 연락", so a rare one with that title came from the narrator.
const writtenRares = hyb.lives.flatMap((l) => l.rares ?? []).filter((r) => r.title === "뜻밖의 연락").length;
check(writtenRares === rareSlots && hyb.calls.some((c) => c.kind === "moment·personal"), "only moments the engine rolled as rare are rare (free moments never are)");
check(failed.lives.every((l) => l.dead) && failed.aiMoments === 0, "with every call failing, lives still play to the end from the pool");

// ── 5. Tokens and cost ─────────────────────────────────
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const cost = (c: { input: number; output: number }) => (c.input * PRICE_IN + c.output * PRICE_OUT) / 1e6;
function report(label: string, run: Run) {
  const perLife = { calls: run.calls.length / n, input: run.calls.reduce((a, c) => a + c.input, 0) / n, output: run.calls.reduce((a, c) => a + c.output, 0) / n };
  const usd = cost(perLife);
  const years = run.lives.reduce((a, l, i) => a + Math.max(1, (l.deathAge ?? 0) - Math.floor((Number(people[i].tp.date.slice(0, 4)) - Number(people[i].profile.birthDate.slice(0, 4))))), 0) / n;
  console.log(`\n${label}`);
  console.log(`  per life: ${perLife.calls.toFixed(1)} calls, in ${Math.round(perLife.input).toLocaleString()} + out ${Math.round(perLife.output).toLocaleString()} tokens ≈ $${usd.toFixed(4)} (${Math.round(usd * KRW_PER_USD)}원)`);
  console.log(`  per turn (${(run.turns / n).toFixed(0)} turns a life): ${Math.round((perLife.input + perLife.output) / (run.turns / n))} tokens; per 10 years played (${years.toFixed(0)} years a life): ${((perLife.calls / years) * 10).toFixed(1)} calls ≈ ${(((usd / years) * 10) * KRW_PER_USD).toFixed(1)}원`);
  console.log(`  narrator-written choices ${(run.aiMoments / n).toFixed(1)} a life, everyday moments written ${(run.episodesPlayed / n).toFixed(1)} a life`);
  const kinds = [...new Set(run.calls.map((c) => c.kind))];
  for (const k of kinds) {
    const cs = run.calls.filter((c) => c.kind === k);
    console.log(`  ${k.padEnd(16)} ${(cs.length / n).toFixed(1).padStart(5)} a life  in ${Math.round(avg(cs.map((c) => c.input))).toString().padStart(5)}  out ${Math.round(avg(cs.map((c) => c.output))).toString().padStart(5)}  ≈ $${avg(cs.map(cost)).toFixed(5)} a call`);
  }
  return { ...perLife, years };
}
console.log(`\ntokens: ${encode ? "DeepSeek V3 tokenizer" : "estimated from characters"}; price $${PRICE_IN}/M in, $${PRICE_OUT}/M out (no cache)`);
const a = report("BEFORE · manual play (pool + scene rewrite)", pool);
const b = report("AFTER · manual play (hybrid)", hyb);
const autoBefore = report("BEFORE · auto-decide", runOf(false, true));
const autoAfter = report("AFTER · auto-decide", runOf(true, true));
// Lives run longer or shorter by chance, so compare per year played.
const rate = (x: { calls: number; years: number }) => x.calls / x.years;
const per = (x: { input: number; output: number; years: number }) => cost(x) / x.years;
console.log(
  `\nchange per year played: manual ${((rate(b) / rate(a) - 1) * 100).toFixed(1)}% calls, ${((per(b) / per(a) - 1) * 100).toFixed(1)}% cost; auto-decide ${((rate(autoAfter) / rate(autoBefore) - 1) * 100).toFixed(1)}% calls, ${((per(autoAfter) / per(autoBefore) - 1) * 100).toFixed(1)}% cost`,
);
check(rate(b) <= rate(a) * 1.05, "hybrid makes no more than 5% more calls a year of life (manual play)");

console.log(`\n${failures.length ? "FAIL" : "PASS"}`);
if (failures.length) process.exit(1);
