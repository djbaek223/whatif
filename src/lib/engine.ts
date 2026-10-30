import {
  MORTGAGE_RATE,
  betterTier,
  guessTier,
  pickAbroad,
  pickCompany,
  pickGradSchool,
  pickHome,
  pickUniversity,
  salaryFor,
  SALARY,
  tierOf,
  titleFor,
  tuitionFor,
  type CompanyTier,
} from "./catalog";
import { EVENTS, ageAt, ageOf, eventById, type Effect, type EventDef } from "./events";
import { formatWealth } from "./format";
import { addThread, aiWritable, closeThread, contradicts, hybridOn, stockEpisodes, takeEpisode } from "./hybrid";
import { LAST_REAL_NEWS_MI, futureCandidates, newsBetween, type NewsItem } from "./news";
import { ID_TEMPER, affinity, effectTheme, eventCategory, eventTheme, lean, relativeAffinity, temperFactor, temperFrom, traitsFrom } from "./personal";
import { Rng, newSeed } from "./rng";
import type {
  Category,
  CustomChange,
  CustomOption,
  LifeFlags,
  LifeState,
  LogEntry,
  OpeningChoice,
  OptionPlan,
  PendingChoice,
  PendingOption,
  Preset,
  Profile,
  StatKey,
  Stats,
  Theme,
  TurningPoint,
} from "./types";
import type { MomentResult, OpeningResult, SceneResult } from "./narrator/schema";
import { BUSINESS, businessTitle, employee, ownsBusiness } from "./work";

export { formatWealth };

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

// ── Age fit ────────────────────────────────────────────

/** Where a young person stands at school by age (만 나이): 초등학교 at 7, 중학교 at 13, 고등학교 at 16. Adults get "". */
export function lifeStage(age: number): string {
  if (age < 7) return "미취학 아동";
  if (age < 13) return "초등학생";
  if (age < 16) return "중학생";
  if (age < 19) return "고등학생";
  return "";
}

/** The school a child or teen attends at this age, from the profile. */
function schoolAt(profile: Profile, age: number): string {
  if (age < 7) return "";
  return (age < 13 ? profile.elementary : age < 16 ? profile.middle : profile.high).trim();
}

/** University months from the entrance year the player entered: March of that year to February four years on. */
export function universitySpan(profile: Profile): { from: number; to: number } | null {
  const y = Number(profile.universityYear);
  return y && profile.university.trim() ? { from: monthIndex(y, 3), to: monthIndex(y + 4, 2) } : null;
}

/** Old enough to finish school: work full time, go to university, or drop out. A senior counts from exam season (빠른년생). */
function canLeaveSchool(age: number, mi: number): boolean {
  return age >= 18 || (age === 17 && mi % 12 >= 8);
}

/**
 * Keeps the starting state possible for this age, whatever the narrator guessed.
 * A 9-year-old is in elementary school with no job, partner, children or savings, even if the profile names a university.
 */
export function fitInitialToAge(init: OpeningResult["initial"], age: number, mi: number, profile: Profile): OpeningResult["initial"] {
  const out = { ...init };
  if (!canLeaveSchool(age, mi)) {
    out.education = age < 16 ? "school" : "highschool";
    out.school = schoolAt(profile, age);
    Object.assign(out, { employed: false, jobTitle: "", company: "", monthlyIncome: 0, children: 0 });
    out.wealth = Math.max(0, Math.min(300, out.wealth));
    if (age < 16 || out.partner !== "dating") out.partner = "none";
  } else if (out.education === "graduate" && age < 22) out.education = "university";
  if (age < 20 && out.partner !== "none" && out.partner !== "dating") out.partner = "none";
  return out;
}

// ── Opening ────────────────────────────────────────────

/** Rough guess of where the user stood at the turning point, used when no AI is available. */
export function heuristicInitial(profile: Profile, tp: TurningPoint): OpeningResult["initial"] {
  const age = ageAt(profile.birthDate, turningPointMi(tp));
  const mi = turningPointMi(tp);
  const hasUni = profile.university.trim().length > 0;
  const uni = universitySpan(profile);
  const none = { company: "", school: "" };
  if (age < 16) return { ...none, education: "school", employed: false, jobTitle: "", monthlyIncome: 0, partner: "none", children: 0, wealth: 0 };
  if (uni && mi >= uni.from && mi <= uni.to)
    return { ...none, school: profile.university, education: "university", employed: false, jobTitle: "", monthlyIncome: 50, partner: "none", children: 0, wealth: 200 };
  // Before a late entrance year the player was still preparing for the exam (재수).
  if (age < 19 || (uni && mi < uni.from && age < 23)) return { ...none, education: "highschool", employed: false, jobTitle: "", monthlyIncome: 0, partner: "none", children: 0, wealth: 0 };
  if (age < 23 && hasUni && !uni)
    return { ...none, school: profile.university, education: "university", employed: false, jobTitle: "", monthlyIncome: 50, partner: "none", children: 0, wealth: 200 };
  if (age < 26) return { ...none, education: "done", employed: true, jobTitle: "사원", monthlyIncome: 230, partner: "none", children: 0, wealth: 800 };
  return {
    ...none,
    education: "done",
    employed: true,
    jobTitle: "회사원",
    monthlyIncome: Math.min(550, 250 + (age - 26) * 12),
    partner: age >= 33 ? "married" : "none",
    children: age >= 36 ? 1 : 0,
    wealth: (age - 24) * 600,
  };
}

/** When the university the player is in at the start ends: from the entrance year if given, otherwise around 23. */
function uniUntil(profile: Profile, mi: number, age: number): number {
  const uni = universitySpan(profile);
  return uni && mi >= uni.from && mi < uni.to ? uni.to : mi + Math.max(12, (23 - age) * 12);
}

const JOBLESS = /구직|취준|취업\s?준비|무직|백수|실직|준비생|휴학|없음/;
const GENERIC_PLACE = /^(대기업|중견기업|중소기업|스타트업|공기업|외국계|회사)$/;
const GENERIC_JOB = /^(회사원|직장인|사원|사회초년생|신입|정규직)$/;

