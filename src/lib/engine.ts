import { EVENTS, ageAt, ageOf, eventById, type Effect, type EventDef } from "./events";
import { LAST_REAL_NEWS_MI, futureCandidates, newsBetween, type NewsItem } from "./news";
import { Rng, newSeed } from "./rng";
import type {
  LifeFlags,
  LifeState,
  LogEntry,
  OpeningChoice,
  PendingChoice,
  Preset,
  Profile,
  StatKey,
  Stats,
  TurningPoint,
} from "./types";
import type { OpeningResult } from "./narrator/schema";

export const TURNING_POINT_ID = "turning-point";

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function presentMi(now = new Date()): number {
  return monthIndex(now.getFullYear(), now.getMonth() + 1);
}

export function formatMi(mi: number): string {
  return `${Math.floor(mi / 12)}년 ${(mi % 12) + 1}월`;
}

export function turningPointMi(tp: TurningPoint): number {
  const [y, m] = tp.date.split("-").map(Number);
  return monthIndex(y, m || 1);
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// ── Opening ────────────────────────────────────────────

/** Rough guess of where the user stood at the turning point, used when no AI is available. */
export function heuristicInitial(profile: Profile, tp: TurningPoint): OpeningResult["initial"] {
  const age = ageAt(profile.birthDate, turningPointMi(tp));
  const hasUni = profile.university.trim().length > 0;
  if (age < 16) return { education: "school", employed: false, jobTitle: "", monthlyIncome: 0, partner: "none", children: 0, wealth: 0 };
  if (age < 19) return { education: "highschool", employed: false, jobTitle: "", monthlyIncome: 0, partner: "none", children: 0, wealth: 0 };
  if (age < 23 && hasUni) return { education: "university", employed: false, jobTitle: "", monthlyIncome: 50, partner: "none", children: 0, wealth: 200 };
  if (age < 26) return { education: "done", employed: true, jobTitle: "사회초년생", monthlyIncome: 230, partner: "none", children: 0, wealth: 800 };
  return {
    education: "done",
    employed: true,
    jobTitle: "회사원",
    monthlyIncome: Math.min(550, 250 + (age - 26) * 12),
    partner: age >= 33 ? "married" : "none",
    children: age >= 36 ? 1 : 0,
    wealth: (age - 24) * 600,
  };
}

export function createLife(profile: Profile, tp: TurningPoint, opening: OpeningResult): LifeState {
  const mi = turningPointMi(tp);
  const init = opening.initial;
  const age = ageAt(profile.birthDate, mi);
  const flags: LifeFlags = {
    education: init.education,
    eduUntil: init.education === "university" ? mi + Math.max(12, (23 - age) * 12) : init.education === "graduate" ? mi + 24 : mi,
    employed: init.employed,
    job: init.employed ? init.jobTitle || "회사원" : "",
    partner: init.partner,
    children: Math.max(0, Math.min(5, init.children)),
    homeOwner: false,
    retired: false,
    military: profile.gender !== "남" || age > 24,
    busyUntil: mi,
    noKids: false,
    // Children who already exist at the turning point get rough birth months, oldest first.
    kidsBorn: Array.from({ length: Math.max(0, Math.min(5, init.children)) }, (_, i) => mi - 36 - (Math.min(5, init.children) - 1 - i) * 30),
  };
  const stats: Stats = {
    health: clamp(opening.stats.health),
    happiness: clamp(opening.stats.happiness),
    knowledge: clamp(opening.stats.knowledge),
    relationships: clamp(opening.stats.relationships),
  };
  const options = opening.choices.slice(0, 4).map((c, i) => ({
    id: String(i),
    label: c.original ? `${c.label} (원래의 길)` : c.label,
  }));
  const pending: PendingChoice = {
    eventId: TURNING_POINT_ID,
    title: "그날로 돌아왔다",
    scene: opening.situation,
    options,
    freeText: false,
  };
  return {
    version: 1,
    profile,
    turningPoint: tp,
    persona: opening.persona,
    mi,
    stats,
    wealth: Math.round(init.wealth),
    income: init.employed || init.monthlyIncome > 0 ? Math.round(init.monthlyIncome) : 0,
    flags,
    log: [{ mi, kind: "era", text: opening.era }],
    pending,
    openingChoices: opening.choices.slice(0, 4),
    rng: newSeed(),
    cooldowns: {},
    done: [],
    intenseUntil: mi + 12,
    presentShown: mi >= presentMi(),
    dead: false,
    deathAge: null,
    choices: [],
    history: [{ year: Math.floor(mi / 12), stats: { ...stats } }],
  };
}

function presetEffect(choice: OpeningChoice, s: LifeState): Effect {
  const effect = basePresetEffect(choice, s);
  const edu = choice.education;
  if (!edu || edu === "same" || edu === s.flags.education) return effect;
  const years = edu === "university" ? 4 : edu === "graduate" ? 2 : 0;
  return { ...effect, flags: { ...effect.flags, education: edu }, ...(years ? { eduYears: years } : {}) };
}

function basePresetEffect(choice: OpeningChoice, s: LifeState): Effect {
  const preset: Preset = choice.preset;
  const job = choice.jobTitle?.trim();
  switch (preset) {
    case "original":
      return { text: "결국 원래의 길을 다시 걸었다.", stats: { happiness: -2 } };
    case "study":
      return s.flags.education === "done"
        ? { text: "다시 공부를 시작했다.", stats: { knowledge: 10, happiness: -3 }, flags: { education: "graduate", employed: false, job: "" }, eduYears: 2, income: 60 }
        : // A retake waits for next year's exam season instead of meeting the exam right away.
          { text: "공부에 모든 것을 걸었다.", stats: { knowledge: 12, happiness: -4, health: -2 }, busyMonths: s.flags.education === "highschool" ? 10 : 0 };
    case "career":
      return {
        text: "일에서 새로운 길을 택했다.",
        stats: { knowledge: 3, happiness: 4 },
        flags: { employed: true, job: job || "회사원", education: s.flags.education === "highschool" ? "done" : s.flags.education },
        income: Math.max(s.income * 1.15, 230),
      };
    case "risk":
      return {
        text: "큰 모험을 시작했다.",
        wealth: -1000,
        risk: {
          chance: () => 0.35,
          success: { text: "모험이 성공으로 이어졌다.", stats: { happiness: 15, knowledge: 6 }, flags: { employed: true, job: job || "사업가" }, income: Math.max(450, s.income * 1.6) },
          failure: { text: "모험은 실패로 끝났지만 많은 걸 배웠다.", stats: { happiness: -10, knowledge: 8 }, wealth: -1500 },
        },
      };
    case "love":
      return {
        text: "마음이 이끄는 쪽을 택했다.",
        stats: { happiness: 8, relationships: 10 },
        flags: { partner: s.flags.partner === "dating" ? "married" : "dating" },
      };
    case "move":
      return { text: "익숙한 곳을 떠났다.", stats: { happiness: 5, relationships: -6, knowledge: 4 } };
    case "family":
      return { text: "가족 곁을 택했다.", stats: { relationships: 12, happiness: 3 }, incomePct: 0.9 };
    case "health":
      return { text: "몸과 마음을 먼저 돌보기로 했다.", stats: { health: 12, happiness: 5 } };
    case "rest":
      return { text: "잠시 멈춰 쉬기로 했다.", stats: { happiness: 8, knowledge: 2 }, wealth: -300 };
  }
}

// ── Effects ────────────────────────────────────────────

interface Applied {
  texts: string[];
  delta: Partial<Stats>;
}

function applyEffect(s: LifeState, effect: Effect, rng: Rng, out: Applied = { texts: [], delta: {} }): Applied {
  out.texts.push(effect.alt?.length ? rng.pick([effect.text, ...effect.alt]) : effect.text);
  if (effect.stats) {
    for (const [k, v] of Object.entries(effect.stats) as [StatKey, number][]) {
      const before = s.stats[k];
      s.stats[k] = clamp(before + v);
      out.delta[k] = (out.delta[k] ?? 0) + (s.stats[k] - before);
    }
  }
  if (effect.wealth) s.wealth += effect.wealth;
  if (effect.wealthPct && s.wealth > 0) s.wealth += Math.round(s.wealth * effect.wealthPct);
  if (effect.income !== undefined) s.income = Math.round(effect.income);
  if (effect.incomePct) s.income = Math.round(s.income * effect.incomePct);
  if (effect.flags) {
    const hadPet = s.flags.pet;
    s.flags = { ...s.flags, ...effect.flags };
    if (s.flags.pet && !hadPet) s.flags.petSince = s.mi;
  }
  if (effect.eduYears) s.flags.eduUntil = s.mi + effect.eduYears * 12;
  if (effect.busyMonths) s.flags.busyUntil = Math.max(s.flags.busyUntil, s.mi + effect.busyMonths);
  if (effect.addChild) {
    s.flags.children += 1;
    s.flags.kidsBorn = [...(s.flags.kidsBorn ?? []), s.mi];
  }
  if (effect.intense) s.intenseUntil = Math.max(s.intenseUntil, s.mi + effect.intense);
  if (effect.risk) {
    const ok = rng.chance(effect.risk.chance(s));
    applyEffect(s, ok ? effect.risk.success : effect.risk.failure, rng, out);
  }
  return out;
}

const clone = (s: LifeState): LifeState => structuredClone(s);

/** Lists the choices of an event that apply to this life right now. */
export function pendingFor(ev: EventDef, s: LifeState): PendingChoice {
  return {
    eventId: ev.id,
    title: ev.title,
    scene: ev.intro,
    options: (ev.choices ?? []).filter((c) => !c.when || c.when(s)).map((c) => ({ id: c.id, label: c.label })),
    freeText: true,
  };
}

export function resolveChoice(state: LifeState, optionId: string, freeText?: string): LifeState {
  const s = clone(state);
  const pending = s.pending;
  if (!pending) return s;
  const rng = new Rng(s.rng);
  let effect: Effect | undefined;
  if (pending.eventId === TURNING_POINT_ID) {
    const choice = s.openingChoices[Number(optionId)];
    if (choice) effect = presetEffect(choice, s);
  } else {
    effect = eventById(pending.eventId)?.choices?.find((c) => c.id === optionId)?.effect;
  }
  const picked = freeText?.trim() || pending.options.find((o) => o.id === optionId)?.label || optionId;
  s.choices.push({ mi: s.mi, age: ageOf(s), title: pending.title, picked });
  s.log.push({ mi: s.mi, kind: "choice", text: `${pending.title}: ${picked}` });
  if (effect) {
    const applied = applyEffect(s, effect, rng);
    s.log.push({ mi: s.mi, kind: "outcome", text: applied.texts.join(" "), delta: applied.delta });
  }
  s.pending = null;
  s.rng = rng.state;
  return s;
}

// ── Time ───────────────────────────────────────────────

/** Month-by-month around big moments, quarterly in working life, slower in old age. */
export function turnLength(s: LifeState): number {
  if (s.mi < s.intenseUntil) return 1;
  const age = ageOf(s);
  if (age >= 70) return 12;
  if (age >= 55) return 6;
  return 3;
}

/** Approximate Korean annual mortality (Gompertz fit), scaled by the health stat. */
export function annualDeathRate(age: number, health: number): number {
  const base = 0.000018 * Math.exp(0.095 * age);
  const healthFactor = Math.exp((60 - health) / 30);
  return Math.min(0.9, base * healthFactor);
}

function drift(s: LifeState, months: number) {
  const age = ageOf(s);
  const f = s.flags;
  // Health declines with age; unhappiness wears on it too.
  let dh = -Math.max(0, age - 35) * 0.0032 * months;
  if (s.stats.happiness < 30) dh -= 0.1 * months;
  if (age < 30) dh += (80 - s.stats.health) * 0.01 * months;
  s.stats.health = clamp(Math.max(1, s.stats.health + dh));

  const studying = f.education === "highschool" || f.education === "university" || f.education === "graduate" || f.education === "school";
  const dk = studying ? 0.3 : age > 72 ? -0.06 : 0.04;
  s.stats.knowledge = clamp(s.stats.knowledge + dk * months);

  const relTarget = 45 + (f.partner === "married" ? 12 : f.partner === "dating" ? 6 : 0) + f.children * 4;
  s.stats.relationships = clamp(s.stats.relationships + (relTarget - s.stats.relationships) * 0.015 * months);

  const settled = f.employed || f.retired || studying ? 4 : -6;
  const money = s.wealth < 0 ? -8 : Math.min(8, s.wealth / 15000);
  const happyTarget = 38 + s.stats.relationships * 0.2 + s.stats.health * 0.1 + settled + money;
  s.stats.happiness = clamp(s.stats.happiness + (happyTarget - s.stats.happiness) * 0.03 * months);

  // Money: adults pay their own living costs.
  if (age >= 20) {
    // Money is in today's won (real terms), so prices stay flat and raises are real raises.
    const living = 190 + f.children * 70 + (f.homeOwner ? 0 : 50);
    const student = f.education === "university" || f.education === "graduate" || f.education === "highschool";
    const share = f.employed ? 1 : student ? 0.2 : 0.8; // students lean on family support
    s.wealth += Math.round((s.income - living * share) * months);
  }
  // Yearly raise.
  const yearTurned = Math.floor(s.mi / 12) !== Math.floor((s.mi - months) / 12);
  if (yearTurned && f.employed) s.income = Math.round(s.income * 1.015);
  if (f.retired && s.income === 0) s.income = 100;
  if (f.education === "graduate" && s.mi >= f.eduUntil + 24) f.education = "done";
  if (f.education === "school" && age >= 16) f.education = "highschool";
  if (f.education === "highschool" && age >= 21) f.education = "done";
}

const SEASON: Record<number, string[]> = {
  1: ["새해 첫날, 올해는 다를 거라고 다짐했다.", "설 연휴에 떡국을 먹으며 한 살을 더 먹었다."],
  2: ["설 연휴, 고향 가는 길은 꽉 막혀 있었다."],
  3: ["새 학기, 새 출발의 공기가 감돌았다."],
  4: ["벚꽃이 흩날리는 길을 걸었다.", "봄비가 내리고 공기가 한결 부드러워졌다."],
  5: ["가정의 달, 카네이션을 샀다."],
  6: ["장마가 시작되었다."],
  7: ["무더위에 에어컨 앞을 떠나지 못했다.", "여름휴가 계획을 세웠다."],
  8: ["열대야에 잠을 설쳤다.", "매미 소리가 요란한 여름이었다."],
  9: ["추석 연휴, 송편을 빚었다.", "아침저녁으로 바람이 선선해졌다."],
  10: ["단풍이 물들기 시작했다.", "하늘이 유난히 높고 파랬다."],
  11: ["첫 추위가 찾아왔다.", "김장철이 다가왔다."],
  12: ["연말, 한 해를 돌아보았다.", "첫눈이 내렸다.", "거리에 캐럴이 울려 퍼졌다."],
};

function statusLine(s: LifeState, rng: Rng): string {
  const f = s.flags;
  const age = ageOf(s);
  const pick = (...lines: string[]) => rng.pick(lines);
  if (s.mi < f.busyUntil && f.military && age < 26) return pick("군 복무를 하며 시간을 보냈다.", "점호와 근무 사이로 계절이 지나갔다.", "전역 날짜가 조금씩 가까워졌다.");
  if (s.mi < f.busyUntil) return pick("목표를 위해 하루하루를 버텼다.", "책상 앞에서 계절이 바뀌었다.");
  const season = SEASON[(s.mi % 12) + 1];
  if (season && rng.chance(0.35)) return rng.pick(season);
  if (f.education === "school")
    return age < 8 ? pick("동네 골목에서 해가 질 때까지 뛰어놀았다.", "그림책을 읽으며 자랐다.") : pick("학교와 집을 오가며 자랐다.", "쉬는 시간마다 운동장으로 뛰어나갔다.", "방학 숙제를 개학 전날 몰아서 했다.");
  if (f.education === "highschool") return pick("야간 자율학습과 모의고사에 쫓기는 나날이었다.", "매점 빵 하나로 버티는 날이 많았다.", "독서실 책상 앞에서 졸다 깨기를 반복했다.");
  if (f.education === "university") return pick("강의와 아르바이트 사이를 오갔다.", "학교 앞 밥집에서 동기들과 끼니를 때웠다.", "과제 마감에 쫓겨 밤을 새웠다.", "도서관 자리 맡기 경쟁이 치열했다.");
  if (f.education === "graduate") return pick("연구실에서 밤을 새우는 날이 많았다.", "논문 마감이 다가왔다.", "교수님의 메일 한 통에 하루가 좌우되었다.");
  if (f.retired) {
    if (f.children > 0) return pick("느긋한 하루가 이어졌다.", "자식들의 안부 전화를 기다렸다.", "공원 벤치에서 햇볕을 쬐었다.", "텃밭에 상추를 심었다.");
    return pick("느긋한 하루가 이어졌다.", "공원 벤치에서 햇볕을 쬐었다.", "아침 산책이 하루의 시작이 되었다.");
  }
  if (f.employed) {
    if (kidsUnder(s, 13)) return pick(`${withRo(f.job)} 일하며 아이를 키웠다.`, "퇴근하면 육아로 두 번째 출근을 했다.", "주말이면 아이 손을 잡고 놀이공원에 갔다.");
    if (f.children > 0) return pick(`${withRo(f.job)} 일하며 가족을 꾸렸다.`, "아이 학원비 고지서를 보며 한숨을 쉬었다.", "다 큰 아이와 어색한 저녁을 먹었다.");
    if (f.partner === "married") return pick(`${withRo(f.job)} 일하며 배우자와 하루를 나눴다.`, "주말이면 배우자와 장을 보러 갔다.");
    if (f.pet) return pick(`${withRo(f.job)} 출퇴근을 반복했다.`, "퇴근하면 반려동물이 현관에서 기다렸다.");
    return pick(`${withRo(f.job)} 출퇴근을 반복했다.`, "월요병과 불금 사이를 오갔다.", "점심 메뉴 고르는 게 하루의 고민이었다.", "월급날을 손꼽아 기다렸다.");
  }
  return pick("다음 일을 고민하며 시간을 보냈다.", "채용 공고를 뒤적이며 하루를 보냈다.");
}

/** Appends 로 or 으로 to a Korean noun, by its final consonant. */
function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const final = code % 28;
  return final === 0 || final === 8 ? `${word}로` : `${word}으로`;
}