export function createLife(profile: Profile, tp: TurningPoint, opening: OpeningResult, opts: { ai?: boolean; hybrid?: boolean } = {}): LifeState {
  const mi = turningPointMi(tp);
  const age = ageAt(profile.birthDate, mi);
  const init = fitInitialToAge(opening.initial, age, mi, profile);
  const seed = newSeed();
  const rng = new Rng(seed ^ 0x2f6b);
  // A title like "취업 준비생" means not working, whatever the employed flag says.
  const employed = init.employed && !JOBLESS.test(init.jobTitle);
  const jobTitle = (init.jobTitle || "").trim();
  const workYears = employed ? Math.max(0, age - 26) : 0;
  const tier = guessTier(`${init.company ?? ""} ${jobTitle}`);
  const company = employed
    ? init.company?.trim() || (GENERIC_JOB.test(jobTitle) || !jobTitle ? pickCompany(rng, tier, Math.floor(mi / 12), `${profile.major} ${jobTitle}`) : "")
    : "";
  const school = init.school?.trim() || (init.education === "university" || init.education === "graduate" ? profile.university.trim() : "");
  const flags: LifeFlags = {
    education: init.education,
    eduUntil: init.education === "university" ? uniUntil(profile, mi, age) : init.education === "graduate" ? mi + 24 : mi,
    employed,
    job: employed ? (GENERIC_JOB.test(jobTitle) || !jobTitle ? titleFor(tier, workYears) : jobTitle) : "",
    company: company || undefined,
    ...(employed && BUSINESS.test(jobTitle) ? { selfEmployed: true } : {}),
    school: school || undefined,
    tuition: school && (init.education === "university" || init.education === "graduate") ? tuitionFor(school, init.education) : undefined,
    workMonths: workYears * 12,
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
  // Three suggested paths; the fourth is the user's own words, as in every later choice.
  const options = opening.choices.slice(0, 3).map((c, i) => ({
    id: String(i),
    label: c.original ? `${c.label} (원래의 길)` : c.label,
  }));
  const pending: PendingChoice = {
    eventId: TURNING_POINT_ID,
    title: "그날로 돌아왔다",
    scene: opening.situation,
    options,
    freeText: true,
  };
  const life: LifeState = {
    version: 1,
    profile,
    turningPoint: tp,
    persona: opening.persona,
    mi,
    stats,
    wealth: Math.round(init.wealth),
    // Someone marked as job-seeking has no pay, even if the narrator guessed one.
    income: employed || (init.monthlyIncome > 0 && !init.employed) ? Math.round(init.monthlyIncome) : 0,
    flags,
    log: [{ mi, kind: "era", text: opening.era }],
    pending,
    openingChoices: opening.choices.slice(0, 3),
    rng: seed,
    cooldowns: {},
    done: [],
    intenseUntil: mi + 12,
    presentShown: mi >= presentMi(),
    dead: false,
    deathAge: null,
    choices: [],
    history: [{ year: Math.floor(mi / 12), stats: { ...stats } }],
    traits: traitsFrom(profile, opening.persona),
    leanings: {},
    ai: opts.ai,
    ...(opts.hybrid === false ? { hybrid: false } : {}),
    temper: temperFrom(profile, opening.persona),
    counts: {},
    marks: {},
    seeds: [],
    recent: [],
    rares: [],
  };
  life.memory = [`${stamp(life)}: 변곡점에서 출발 (${statusLabel(life)})`];
  return life;
}

/** Whether the choice's new school state is possible at this age; otherwise it is ignored ("same"). */
function eduFits(edu: OpeningChoice["education"], s: LifeState): boolean {
  const age = ageOf(s);
  if (edu === "highschool") return age >= 15;
  if (edu === "university" || edu === "done") return canLeaveSchool(age, s.mi);
  if (edu === "graduate") return age >= 21;
  return true;
}

function presetEffect(choice: OpeningChoice, s: LifeState): Effect {
  const effect = basePresetEffect(choice, s);
  const edu = choice.education;
  if (!edu || edu === "same" || edu === s.flags.education || !eduFits(edu, s)) return effect;
  const years = edu === "university" ? 4 : edu === "graduate" ? 2 : 0;
  const enroll: Effect["enroll"] =
    edu === "university" ? { level: "university", pick: choice.original ? "profile" : "fit" } : edu === "graduate" ? { level: "graduate" } : undefined;
  return { ...effect, flags: { ...effect.flags, education: edu }, ...(years ? { eduYears: years } : {}), ...(enroll && !effect.enroll ? { enroll } : {}) };
}

function basePresetEffect(choice: OpeningChoice, s: LifeState): Effect {
  const preset: Preset = choice.preset;
  const job = choice.jobTitle?.trim();
  const age = ageOf(s);
  // A child or teen can't take a job, stake savings or marry; the same leanings play out at their age.
  if (!canLeaveSchool(age, s.mi)) {
    if (preset === "career") return { text: "꿈꾸던 일을 향해 일찍부터 준비를 시작했다.", stats: { knowledge: 5, happiness: 4 } };
    if (preset === "risk") return { text: "남들과 다른 길에 과감히 도전했다.", stats: { happiness: 6, knowledge: 5, relationships: -2 } };
    if (preset === "love" && age < 16) return { text: "마음 가는 친구에게 먼저 다가갔다.", stats: { happiness: 6, relationships: 10 } };
    if (preset === "rest") return { text: "잠시 멈춰 쉬기로 했다.", stats: { happiness: 8, knowledge: 2 } };
  }
  switch (preset) {
    case "original":
      return { text: "결국 원래의 길을 다시 걸었다.", stats: { happiness: -2 } };
    case "study":
      return s.flags.education === "done"
        ? { text: "다시 공부를 시작했다.", stats: { knowledge: 10, happiness: -3 }, flags: { education: "graduate", employed: false, job: "" }, eduYears: 2, income: 60, enroll: { level: "graduate" } }
        : // A retake waits for next year's exam season instead of meeting the exam right away.
          { text: "공부에 모든 것을 걸었다.", stats: { knowledge: 12, happiness: -4, health: -2 }, busyMonths: s.flags.education === "highschool" ? 10 : 0 };
    case "career": {
      const title = job && !GENERIC_JOB.test(job) ? job : undefined;
      const tier = guessTier(`${choice.place ?? ""} ${job ?? ""}`);
      return {
        text: "일에서 새로운 길을 택했다.",
        stats: { knowledge: 3, happiness: 4 },
        flags: { education: s.flags.education === "highschool" ? "done" : s.flags.education },
        ...(s.flags.employed && !title ? { switchJob: { payPct: 1.15 } } : { hire: { tier, title } }),
      };
    }
    case "risk": {
      // A venture with a name (카페 창업, 유튜버) starts for real: the old job is left behind and how it goes plays out later.
      const generic = !job || /^(창업가?|사업가?|자영업자?)$/.test(job);
      const own = !generic || /창업|사업|가게|카페|식당|차리|차린|열어|프리랜서|유튜|장사/.test(choice.label);
      if (own) {
        const named = businessTitle(`${choice.label} ${job ?? ""}`);
        const place = choice.place?.trim();
        return {
          text: s.flags.employed && !ownsBusiness(s.flags) ? "사표를 내고 내 일을 시작했다." : "내 일을 시작했다.",
          stats: { happiness: 6, knowledge: 3 },
          wealth: -Math.max(1000, Math.min(4000, Math.round(s.wealth * 0.4))),
          note: "창업 자금",
          flags: { education: s.flags.education === "highschool" ? "done" : s.flags.education },
          startBusiness: { title: generic ? named : job, name: place && !GENERIC_PLACE.test(place) ? place : undefined, income: 220 },
          intense: 6,
        };
      }
      return {
        text: "큰 모험을 시작했다.",
        wealth: -1000,
        note: "초기 자금",
        risk: {
          chance: () => 0.35,
          success: {
            text: `모험이 성공으로 이어졌다. 월수입이 ${Math.round(Math.max(450, s.income * 1.6)).toLocaleString()}만원이 되었다.`,
            stats: { happiness: 15, knowledge: 6 },
            flags: { employed: true, job: job || "사업가", company: choice.place || undefined },
            income: Math.max(450, s.income * 1.6),
          },
          failure: { text: "모험은 실패로 끝났지만 많은 걸 배웠다.", stats: { happiness: -10, knowledge: 8 }, wealth: -1500, note: "정리하며 남은 손실" },
        },
      };
    }
    case "love":
      return {
        text: "마음이 이끄는 쪽을 택했다.",
        stats: { happiness: 8, relationships: 10 },
        flags: { partner: s.flags.partner === "dating" && age >= 20 ? "married" : "dating" },
      };
    case "move":
      return { text: "익숙한 곳을 떠났다.", stats: { happiness: 5, relationships: -6, knowledge: 4 } };
    case "family":
      return { text: "가족 곁을 택했다.", stats: { relationships: 12, happiness: 3 }, incomePct: 0.9 };
    case "health":
      return { text: "몸과 마음을 먼저 돌보기로 했다.", stats: { health: 12, happiness: 5 } };
    case "rest":
      return { text: "잠시 멈춰 쉬기로 했다.", stats: { happiness: 8, knowledge: 2 }, wealth: -300, note: "쉬는 동안의 생활비" };
  }
}

// ── Effects ────────────────────────────────────────────

interface Applied {
  texts: string[];
  delta: Partial<Stats>;
  payShown?: boolean; // a hire or move already printed the new salary
}

const won = (manwon: number) => formatWealth(Math.round(manwon));
const ORDINAL = ["", "첫째", "둘째", "셋째", "넷째", "다섯째"];
const yearsWorked = (s: LifeState) => Math.floor((s.flags.workMonths ?? 0) / 12);

/** Hiring tier from how much this person knows, for "find any job" outcomes. */
function autoTier(s: LifeState, rng: Rng): CompanyTier {
  const k = s.stats.knowledge;
  if (k >= 75) return rng.pick(["large", "it", "public", "foreign"] as const);
  if (k >= 60) return rng.pick(["mid", "public", "startup", "large"] as const);
  if (k >= 45) return rng.pick(["mid", "small", "small"] as const);
  return rng.pick(["small", "contract", "field"] as const);
}

const shortTown = (s: LifeState) => (s.profile.hometown || "서울").trim().split(/\s/)[0].replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "") || "서울";

function planHire(s: LifeState, rng: Rng, spec: NonNullable<Effect["hire"]>, plan?: OptionPlan): Required<Pick<OptionPlan, "place" | "tier" | "salary">> {
  const tier = (plan?.tier as CompanyTier | undefined) ?? (spec.tier === "auto" ? autoTier(s, rng) : spec.tier);
  let place = plan?.place ?? pickCompany(rng, tier, Math.floor(s.mi / 12), `${s.profile.major} ${spec.title ?? ""}`);
  if (tier === "civil" && !plan?.place) place = `${shortTown(s)}${place === "시청" ? "" : " "}${place}`;
  return { place, tier, salary: plan?.salary ?? salaryFor(rng, tier, yearsWorked(s)) };
}

function planSwitch(s: LifeState, rng: Rng, spec: NonNullable<Effect["switchJob"]>, plan?: OptionPlan) {
  const tier = (plan?.tier as CompanyTier | undefined) ?? betterTier(rng, tierOf(s.flags.company) ?? guessTier(`${s.flags.company ?? ""} ${s.flags.job}`));
  const place = plan?.place ?? pickCompany(rng, tier, Math.floor(s.mi / 12), `${s.profile.major} ${s.flags.job}`, s.flags.company);
  const raised = Math.round((s.income * 12 * spec.payPct) / 50) * 50;
  // Moving up a league can pay more than the usual bump; no league pays past its ceiling.
  // Near the ceiling a move still has to pay a little more, or nobody would take it.
  const salary = Math.max(Math.min(Math.max(raised, Math.round(salaryFor(rng, tier, yearsWorked(s)) * 0.9)), payCap(tier)), Math.round((s.income * 12 * 1.05) / 50) * 50);
  return { place, tier, salary: plan?.salary ?? salary };
}

function planEnroll(s: LifeState, rng: Rng, spec: NonNullable<Effect["enroll"]>, plan?: OptionPlan) {
  const k = s.stats.knowledge;
  const own = s.profile.university.trim();
  let place = plan?.place;
  if (!place) {
    if (spec.level === "abroad") place = pickAbroad(rng);
    else if (spec.level === "graduate") place = pickGradSchool(rng, k, s.flags.school || own);
    else if (spec.pick === "better") place = pickUniversity(rng, Math.min(95, k + 18));
    else if (spec.pick === "profile" || spec.pick === "fit") place = own || pickUniversity(rng, k);
    else place = pickUniversity(rng, k);
  }
  return { place, tuition: plan?.tuition ?? tuitionFor(place, spec.level) };
}

/** Top yearly pay (만원) for an employee of this league, executives aside. */
const payCap = (tier: CompanyTier) => Math.round(SALARY[tier][1] * 2.1);

/** Owners and freelancers set their own pay; employees stop at their league's ceiling. */
function capPay(s: LifeState, before: number) {
  if (!employee(s.flags)) return;
  const tier = tierOf(s.flags.company) ?? guessTier(`${s.flags.company ?? ""} ${s.flags.job}`);
  s.income = Math.min(s.income, Math.max(before * 1.05, Math.round(payCap(tier) / 12)));
  s.income = Math.round(s.income);
}

function planHome(s: LifeState, rng: Rng, mode: NonNullable<Effect["buyHome"]>, plan?: OptionPlan) {
  const area = plan?.place && plan.price ? { name: plan.place, price: plan.price } : pickHome(rng, s.wealth, s.profile.hometown, mode === "cheap");
  // Keep some cash back for living; borrow the rest.
  const down = Math.min(area.price, Math.max(0, s.wealth - Math.max(500, s.wealth * 0.15)));
  return { place: area.name, price: area.price, loan: Math.max(0, area.price - down) };
}

function doHire(s: LifeState, rng: Rng, spec: NonNullable<Effect["hire"]>, out: Applied, plan?: OptionPlan) {
  const p = planHire(s, rng, spec, plan);
  const title = spec.title ?? titleFor(p.tier as CompanyTier, yearsWorked(s));
  if (ownsBusiness(s.flags)) out.texts.push(`${eulReul(s.flags.company || "하던 일")} 정리했다.`);
  s.flags = { ...s.flags, employed: true, selfEmployed: false, job: title, company: p.place };
  s.income = Math.round(p.salary / 12);
  out.texts.push(p.tier === "civil" ? `${p.place}에 ${withRo(title)} 발령받았다. 연봉 ${won(p.salary)}.` : `${p.place}에 ${withRo(title)} 입사했다. 연봉 ${won(p.salary)}.`);
  out.payShown = true;
}

function doSwitch(s: LifeState, rng: Rng, spec: NonNullable<Effect["switchJob"]>, out: Applied, plan?: OptionPlan) {
  // Someone without an employer (job-seeking, or running their own shop) takes a job instead of moving between companies.
  if (!employee(s.flags)) return doHire(s, rng, { tier: "auto" }, out, plan);
  const p = planSwitch(s, rng, spec, plan);
  const before = s.income * 12;
  const keepTitle = !/^(사원|대리|과장|차장|부장|팀원|연구원|선임연구원|책임연구원|\d급 공무원)$/.test(s.flags.job);
  const title = keepTitle ? s.flags.job : titleFor(p.tier as CompanyTier, yearsWorked(s));
  s.flags = { ...s.flags, job: title, company: p.place };
  s.income = Math.round(p.salary / 12);
  out.texts.push(`${withRo(p.place)} 이직했다 (${title}). 연봉 ${won(before)} → ${won(p.salary)}.`);
  out.payShown = true;
}

/** Opens a shop or business of one's own. The old employer is left behind; the venture's fate comes later (moreEvents: venture-result). */
function doStartBusiness(s: LifeState, spec: NonNullable<Effect["startBusiness"]>, out: Applied) {
  const title = spec.title?.trim() || "사업가";
  const name = spec.name?.trim() || undefined;
  s.flags = { ...s.flags, employed: true, selfEmployed: true, retired: false, job: title, company: name };
  s.income = Math.round(spec.income ?? 220);
  s.marks = { ...s.marks, venture: s.mi };
  out.texts.push(`${name ? `${eulReul(name)} 열었다.` : `${withRo(title)} 첫발을 뗐다.`} 자리 잡기 전까지 수입은 월 ${won(s.income)} 남짓이다.`);
  out.payShown = true;
}

const LADDERS = [
  ["사원", "대리", "과장", "차장", "부장", "상무"],
  ["팀원", "팀장", "본부장"],
  ["9급 공무원", "8급 공무원", "7급 공무원", "6급 공무원", "5급 공무원", "4급 공무원"],
  ["연구원", "선임연구원", "책임연구원", "수석연구원"],
];

function doPromote(s: LifeState, out: Applied) {
  for (const ladder of LADDERS) {
    const i = ladder.indexOf(s.flags.job);
    if (i >= 0 && i < ladder.length - 1) {
      s.flags.job = ladder[i + 1];
      out.texts.unshift(`${s.flags.company ? `${s.flags.company}에서 ` : ""}${withRo(s.flags.job)} 승진했다.`);
      return;
    }
  }
  out.texts.unshift("승진했다.");
}

function doEnroll(s: LifeState, rng: Rng, spec: NonNullable<Effect["enroll"]>, out: Applied, plan?: OptionPlan) {
  const p = planEnroll(s, rng, spec, plan);
  s.flags.school = p.place;
  s.flags.tuition = p.tuition;
  const major = s.profile.major.trim();
  if (spec.level === "abroad") out.texts.push(`${p.place} 박사 과정에 합격했다. 학비는 면제되고 생활비 장학금(월 150만원)을 받는다.`);
  else {
    const half = ageOf(s) <= 24 ? " 절반은 부모님이 보태 주셨다." : "";
    out.texts.push(`${p.place}${spec.level === "university" && major ? ` ${major}` : ""}에 입학했다. 등록금은 연 ${won(p.tuition)}.${half}`);
  }
}

function doBuyHome(s: LifeState, rng: Rng, mode: NonNullable<Effect["buyHome"]>, out: Applied, plan?: OptionPlan) {
  const p = planHome(s, rng, mode, plan);
  const rate = p.price > 90000 ? 0.03 : p.price > 60000 ? 0.02 : 0.011; // 취득세 roughly by price band
  const fees = Math.round((p.price * (rate + 0.005) + 200) / 10) * 10; // + 중개수수료, 이사비
  const down = p.price - p.loan;
  s.wealth -= fees;
  s.flags = { ...s.flags, homeOwner: true, homeArea: p.place, homeValue: p.price, mortgage: p.loan };
  const kind = /빌라/.test(p.place) ? "" : " 아파트(84㎡)";
  out.texts.push(
    `${p.place}${kind}를 ${won(p.price)}에 샀다. 모은 돈 ${won(down)}${p.loan ? `에 주택담보대출 ${won(p.loan)}(연 ${(MORTGAGE_RATE * 100).toFixed(1)}%)을 더했다` : "으로 대출 없이 샀다"}. 취득세·중개수수료·이사비로 ${won(fees)}이 나갔다.`,
  );
}