function kidsUnder(s: LifeState, age: number): boolean {
  return (s.flags.kidsBorn ?? []).some((b) => s.mi - b < age * 12);
}

// ── News ───────────────────────────────────────────────

/** Headlines that broke during this turn, as feed entries. Big news always shows; the rest are sampled. */
function newsEntries(s: LifeState, fromMi: number, months: number, rng: Rng): LogEntry[] {
  const cap = months >= 12 ? 3 : 2;
  let items: NewsItem[] = [];
  const real = newsBetween(fromMi, s.mi);
  if (real.length) {
    const big = real.filter((x) => x.big);
    const rest = rng.shuffle(real.filter((x) => !x.big));
    items = [...big, ...rest].slice(0, Math.max(cap, big.length)).sort((a, b) => a.mi - b.mi);
  }
  if (s.mi > LAST_REAL_NEWS_MI) {
    // About two imagined headlines a year once real news runs out.
    const p = 1 - Math.pow(1 - 2 / 12, months);
    const pool = futureCandidates(Math.floor(s.mi / 12), s.done);
    if (pool.length && rng.chance(p)) {
      const { id, item } = rng.pick(pool);
      s.done.push(id);
      items.push({ ...item, mi: s.mi });
    }
  }
  return items.map((x) => {
    const tag = `${x.cat} · ${(x.mi % 12) + 1}월`;
    const impact = x.impact?.(s);
    if (!impact) return { mi: s.mi, kind: "news", text: x.text, tag };
    const applied = applyEffect(s, impact, rng);
    return { mi: s.mi, kind: "news", text: `${x.text}\n${applied.texts.join(" ")}`, tag, delta: applied.delta };
  });
}