function applyEffect(s: LifeState, effect: Effect, rng: Rng, out: Applied = { texts: [], delta: {} }, plan?: OptionPlan): Applied {
  const base = typeof effect.text === "function" ? effect.text(s) : effect.text;
  const text = effect.alt?.length ? rng.pick([base, ...effect.alt]) : base;
  if (text) out.texts.push(text);
  if (effect.stats) {
    for (const [k, v] of Object.entries(effect.stats) as [StatKey, number][]) {
      const before = s.stats[k];
      s.stats[k] = clamp(before + v);
      out.delta[k] = (out.delta[k] ?? 0) + (s.stats[k] - before);
    }
  }
  const wealthBefore = s.wealth;
  if (effect.wealth) s.wealth += effect.wealth;
  if (effect.wealthPct && s.wealth > 0) s.wealth += Math.round(s.wealth * effect.wealthPct);
  const spent = s.wealth - wealthBefore;
  if (effect.note && spent) out.texts.push(spent < 0 ? `${effect.note}에 ${won(-spent)}이 들었다.` : `${effect.note}로 ${won(spent)}이 들어왔다.`);
  if (effect.income !== undefined) s.income = Math.round(effect.income);
  if (effect.incomePct) s.income = Math.round(s.income * effect.incomePct);
  if (effect.flags) {
    const hadPet = s.flags.pet;
    const jobBefore = s.flags.job;
    s.flags = { ...s.flags, ...effect.flags };
    if (s.flags.pet && !hadPet) s.flags.petSince = s.mi;
    // A new title like "사업가" or "공동대표" means working for oneself: the old employer is gone unless the effect names the new place.
    if (effect.flags.job !== undefined && s.flags.employed && s.flags.job !== jobBefore) {
      s.flags.selfEmployed = BUSINESS.test(s.flags.job);
      if (s.flags.selfEmployed && !("company" in effect.flags)) s.flags.company = undefined;
    }
  }
  if (!s.flags.employed) {
    s.flags.company = undefined;
    s.flags.selfEmployed = undefined;
  }
  if (effect.eduYears) s.flags.eduUntil = s.mi + effect.eduYears * 12;
  if (effect.busyMonths) s.flags.busyUntil = Math.max(s.flags.busyUntil, s.mi + effect.busyMonths);
  if (effect.addChild) {
    s.flags.children += 1;
    s.flags.kidsBorn = [...(s.flags.kidsBorn ?? []), s.mi];
    const n = s.flags.children;
    out.texts.unshift(n === 1 ? "첫 아이가 태어났다." : `${ORDINAL[n] ?? "막내"}가 태어났다. 이제 아이가 ${n}명이다.`);
  }
  if (effect.hire) doHire(s, rng, effect.hire, out, plan);
  if (effect.switchJob) doSwitch(s, rng, effect.switchJob, out, plan);
  if (effect.promote) doPromote(s, out);
  if (effect.enroll) doEnroll(s, rng, effect.enroll, out, plan);
  if (effect.buyHome) doBuyHome(s, rng, effect.buyHome, out, plan);
  if (effect.startBusiness) doStartBusiness(s, effect.startBusiness, out);
  if (effect.homeValuePct && s.flags.homeOwner && s.flags.homeValue) {
    const before = s.flags.homeValue;
    const change = Math.round((before * effect.homeValuePct) / 100) * 100;
    s.flags.homeValue = before + change;
    s.wealth += change;
    out.texts.push(`집 시세 ${won(before)} → ${won(s.flags.homeValue)}.`);
  }
  if (effect.intense) s.intenseUntil = Math.max(s.intenseUntil, s.mi + effect.intense);
  if (effect.mark) s.marks = { ...s.marks, [effect.mark]: s.mi };
  if (effect.seed) addSeed(s, labelOf(effect.seed, s));
  if (effect.risk) {
    const ok = rng.chance(effect.risk.chance(s));
    // The plan names what the option promised, which is the success branch.
    applyEffect(s, ok ? effect.risk.success : effect.risk.failure, rng, out, ok ? plan : undefined);
  }
  return out;
}

/** Applies an effect and returns the feed entry pieces, with the money moved and any pay change spelled out. */
function applyTop(s: LifeState, effect: Effect, rng: Rng, plan?: OptionPlan): { text: string; delta: Partial<Stats>; money?: number } {
  const wealth = s.wealth;
  const income = s.income;
  const before = structuredClone(s.flags);
  const out = applyEffect(s, effect, rng, { texts: [], delta: {} }, plan);
  remember(s, before);
  if (s.income > income && !out.payShown) capPay(s, income);
  if (!out.payShown && s.flags.employed && income > 0 && s.income > 0 && s.income !== income)
    out.texts.push(ownsBusiness(s.flags) ? `월수입 ${won(income)} → ${won(s.income)}.` : `연봉 ${won(income * 12)} → ${won(s.income * 12)}.`);
  const money = s.wealth - wealth;
  return { text: out.texts.join(" "), delta: out.delta, ...(money ? { money } : {}) };
}

const clone = (s: LifeState): LifeState => structuredClone(s);

const MAX_MEMORY = 60;

/** "34세(2019년 3월)": when something happened, as the narrator reads it. */
const stamp = (s: LifeState) => `${ageOf(s)}세(${formatMi(s.mi)})`;

/** The lasting changes between two states, in plain words: jobs, a business, school, love, children, a home. */
function changesBetween(a: LifeFlags, s: LifeState): string[] {
  const b = s.flags;
  const out: string[] = [];
  const wasOwn = ownsBusiness(a);
  const isOwn = ownsBusiness(b);
  const workName = (f: LifeFlags) => (f.company && !f.job.includes(f.company) ? `${f.company} ${f.job}` : f.job);
  if (b.retired && !a.retired) out.push(`은퇴${a.employed ? ` (${workName(a)}에서)` : ""}`);
  else if (isOwn && (!wasOwn || a.company !== b.company)) out.push(`창업: ${b.job}${b.company ? ` (${b.company} 운영)` : ""}${a.employed && !wasOwn ? `, ${workName(a)} 퇴사` : ""}`);
  else if (b.employed && !isOwn && (!a.employed || wasOwn || a.company !== b.company))
    out.push(`${a.employed && !wasOwn ? "이직" : wasOwn ? "가게를 정리하고 취업" : "취업"}: ${workName(b)}`);
  else if (b.employed && b.job !== a.job && b.company === a.company) out.push(`직함 변경: ${b.job}`);
  else if (!b.employed && a.employed && !b.retired) out.push(wasOwn ? `폐업: ${a.company || a.job} 정리` : `퇴사: ${workName(a)}`);
  if (b.education !== a.education || b.school !== a.school) {
    if ((b.education === "university" || b.education === "graduate") && b.school && b.school !== a.school) out.push(`입학: ${b.school}${b.education === "graduate" ? " (대학원)" : ""}`);
    else if (b.education === "done" && (a.education === "university" || a.education === "graduate")) out.push(`학업 마침${a.school ? `: ${a.school}` : ""}`);
  }
  if (b.partner !== a.partner)
    out.push({ none: "연인과 헤어짐", dating: "연애 시작", married: "결혼", divorced: "이혼", widowed: "배우자와 사별" }[b.partner]);
  if (b.children > a.children) out.push(`${ORDINAL[b.children] ?? `${b.children}째`} 아이 출생`);
  if (b.noKids && !a.noKids) out.push("아이를 갖지 않기로 함");
  if (b.homeOwner && !a.homeOwner) out.push(`내 집 마련: ${b.homeArea ?? ""}`.trim());
  if (b.pet && !a.pet) out.push("반려동물을 들임");
  return out;
}

/** Writes lasting changes into the life's memory, which is kept for good and given to the narrator with every scene. */
function remember(s: LifeState, before: LifeFlags) {
  const changes = changesBetween(before, s);
  if (!changes.length) return;
  s.memory = [...(s.memory ?? []), `${stamp(s)}: ${changes.join(", ")}`].slice(-MAX_MEMORY);
}

const MAX_SEEDS = 8;

/** Remembers a person or thread for the narrator to pick up later; the oldest ones drop off. */
function addSeed(s: LifeState, seed: string) {
  if (!seed) return;
  s.seeds = [...(s.seeds ?? []).filter((x) => x !== seed), `${ageOf(s)}세: ${seed}`].slice(-MAX_SEEDS);
}

const MAX_RECENT = 12;

/** Logs what a moment was about as "category:keywords", for the narrator's no-repeat list. */
export function noteRecent(s: LifeState, category: string, keywords: string[], tone?: string) {
  const entry = `${category}:${keywords.slice(0, 3).join(",")}${tone ? `(${tone})` : ""}`;
  s.recent = [...(s.recent ?? []), entry].slice(-MAX_RECENT);
}

function noteRare(s: LifeState, title: string, text: string) {
  s.rares = [...(s.rares ?? []), { mi: s.mi, age: ageOf(s), title, text: text.split("\n")[0].slice(0, 160) }];
}

const labelOf = (label: string | ((s: LifeState) => string), s: LifeState) => (typeof label === "function" ? label(s) : label);

/** Fixes the company, school, pay or home an option leads to, so the label can name it and the outcome keeps it. */
function planFor(effect: Effect, s: LifeState, rng: Rng): OptionPlan | undefined {
  const e = effect.hire || effect.switchJob || effect.enroll || effect.buyHome ? effect : effect.risk?.success;
  const risky = e !== effect; // the place only comes with the gamble working out
  if (e?.hire) return { kind: "hire", risky, ...planHire(s, rng, e.hire) };
  if (e?.switchJob) return employee(s.flags) ? { kind: "switch", risky, from: s.income * 12, ...planSwitch(s, rng, e.switchJob) } : { kind: "hire", risky, ...planHire(s, rng, { tier: "auto" }) };
  if (e?.enroll) return { kind: "enroll", risky, ...planEnroll(s, rng, e.enroll) };
  if (e?.buyHome) return { kind: "home", risky, ...planHome(s, rng, e.buyHome) };
  if (effect.wealth && Math.abs(effect.wealth) >= 100) return { kind: "cost", cost: effect.wealth };
  return undefined;
}

/** One line under an option: where it leads and what it costs. */
export function planDetail(p: OptionPlan | undefined): string | undefined {
  if (!p) return undefined;
  const pre = p.risky ? "되면 " : "";
  switch (p.kind) {
    case "hire":
      return `${pre}${p.place} · 연봉 ${won(p.salary ?? 0)}`;
    case "switch":
      return `${pre}${p.place} · 연봉 ${won(p.from ?? 0)} → ${won(p.salary ?? 0)}`;
    case "enroll":
      return `${pre}${p.place} · ${p.tuition ? `등록금 연 ${won(p.tuition)}` : "학비 면제"}`;
    case "home":
      return `${pre}${p.place} · ${won(p.price ?? 0)}${p.loan ? ` (대출 ${won(p.loan)})` : ""}`;
    case "cost":
      return (p.cost ?? 0) < 0 ? `지출 약 ${won(-(p.cost ?? 0))}` : `수입 약 ${won(p.cost ?? 0)}`;
    default:
      return undefined;
  }
}

/** Lists the choices of an event that apply to this life right now, with names and money filled in. */
export function pendingFor(ev: EventDef, s: LifeState, rng: Rng = new Rng(s.rng)): PendingChoice {
  return {
    ...(ev.rare ? { rare: true } : {}),
    ...(ev.small ? { small: true } : {}),
    eventId: ev.id,
    title: ev.title,
    scene: labelOf(ev.intro, s),
    options: (ev.choices ?? [])
      .filter((c) => !c.when || c.when(s))
      .map((c) => {
        const plan = planFor(c.effect, s, rng);
        const o: PendingOption = { id: c.id, label: labelOf(c.label, s), theme: effectTheme(c.effect) };
        if (plan) {
          o.plan = plan;
          o.detail = planDetail(plan);
        }
        return o;
      }),
    freeText: true,
  };
}

/** A life change the player wrote in their own words, with what they named. */
export interface Intent {
  change: CustomChange;
  title?: string;
  place?: string;
}

const negated = (t: string) => /(않|안\s|안해|못\s|말자|말고|포기|접어\s?두)/.test(t);

const INTENT_WORDS: [CustomChange, RegExp][] = [
  ["closeBusiness", /폐업|(가게|카페|식당|사업|장사)[을를]?\s?(접|정리|닫)/],
  ["startBusiness", /창업|개업|자영업|프리랜서|유튜브|유튜버|(가게|카페|식당|매장|사업|장사|회사)[을를]?\s?(차|열|낸|내|시작|해\s?본|한다|하기)/],
  ["retire", /은퇴/],
  ["quitJob", /퇴사|사표|사직|(회사|직장|일)[을를]?\s?(그만|나오|나온|관두)/],
  ["switchJob", /이직|회사를?\s?옮/],
  ["hire", /취업|취직|입사|재취업|(회사|직장)에\s?(들어|다니)/],
  ["enrollGraduate", /대학원|석사|박사/],
  ["enrollUniversity", /대학에?\s?(가|진학|입학|들어)|편입|재입학/],
  ["marry", /결혼|청혼|프러포즈/],
  ["startDating", /고백|사귀|연애를?\s?시작/],
  ["addChild", /아이를?\s?(갖|낳)|임신|둘째|셋째/],
  ["buyHome", /(집|아파트)[을를]?\s?(사|산|샀|마련|매수)|영끌/],
];

/** Reads a life change from the player's own words, when the narrator can't: "회사를 그만두고 카페를 차린다" opens a cafe. */
export function intentFromText(text: string, s: LifeState): Intent | null {
  const t = text.trim();
  if (!t || negated(t)) return null;
  const allowed = new Set(allowedChanges(s));
  for (const [change, re] of INTENT_WORDS) {
    if (!re.test(t) || !allowed.has(change)) continue;
    return change === "startBusiness" ? { change, title: businessTitle(t) } : { change };
  }
  return null;
}

/** The big changes an effect makes (or makes if its gamble works), in the narrator's terms. */
function changesOf(e: Effect | undefined, s: LifeState): Set<CustomChange> {
  const out = new Set<CustomChange>();
  for (const x of [e, e?.risk?.success]) {
    if (!x) continue;
    if (x.hire) out.add("hire");
    if (x.switchJob) out.add(employee(s.flags) ? "switchJob" : "hire");
    if (x.startBusiness || (x.flags?.job && BUSINESS.test(x.flags.job))) out.add("startBusiness");
    if (x.flags?.employed === false && !x.flags.retired) out.add("quitJob").add("closeBusiness");
    if (x.flags?.retired) out.add("retire");
    if (x.enroll?.level === "university") out.add("enrollUniversity");
    if (x.enroll && x.enroll.level !== "university") out.add("enrollGraduate");
    if (x.buyHome) out.add("buyHome");
    if (x.addChild) out.add("addChild");
    if (x.flags?.partner === "dating") out.add("startDating");
    if (x.flags?.partner === "married") out.add("marry");
  }
  return out;
}

const INTENT_TEXT: Partial<Record<CustomChange, string>> = {
  quitJob: "회사를 그만뒀다.",
  closeBusiness: "가게를 정리했다.",
  retire: "일을 내려놓고 은퇴했다.",
  marry: "결혼했다.",
  startDating: "연애를 시작했다.",
};

export function resolveChoice(state: LifeState, optionId: string, freeText?: string, intent?: Intent | null): LifeState {
  const s = clone(state);
  const pending = s.pending;
  if (!pending) return s;
  const rng = new Rng(s.rng);
  let effect: Effect | undefined;
  const option = pending.options.find((o) => o.id === optionId);
  let plan = option?.plan;
  if (pending.eventId === TURNING_POINT_ID) {
    const choice = s.openingChoices[Number(optionId)];
    if (choice) {
      effect = presetEffect(choice, s);
      // A kind of workplace ("대기업") only sets the league; a named one is where the choice leads.
      if (choice.place?.trim() && !GENERIC_PLACE.test(choice.place.trim())) plan = { place: choice.place.trim(), tier: tierOf(choice.place) };
    }
  } else if (pending.custom?.[optionId]) {
    effect = customEffect(pending.custom[optionId]);
  } else {
    effect = eventById(pending.eventId)?.choices?.find((c) => c.id === optionId)?.effect;
  }
  // The player's own words win over the nearest listed option: writing "카페를 차린다" opens a cafe,
  // even if the closest option was about staying at the company.
  const wish = freeText?.trim() ? (intent?.change && intent.change !== "none" ? intent : intentFromText(freeText, s)) : null;
  if (wish && allowedChanges(s).includes(wish.change) && !changesOf(effect, s).has(wish.change)) {
    const text = wish.change === "startBusiness" && employee(s.flags) ? "사표를 냈다." : (INTENT_TEXT[wish.change] ?? "");
    effect = { text, stats: { happiness: 3 }, ...changeEffect(wish.change, wish) };
    if (wish.change === "startBusiness") effect = { ...effect, wealth: -Math.max(1000, Math.min(4000, Math.round(s.wealth * 0.4))), note: "창업 자금" };
    plan = undefined;
  }
  // A pool moment played as written (auto-decide, or no narrator) is noted here, since it wasn't when it came up.
  if (pending.slot) {
    const ev = eventById(pending.eventId);
    if (ev) noteRecent(s, eventCategory(ev), ev.keywords ?? [ev.title]);
  }
  const picked = freeText?.trim() || option?.label || optionId;
  s.choices.push({ mi: s.mi, age: ageOf(s), title: pending.title, picked });
  s.log.push({ mi: s.mi, kind: "choice", text: `${pending.title}: ${picked}` });
  if (effect) {
    lean(s, option?.theme ?? effectTheme(effect));
    const applied = applyTop(s, effect, rng, plan);
    s.log.push({ mi: s.mi, kind: "outcome", ...applied, ...(pending.rare ? { rare: true } : {}) });
    if (pending.rare) noteRare(s, pending.title, applied.text);
  }
  s.pending = null;
  s.rng = rng.state;
  return s;
}

/** Drops a choice that couldn't be written (an AI moment whose call failed), as if it never came up. */
export function dropPending(state: LifeState): LifeState {
  const s = clone(state);
  if (!s.pending) return s;
  const last = s.log.at(-1);
  if (last?.kind === "event" && last.mi === s.mi && last.text === s.pending.title) s.log.pop();
  s.pending = null;
  return s;
}

// ── AI-written moments ─────────────────────────────────

/** State changes an AI-written option may make, given where this life stands right now. */
export function allowedChanges(s: LifeState): CustomChange[] {
  const f = s.flags;
  const age = ageOf(s);
  const out: CustomChange[] = ["none"];
  const single = f.partner === "none" || f.partner === "divorced" || f.partner === "widowed";
  if (!f.employed && !f.retired && age >= 18 && f.education !== "school") out.push("hire", "startBusiness");
  // An employee can move or leave; someone running their own shop can close it or go back to working for someone.
  if (employee(f)) out.push("switchJob", "quitJob", "startBusiness");
  if (ownsBusiness(f)) out.push("hire", "closeBusiness");
  if (f.employed && age >= 50) out.push("retire");
  if (age >= 18 && age < 60 && (f.education === "done" || f.education === "highschool")) out.push("enrollUniversity");
  if (age >= 22 && age < 60 && f.education === "done" && !!f.school) out.push("enrollGraduate");
  if (!f.homeOwner && s.wealth >= 6000) out.push("buyHome");
  if (f.partner === "married" && age <= 45 && f.children < 5) out.push("addChild");
  if (single && age >= 16) out.push("startDating");
  if (f.partner === "dating" && age >= 20) out.push("marry");
  return out;
}