function eventChance(ev: EventDef, s: LifeState, months: number): number {
  const perYear = typeof ev.perYear === "function" ? ev.perYear(s) : ev.perYear;
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, perYear)), months / 12);
}

function eligible(ev: EventDef, s: LifeState, age: number): boolean {
  if (age < ev.minAge || age > ev.maxAge) return false;
  if (ev.once && s.done.includes(ev.id)) return false;
  if ((s.cooldowns[ev.id] ?? -1) > s.mi) return false;
  if (ev.when && !ev.when(s, age)) return false;
  if (ev.choices && s.mi < s.flags.busyUntil) return false;
  return true;
}

export type StopReason = "choice" | "death" | "present" | null;

/** Advances one turn. Returns the new state and why the player should stop, if they should. */
export function advanceTurn(state: LifeState): { state: LifeState; stop: StopReason } {
  if (state.dead || state.pending) return { state, stop: state.dead ? "death" : "choice" };
  const s = clone(state);
  const rng = new Rng(s.rng);
  const months = turnLength(s);
  const prevYear = Math.floor(s.mi / 12);
  s.mi += months;
  drift(s, months);
  const age = ageOf(s);
  const year = Math.floor(s.mi / 12);
  const entries: LogEntry[] = [];
  let stop: StopReason = null;

  if (year !== prevYear) s.history.push({ year, stats: { ...s.stats } });

  const q = annualDeathRate(age, s.stats.health);
  if (age >= 110 || rng.chance(1 - Math.pow(1 - q, months / 12))) {
    s.dead = true;
    s.deathAge = age;
    entries.push({ mi: s.mi, kind: "death", text: `${age}세, 눈을 감았다.` });
    stop = "death";
  } else {
    entries.push(...newsEntries(s, s.mi - months, months, rng));
    // At most one passive moment and one choice per turn, so small moments don't crowd out the big forks.
    let happened = false;
    let passive = false;
    for (const ev of rng.shuffle(EVENTS)) {
      if (ev.effect && !ev.choices && passive) continue;
      if (!eligible(ev, s, age) || !rng.chance(eventChance(ev, s, months))) continue;
      if (ev.once) s.done.push(ev.id);
      if (ev.cooldown) s.cooldowns[ev.id] = s.mi + ev.cooldown;
      happened = true;
      if (ev.choices) {
        s.pending = pendingFor(ev, s);
        entries.push({ mi: s.mi, kind: "event", text: ev.title });
        stop = "choice";
        break;
      }
      if (ev.effect) {
        const applied = applyEffect(s, ev.effect, rng);
        entries.push({ mi: s.mi, kind: "event", text: applied.texts.join(" "), delta: applied.delta });
        passive = true;
      }
    }
    if (!happened) {
      // Keep only the latest routine line between notable entries so the feed stays readable.
      const last = s.log.at(-1);
      if (last?.kind === "turn" && entries.length === 0) s.log.pop();
      entries.push({ mi: s.mi, kind: "turn", text: statusLine(s, rng) });
    }

    if (!s.presentShown && s.mi >= presentMi()) {
      s.presentShown = true;
      entries.push({ mi: s.mi, kind: "present", text: "지금, 현실의 나와 같은 시간에 도착했다." });
      if (!stop) stop = "present";
    }
  }

  s.log.push(...entries);
  s.rng = rng.state;
  return { state: s, stop };
}