function changeEffect(c: CustomChange, o?: Pick<CustomOption, "title" | "place">): Partial<Effect> {
  switch (c) {
    case "hire":
      return { hire: { tier: "auto" } };
    case "switchJob":
      return { switchJob: { payPct: 1.15 } };
    case "quitJob":
    case "closeBusiness":
      return { flags: { employed: false, job: "" }, income: 0 };
    case "startBusiness":
      return { startBusiness: { title: o?.title?.trim() || businessTitle(`${o?.place ?? ""}`), name: o?.place?.trim() || undefined }, intense: 6 };
    case "retire":
      return { flags: { employed: false, retired: true, job: "은퇴" }, income: 130 };
    case "enrollUniversity":
      return { flags: { education: "university", employed: false, job: "" }, income: 0, eduYears: 4, enroll: { level: "university", pick: "fit" } };
    case "enrollGraduate":
      return { flags: { education: "graduate" }, eduYears: 2, enroll: { level: "graduate" } };
    case "buyHome":
      return { buyHome: "best" };
    case "addChild":
      return { addChild: true, intense: 6 };
    case "startDating":
      return { flags: { partner: "dating" } };
    case "marry":
      return { flags: { partner: "married" } };
    default:
      return {};
  }
}

function customEffect(c: CustomOption): Effect {
  const base: Effect = { text: c.outcome, stats: c.stats, ...(c.money ? { wealth: c.money } : {}), ...changeEffect(c.change, c) };
  if (c.chance >= 0.99) return base;
  return { text: "", risk: { chance: () => c.chance, success: base, failure: { text: c.failure || "생각대로 되지는 않았다.", stats: { happiness: -4 } } } };
}

const THEME_SET = new Set<Theme>(["career", "study", "family", "love", "risk", "money", "health", "leisure"]);
const CATEGORY_SET = new Set<Category>(["daily", "relation", "work", "money", "health", "era", "chance"]);

/** The big changes a narrator-written moment may make: none for a pool moment it rewrites, since those stay small. */
export const momentChanges = (s: LifeState): CustomChange[] => (s.pending?.slot ? ["none"] : allowedChanges(s));

/**
 * Turns the AI's moment into a choice, dropping changes that don't fit this life, options that contradict it,
 * and capping every number. Null when too little is left; the caller then plays the pool's version (slotFallback).
 */
export function fillMoment(state: LifeState, key: string, res: MomentResult): LifeState | null {
  if (!state.pending || pendingKeyOf(state) !== key) return null;
  const s = clone(state);
  const slot = s.pending!.slot;
  if (contradicts(s, res.title, res.scene)) return null;
  const rng = new Rng(s.rng ^ 0x9e37);
  const allowed = new Set(momentChanges(s));
  const yearPay = Math.max(s.income * 12, 3000);
  const cap = Math.max(800, Math.abs(s.wealth) * 0.4, yearPay * 1.5);
  // A rare moment may bring in as much as the pool's own version of it (a lottery win), never more.
  const poolMoney = slot && s.pending!.rare ? Math.abs(eventById(s.pending!.eventId)?.effect?.wealth ?? 0) : 0;
  const gainCap = Math.max(cap * 0.5, poolMoney);
  const options: PendingOption[] = [];
  const custom: Record<string, CustomOption> = {};
  for (const o of res.options.slice(0, 4)) {
    if (!o.label?.trim() || !o.outcome?.trim()) continue;
    // An option built on a change this life can't make (a baby for someone single) contradicts the state: drop it.
    const change = (o.change ?? "none") as CustomChange; // a pool moment's reply has no change field: it changes nothing big
    if (!allowed.has(change)) continue;
    if (contradicts(s, o.label, o.outcome, o.failure)) continue;
    const stats: Partial<Stats> = {};
    for (const k of ["health", "happiness", "knowledge", "relationships"] as StatKey[]) {
      const v = Math.round(o.stats?.[k] ?? 0);
      if (v) stats[k] = Math.max(-10, Math.min(10, v));
    }
    const id = String(options.length);
    const c: CustomOption = {
      outcome: o.outcome.trim().slice(0, 200),
      stats,
      money: Math.round(Math.max(-cap, Math.min(gainCap, o.money || 0)) / 10) * 10,
      change,
      chance: Math.max(0.15, Math.min(1, o.chance ?? 1)),
      failure: (o.failure || "").trim().slice(0, 160),
    };
    const place = o.place?.trim().slice(0, 30);
    if (change === "startBusiness") {
      c.title = (o.jobTitle?.trim() || businessTitle(`${o.label} ${o.outcome}`)).slice(0, 20);
      if (place) c.place = place;
    }
    // The narrator may pick the employer, but a reach for a top league is a gamble for someone who isn't ready.
    const tier = place && (change === "hire" || (change === "switchJob" && employee(s.flags))) ? (tierOf(place) ?? guessTier(place)) : undefined;
    if (tier && ["large", "it", "foreign"].includes(tier) && s.stats.knowledge < 65) c.chance = Math.min(c.chance, 0.5);
    custom[id] = c;
    const effect = customEffect(c);
    let plan = planFor(effect, s, rng);
    if (plan && tier) plan = { ...plan, place, tier, salary: clampPay(tier, o.salary, plan.salary, yearsWorked(s)) };
    if (plan && place && !tier && plan.kind === "enroll") plan = withPlace(plan, place);
    if (plan?.kind === "switch" && plan.salary !== undefined) plan.salary = Math.max(plan.salary, Math.round((plan.from ?? 0) * 1.03));
    const theme = THEME_SET.has(o.theme as Theme) ? (o.theme as Theme) : effectTheme(effect);
    options.push({ id, label: o.label.trim().slice(0, 40), theme, ...(plan ? { plan, detail: planDetail(plan) } : {}) });
  }
  if (options.length < 2) return null;
  // Rarity is the engine's: only a moment it rolled as rare (1% a year at most) is shown as one.
  const rare = !!s.pending!.rare;
  const tone = res.tone?.trim().slice(0, 8) || undefined;
  s.pending = {
    ...s.pending!,
    title: res.title.trim().slice(0, 24) || s.pending!.title,
    scene: res.scene.trim() || s.pending!.scene,
    options,
    custom,
    ...(rare ? { rare } : {}),
    ...(tone ? { tone } : {}),
  };
  delete s.pending.slot;
  const keywords = (res.keywords ?? []).map((k) => k.trim().slice(0, 12)).filter(Boolean);
  noteRecent(s, CATEGORY_SET.has(res.type as Category) ? res.type : "daily", keywords.length ? keywords : [s.pending.title], tone);
  const last = s.log.at(-1);
  if (last?.kind === "event" && last.mi === s.mi && last.text === state.pending.title) last.text = s.pending.title;
  // The follow-up this moment was asked to tell is told; a new one waits 6-18 months.
  closeThread(s);
  addThread(s, res.followUp, 6 + Math.floor(rng.next() * 13));
  stockEpisodes(s, res.episodes);
  return s;
}

/**
 * Plays the pool's version of a moment the narrator didn't write (or wrote in a way that contradicts the life):
 * its own options, or for a rare passive moment its own outcome.
 */
export function slotFallback(state: LifeState, key: string): LifeState {
  if (!state.pending?.slot || pendingKeyOf(state) !== key) return state;
  const s = clone(state);
  const ev = eventById(s.pending!.eventId);
  if (ev) noteRecent(s, eventCategory(ev), ev.keywords ?? [ev.title]);
  if (s.pending!.options.length) {
    delete s.pending!.slot;
    return s;
  }
  // A rare moment with no choices in the pool: it happens as written there.
  const last = s.log.at(-1);
  if (last?.kind === "event" && last.mi === s.mi && last.text === s.pending!.title) s.log.pop();
  s.pending = null;
  if (ev?.effect) {
    const rng = new Rng(s.rng);
    const applied = applyTop(s, ev.effect, rng);
    s.log.push({ mi: s.mi, kind: "event", ...applied, rare: true });
    noteRare(s, ev.title, applied.text);
    s.rng = rng.state;
  }
  return s;
}

/** Keeps a salary the narrator named within what that league pays someone with this much experience. */
function clampPay(tier: CompanyTier, salary: number | undefined, fallback: number | undefined, years = 0): number | undefined {
  if (!salary || salary <= 0) return fallback;
  const [lo, hi] = SALARY[tier] ?? SALARY.mid;
  const top = Math.min(payCap(tier), hi * Math.min(1.7, 1 + 0.035 * years) * 1.15);
  return Math.round(Math.max(lo * 0.9, Math.min(top, salary)) / 50) * 50;
}

/** Renames the company or school in a plan, keeping pay within that kind of employer's range. */
function withPlace(plan: OptionPlan, place: string, salary?: number): OptionPlan {
  if (plan.kind === "enroll") {
    const level = /대학원/.test(place) ? "graduate" : /박사|미국|영국|독일|일본|해외/.test(place) ? "abroad" : "university";
    return { ...plan, place, tuition: tuitionFor(place, level) };
  }
  const tier = (tierOf(place) ?? plan.tier) as CompanyTier;
  // A renamed employer must stay in the same league as the one the engine picked.
  if (tierOf(place) && tierOf(place) !== plan.tier) return plan;
  const pay = clampPay(tier, salary, plan.salary);
  return { ...plan, place, tier, salary: plan.kind === "switch" ? Math.max(pay ?? 0, plan.from ?? 0) : pay };
}

/** Applies the narrator's rewrite of a fixed event: scene, labels and (optionally) a more fitting company or school name. */
export function fillScene(state: LifeState, key: string, res: SceneResult): LifeState {
  if (!state.pending || pendingKeyOf(state) !== key) return state;
  const byId = new Map(res.labels.map((l) => [l.id, l]));
  const options = state.pending.options.map((o) => {
    const r = byId.get(o.id);
    if (!r) return o;
    const place = r.place?.trim().slice(0, 30);
    const plan = o.plan && place && o.plan.kind !== "cost" && o.plan.kind !== "home" ? withPlace(o.plan, place) : o.plan;
    return { ...o, label: r.label?.trim() || o.label, plan, detail: planDetail(plan) };
  });
  const s: LifeState = { ...state, pending: { ...state.pending, scene: res.scene || state.pending.scene, options } };
  if (res.episodes?.length) stockEpisodes(s, res.episodes);
  return s;
}

export const pendingKeyOf = (s: LifeState) => (s.pending ? `${s.pending.eventId}@${s.mi}` : null);

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
    // Kids cost about 70만원 a month until 19, plus university tuition (900만원 a year) from 19 to 22.
    const kidAges = f.kidsBorn?.length === f.children ? f.kidsBorn.map((b) => (s.mi - b) / 12) : Array(f.children).fill(10);
    const kids = kidAges.reduce((sum, a) => sum + (a < 19 ? 70 : a < 23 ? 75 : 0), 0);
    const interest = f.homeOwner && f.mortgage ? (f.mortgage * MORTGAGE_RATE) / 12 : 0;
    const living = 215 + kids + (f.homeOwner ? 0 : 50) + interest;
    const student = f.education === "university" || f.education === "graduate" || f.education === "highschool";
    const share = f.employed ? 1 : student ? 0.2 : 0.8; // students lean on family support
    s.wealth += Math.round((s.income - living * share) * months);
    // Repaying principal moves cash into the home, so net worth doesn't change; only the loan shrinks.
    if (f.mortgage) f.mortgage = Math.max(0, Math.round(f.mortgage - Math.max(30, f.mortgage / 240) * months));
  }
  // Tuition while enrolled; parents cover half until 24.
  const enrolled = (f.education === "university" || f.education === "graduate") && s.mi <= f.eduUntil;
  if (enrolled && f.tuition) s.wealth -= Math.round((f.tuition / 12) * months * (age <= 24 ? 0.5 : 1));
  if (!enrolled && f.tuition) f.tuition = undefined;
  if (f.employed) f.workMonths = (f.workMonths ?? 0) + months;
  // Yearly raise.
  const yearTurned = Math.floor(s.mi / 12) !== Math.floor((s.mi - months) / 12);
  if (yearTurned && f.employed) s.income = Math.round(s.income * 1.015);
  if (f.retired && s.income === 0) s.income = 100;
  if (f.education === "graduate" && s.mi >= f.eduUntil + 24) f.education = "done";
  if (f.education === "school" && age >= 16) {
    f.education = "highschool";
    f.school = s.profile.high.trim() || undefined;
  }
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

/** The routine line for a quiet turn. A working life sometimes shows its job and pay as chips instead. */
function statusLine(s: LifeState, rng: Rng): Pick<LogEntry, "text" | "facts"> {
  const f = s.flags;
  if (f.employed && !f.retired && f.education === "done" && s.mi >= f.busyUntil && f.company && rng.chance(0.3)) {
    if (ownsBusiness(f)) return { text: "가게 문을 열고 닫는 하루가 이어졌다.", facts: [`${f.company} ${f.job}`, `월수입 ${won(s.income)}`] };
    return { text: "출퇴근이 이어졌다.", facts: [`${f.company} ${f.job}`, `연봉 ${won(s.income * 12)}`] };
  }
  return { text: statusSentence(s, rng) };
}

function statusSentence(s: LifeState, rng: Rng): string {
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
  if (ownsBusiness(f)) {
    const since = s.marks?.venture;
    if (f.company && since !== undefined && rng.chance(0.15)) return `${eulReul(f.company)} 연 지 ${Math.max(1, Math.round((s.mi - since) / 12))}년이 되어 갔다.`;
    if (kidsUnder(s, 13)) return pick(`${withRo(f.job)} 일하며 ${f.children > 1 ? `아이 ${f.children}명을` : "아이를"} 키웠다.`, "문 닫고 돌아오면 아이는 벌써 잠들어 있었다.");
    if (f.partner === "married") return pick(`${withRo(f.job)} 일하며 배우자와 하루를 나눴다.`, "쉬는 날이면 배우자와 장을 보러 갔다.");
    return pick(`${withRo(f.job)} 하루하루를 꾸렸다.`, "손님이 많은 날도, 파리만 날리는 날도 있었다.", "밤마다 장부를 펴고 이번 달 매출을 계산했다.", "쉬는 날 없이 일하는 주가 이어졌다.");
  }
  if (f.employed) {
    if (f.company && rng.chance(0.15)) return `${f.company}에서의 ${Math.max(1, yearsWorked(s))}년 차가 흘러갔다.`;
    if (kidsUnder(s, 13)) return pick(`${withRo(f.job)} 일하며 ${f.children > 1 ? `아이 ${f.children}명을` : "아이를"} 키웠다.`, "퇴근하면 육아로 두 번째 출근을 했다.", "주말이면 아이 손을 잡고 놀이공원에 갔다.");
    if (f.children > 0) return pick(`${withRo(f.job)} 일하며 가족을 꾸렸다.`, "아이 학원비 고지서를 보며 한숨을 쉬었다.", "다 큰 아이와 어색한 저녁을 먹었다.");
    if (f.partner === "married") return pick(`${withRo(f.job)} 일하며 배우자와 하루를 나눴다.`, "주말이면 배우자와 장을 보러 갔다.");
    if (f.pet) return pick(`${withRo(f.job)} 출퇴근을 반복했다.`, "퇴근하면 반려동물이 현관에서 기다렸다.");
    return pick(`${withRo(f.job)} 출퇴근을 반복했다.`, "월요병과 불금 사이를 오갔다.", "점심 메뉴 고르는 게 하루의 고민이었다.", "월급날을 손꼽아 기다렸다.");
  }
  return pick("다음 일을 고민하며 시간을 보냈다.", "채용 공고를 뒤적이며 하루를 보냈다.");
}

/** Appends 로 or 으로 to a Korean noun, by its final consonant. */
function withRo(word: string): string {
  // Read past a closing bracket ("배달의민족(우아한형제들)" ends on 들); Latin letters and digits by how they're said.
  const tail = word.replace(/\)+$/, "").trim();
  const last = tail.at(-1) ?? "";
  const code = last.charCodeAt(0) - 0xac00;
  if (code >= 0 && code <= 11171) {
    const final = code % 28;
    return final === 0 || final === 8 ? `${word}로` : `${word}으로`;
  }
  if (/[LlRr17８8]/.test(last)) return `${word}로`;
  if (/[MmNn0369]/.test(last)) return `${word}으로`;
  return /[A-Za-z245]/.test(last) ? `${word}로` : `${word}(으)로`;
}

/** Appends 을 or 를 to a Korean noun, by its final consonant. */
function eulReul(word: string): string {
  const code = (word.replace(/\)+$/, "").trim().at(-1) ?? "").charCodeAt(0) - 0xac00;
  if (code >= 0 && code <= 11171) return `${word}${code % 28 === 0 ? "를" : "을"}`;
  return `${word}을(를)`;
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
    const applied = applyTop(s, impact, rng);
    return { mi: s.mi, kind: "news", tag, ...applied, text: x.text, reaction: applied.text };
  });
}

function eventChance(ev: EventDef, s: LifeState, months: number): number {
  let perYear = typeof ev.perYear === "function" ? ev.perYear(s) : ev.perYear;
  // Temperament and past choices: someone who keeps choosing work meets more work moments, and so on.
  // Life-stage forks that are due anyway (exams, graduation) are left alone.
  if (perYear < 0.85) perYear *= Math.max(0.5, 1 + relativeAffinity(s, eventTheme(ev)) * 1.5);
  // Temperament: an outgoing person meets more gatherings, a careful one fewer scams, and so on.
  perYear *= temperFactor(s, ev.temper ?? ID_TEMPER[ev.id]);
  // Rare stays rare: never more than 1% a year, whatever the leanings.
  if (ev.rare) perYear = Math.min(0.01, perYear);
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, perYear)), months / 12);
}

function eligible(ev: EventDef, s: LifeState, age: number): boolean {
  if (age < ev.minAge || age > ev.maxAge) return false;
  if (ev.once && s.done.includes(ev.id)) return false;
  if ((s.cooldowns[ev.id] ?? -1) > s.mi) return false;
  if (ev.when && !ev.when(s, age)) return false;
  if (ev.choices && s.mi < s.flags.busyUntil) return false;
  // Nothing happens more than three times in a life, apart from life-stage events that must come back.
  if (!ev.repeatable && (s.counts?.[ev.id] ?? 0) >= MAX_REPEATS) return false;
  // Small dilemmas share one clock, so they come about once every year or two.
  if (ev.small && (s.cooldowns[SMALL_CLOCK] ?? -1) > s.mi) return false;
  return true;
}