/** Runs turns until something needs the player (a choice, the present day, or death). */
export function advanceUntilStop(state: LifeState, maxTurns = 400): { state: LifeState; stop: StopReason } {
  let cur = state;
  for (let i = 0; i < maxTurns; i++) {
    const r = advanceTurn(cur);
    cur = r.state;
    if (r.stop) return r;
  }
  return { state: cur, stop: null };
}

/** Picks an option for auto-decide mode: a coin weighted toward the first listed choices. */
export function autoPick(s: LifeState): string | null {
  if (!s.pending || s.pending.options.length === 0) return null;
  const rng = new Rng(s.rng ^ 0x5bd1e995);
  const opts = s.pending.options;
  const weights = opts.map((_, i) => 1 / (i + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < opts.length; i++) {
    r -= weights[i];
    if (r <= 0) return opts[i].id;
  }
  return opts[0].id;
}

export function statusLabel(s: LifeState): string {
  const f = s.flags;
  const parts: string[] = [];
  if (s.mi < f.busyUntil && f.military && ageOf(s) < 26) parts.push("군 복무 중");
  else if (f.education === "school") parts.push("학생");
  else if (f.education === "highschool") parts.push("고등학생");
  else if (f.education === "university") parts.push("대학생");
  else if (f.education === "graduate") parts.push("대학원생");
  else if (f.retired) parts.push("은퇴");
  else if (f.employed) parts.push(f.job);
  else parts.push("구직 중");
  const partner = { none: "", dating: "연애 중", married: "기혼", divorced: "이혼", widowed: "사별" }[f.partner];
  if (partner) parts.push(partner);
  if (f.children > 0) parts.push(`자녀 ${f.children}명`);
  if (f.homeOwner) parts.push("자가");
  return parts.join(" · ");
}

export function formatWealth(manwon: number): string {
  const sign = manwon < 0 ? "-" : "";
  const v = Math.abs(manwon);
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = Math.round(v % 10000);
    return `${sign}${eok}억${rest ? ` ${rest.toLocaleString()}만` : ""}원`;
  }
  return `${sign}${v.toLocaleString()}만원`;
}

/** A compact summary of the life so far, passed to the narrator. */
export function lifeSummary(s: LifeState, recent = 12): string {
  const age = ageOf(s);
  const lines = [
    `현재 ${formatMi(s.mi)}, ${age}세. 상태: ${statusLabel(s)}. 자산 ${formatWealth(s.wealth)}, 월수입 ${s.income}만원.`,
    `능력치: 건강 ${s.stats.health}, 행복 ${s.stats.happiness}, 지식 ${s.stats.knowledge}, 관계 ${s.stats.relationships}.`,
    `지금까지의 주요 선택: ${s.choices.map((c) => `${c.age}세 ${c.title} → ${c.picked}`).join(" / ") || "없음"}`,
    `최근 기록: ${s.log
      .filter((l) => l.kind !== "turn" && l.kind !== "news")
      .slice(-recent)
      .map((l) => `[${formatMi(l.mi)}] ${l.text.slice(0, 120)}`)
      .join(" / ")}`,
  ];
  return lines.join("\n");
}