const MAX_REPEATS = 3;
const SMALL_CLOCK = "small-dilemma";
const SMALL_GAP = 12; // months

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
      if (ev.small) s.cooldowns[SMALL_CLOCK] = s.mi + SMALL_GAP;
      s.counts = { ...s.counts, [ev.id]: (s.counts?.[ev.id] ?? 0) + 1 };
      happened = true;
      // Hybrid: the pool picked the moment; the narrator may write it for this life (see hybrid.ts).
      const slot = hybridOn(s) && aiWritable(ev);
      if (ev.choices) {
        s.pending = pendingFor(ev, s, rng);
        // The pool's options stay as the fallback; the moment is noted as recent once it is known which one plays.
        if (slot) s.pending.slot = true;
        else if (ev.id !== "personal") noteRecent(s, eventCategory(ev), ev.keywords ?? [ev.title]);
        entries.push({ mi: s.mi, kind: "event", text: ev.title });
        stop = "choice";
        break;
      }
      if (ev.effect && slot && ev.rare) {
        // A rare moment the engine rolled (still 1% a year at most) is written for this life and asked as a choice.
        s.pending = { eventId: ev.id, title: ev.title, scene: labelOf(ev.intro, s), options: [], freeText: false, rare: true, slot: true };
        entries.push({ mi: s.mi, kind: "event", text: ev.title });
        stop = "choice";
        break;
      }
      const episode = ev.effect && slot ? takeEpisode(s) : null;
      if (episode) {
        const applied = applyTop(s, { text: episode.text, stats: episode.stats, ...(episode.money ? { wealth: episode.money } : {}) }, rng);
        entries.push({ mi: s.mi, kind: "event", ...applied });
        noteRecent(s, episode.type, episode.keywords.length ? episode.keywords : [episode.title]);
        passive = true;
        continue;
      }
      if (ev.id !== "personal") noteRecent(s, eventCategory(ev), ev.keywords ?? [ev.title]);
      if (ev.effect) {
        const applied = applyTop(s, ev.effect, rng);
        entries.push({ mi: s.mi, kind: "event", ...applied, ...(ev.rare ? { rare: true } : {}) });
        if (ev.rare) noteRare(s, ev.title, applied.text);
        passive = true;
      }
    }
    if (!happened) {
      // Keep only the latest routine line between notable entries so the feed stays readable.
      const last = s.log.at(-1);
      if (last?.kind === "turn" && entries.length === 0) s.log.pop();
      entries.push({ mi: s.mi, kind: "turn", ...statusLine(s, rng) });
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

// Life forks from the main event list: where to study, work, live, whom to marry, whether to have a child.
const BIG_EVENTS = new Set(["csat", "military", "graduation", "grad-done", "job-search", "job-offer", "startup-itch", "layoff", "retirement", "marriage", "baby", "marriage-crisis", "house"]);

/** A choice big enough that auto-decide stops and asks, and that gets a moment of its own on screen. */
export function isBigChoice(p: PendingChoice): boolean {
  if (p.small) return false;
  return !!p.rare || p.eventId === TURNING_POINT_ID || BIG_EVENTS.has(p.eventId);
}

/** Picks an option for auto-decide mode: weighted toward the first listed choices and toward what this person leans to. */
export function autoPick(s: LifeState): string | null {
  if (!s.pending || s.pending.options.length === 0) return null;
  const rng = new Rng(s.rng ^ 0x5bd1e995);
  const opts = s.pending.options;
  const weights = opts.map((o, i) => (1 / (i + 1)) * (1 + (o.theme ? affinity(s, o.theme) * 2 : 0)));
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
  else if (f.education === "school") parts.push(lifeStage(ageOf(s)) || "학생");
  else if (f.education === "highschool") parts.push("고등학생");
  else if (f.education === "university") parts.push(f.school ? `${f.school} 재학` : "대학생");
  else if (f.education === "graduate") parts.push(f.school ? `${f.school} 재학` : "대학원생");
  else if (f.retired) parts.push("은퇴");
  else if (ownsBusiness(f)) parts.push(f.company ? `${f.job}(${f.company})` : f.job);
  else if (f.employed) parts.push(f.company && !f.job.includes(f.company) ? `${f.company} ${f.job}` : f.job);
  else parts.push("구직 중");
  const partner = { none: "", dating: "연애 중", married: "기혼", divorced: "이혼", widowed: "사별" }[f.partner];
  if (partner) parts.push(partner);
  if (f.children > 0) parts.push(`자녀 ${f.children}명`);
  if (f.homeOwner) parts.push(f.homeArea ? `자가(${f.homeArea})` : "자가");
  return parts.join(" · ");
}

/** Pay as a person would say it: yearly salary at work, monthly otherwise. */
export function payLabel(s: LifeState): string {
  if (s.income <= 0) return "";
  if (s.flags.employed && !s.flags.retired && !ownsBusiness(s.flags)) return `연봉 ${won(s.income * 12)}`;
  return `월 ${won(s.income)}`;
}

/** Plain facts about this life right now, for the narrator. Everything it writes must agree with these. */
export function lifeFacts(s: LifeState): string {
  const f = s.flags;
  const age = ageOf(s);
  const kidAges = (f.kidsBorn ?? []).map((b) => Math.floor((s.mi - b) / 12));
  const study =
    f.education === "school" ? `${lifeStage(age) || "학생"}${f.school ? ` (${f.school})` : ""}. 대학·취업·연애·결혼은 아직 해당 없음` : f.education === "highschool" ? "고등학생" : f.education === "university" ? `대학 재학 (${f.school || "학교 미정"}${s.profile.major ? `, ${s.profile.major}` : ""})` : f.education === "graduate" ? `대학원 재학 (${f.school || "학교 미정"})` : `학업 마침${f.school ? ` (최종 ${f.school})` : ""}`;
  const since = s.marks?.venture !== undefined ? Math.max(0, s.mi - s.marks.venture) : null;
  const work = f.retired
    ? `은퇴함, 연금 월 ${won(s.income)}`
    : ownsBusiness(f)
      ? `자영업: ${f.job}${f.company ? `, ${f.company} 운영` : ""}${since !== null ? ` (시작한 지 ${since < 12 ? `${since}개월` : `${Math.floor(since / 12)}년`})` : ""}, 월수입 ${won(s.income)}. 회사에 다니지 않으므로 상사·회식·승진·육아휴직·이직 제안·희망퇴직 같은 직장 이야기는 해당 없음`
      : f.employed
      ? `${f.company ? `${f.company} ` : ""}${f.job}로 일하는 중, ${payLabel(s)}, 경력 ${yearsWorked(s)}년`
      : f.education === "done" && age >= 18
        ? "일자리 없음 (구직 중). 회사에 다니지 않으므로 휴직·승진·회사 이야기는 해당 없음"
        : "아직 일하지 않음";
  const partner = { none: "미혼, 연인 없음", dating: "연애 중 (미혼)", married: "기혼", divorced: "이혼 후 혼자", widowed: "배우자와 사별" }[f.partner];
  const kids = f.children ? `${f.children}명 (${kidAges.length === f.children ? kidAges.map((a, i) => `${ORDINAL[i + 1] ?? `${i + 1}째`} ${a}세`).join(", ") : "나이 미상"})` : f.noKids ? "없음, 갖지 않기로 함" : "없음";
  const home = f.homeOwner ? `자가 (${f.homeArea || "지역 미상"}${f.homeValue ? `, 시세 ${won(f.homeValue)}` : ""}${f.mortgage ? `, 대출 잔액 ${won(f.mortgage)}` : ""})` : "무주택 (전세나 월세)";
  return [
    `시점: ${formatMi(s.mi)}, ${age}세 (${s.profile.gender || "성별 미입력"})`,
    `성향: ${s.profile.mbti || "MBTI 미입력"}. ${s.profile.personality || ""}`.trim(),
    `학업: ${study}`,
    `일: ${work}`,
    `연애·결혼: ${partner}`,
    `자녀: ${kids}`,
    `집: ${home}`,
    `순자산: ${formatWealth(s.wealth)}`,
    `능력치: 건강 ${s.stats.health}, 행복 ${s.stats.happiness}, 지식 ${s.stats.knowledge}, 관계 ${s.stats.relationships}`,
    s.flags.pet ? "반려동물과 함께 삶" : "",
  ]
    .filter(Boolean)
    .join("\n");
}


/** A compact summary of the life so far, passed to the narrator. */
export function lifeSummary(s: LifeState, recent = 12): string {
  const age = ageOf(s);
  const lines = [
    `현재 ${formatMi(s.mi)}, ${age}세. 상태: ${statusLabel(s)}.`,
    lifeFacts(s),
    `인생 이력 (이미 일어난 사실, 시간순): ${(s.memory ?? []).join(" / ") || "없음"}`,
    `지금까지의 주요 선택: ${s.choices.map((c) => `${c.age}세 ${c.title} → ${c.picked}`).join(" / ") || "없음"}`,
    `최근 기록: ${s.log
      .filter((l) => l.kind !== "turn" && l.kind !== "news")
      .slice(-recent)
      .map((l) => `[${formatMi(l.mi)}] ${l.text.slice(0, 120)}`)
      .join(" / ")}`,
  ];
  return lines.join("\n");
}
