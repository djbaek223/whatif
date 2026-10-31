// Hybrid events. Big forks (exams, jobs, marriage, children, retirement), era events and news play from the
// hand-written pool. Everyday moments, small dilemmas, follow-ups and rare moments are written by the narrator
// for this life, inside the same call that already writes each choice scene.
// The pool still decides *when* something happens (age, conditions, odds, cooldowns, the 1%/yr cap on rare);
// the narrator only decides *what*. Whenever it can't, or what it wrote contradicts the life, the pool plays as written.
import { US_CORE_EVENTS } from "../regions/us/events";
import { CORE_EVENTS, ageOf, type Effect, type EventDef } from "./events";
import { STORY_FORKS } from "./storyEvents";
import { eventCategory } from "./personal";
import type { Category, Episode, LifeState, StatKey, Stats } from "./types";
import { timelineConflict } from "./timeline";
import { anachronism } from "./period";
import { ownsBusiness } from "./work";
import { L } from "./i18n";

const CORE = new Set([...CORE_EVENTS, ...STORY_FORKS, ...US_CORE_EVENTS].map((e) => e.id));

/** A life fork or life-stage event, which always plays as written. */
export const isCore = (ev: EventDef) => CORE.has(ev.id);

// Milestones the engine tracks by date (a child turning 7, a grandchild) and the later steps of pool chains,
// which only follow a pool event that already happened. These stay as written.
const POOL_ONLY = new Set([
  "kid-first", "kid-school", "kid-middle-school", "kid-adult", "kid-csat", "kid-leaves", "kid-job", "kid-wedding-fund",
  "grandkid-care", "grandkid-school", "army-life", "parents-70", "sibling-wedding", "spouse-surgery", "will",
  "inheritance", "biz-offer", "biz-result", "venture-result", "lend-return", "channel-grow", "channel-sponsor",
  "mentor-call", "crew-love", "crew-friends",
]);

/** An effect that changes the life for good (job, school, partner, home, pay). Those belong to the engine. */
function lasting(e: Effect | undefined): boolean {
  if (!e) return false;
  if (e.flags || e.hire || e.switchJob || e.promote || e.enroll || e.buyHome || e.startBusiness || e.addChild) return true;
  if (e.income !== undefined || e.incomePct || e.eduYears || e.busyMonths || e.homeValuePct || e.enlist || e.retake) return true;
  return lasting(e.risk?.success) || lasting(e.risk?.failure);
}

/** Whether the narrator writes this event for the life instead of playing the pool's version. */
export function aiWritable(ev: EventDef): boolean {
  if (isCore(ev) || POOL_ONLY.has(ev.id) || eventCategory(ev) === "era") return false;
  return !lasting(ev.effect) && !(ev.choices ?? []).some((c) => lasting(c.effect));
}

/** Hybrid is on for AI lives unless switched off (NEXT_PUBLIC_WHATIF_HYBRID=0 sets life.hybrid = false). */
export const hybridOn = (s: LifeState) => !!s.ai && s.hybrid !== false;

// ── Contradictions ─────────────────────────────────────

const OFFICE = /출근|퇴근|상사|팀장님|부장님|과장님|회식|승진|연봉|야근|사내|입사 동기|회사 일|회사에서|\b(commute|my boss|your boss|the boss|manager|promotion|salary|overtime|coworkers?|office party|at the office|at work)\b/i;
const BOSSED = /상사|팀장님|부장님|과장님|회식|승진|연봉|사내|입사 동기|\b(my boss|your boss|the boss|manager|promotion|salary|coworkers?|office party)\b/i;
const SHOP = /우리 가게|내 가게|가게 매출|매출이|단골손님|\b(my shop|your shop|my store|your store|sales were|regulars)\b/i;
const SPOUSE = /남편|아내|배우자|시댁|처가|시어머니|시아버지|장모|장인어른|결혼기념일|신혼|\b(husband|wife|spouse|in-laws|mother-in-law|father-in-law|anniversary|newlyweds?)\b/i;
const LOVER = /(?<!옛 |전 |전\s?)(연인|여자\s?친구|남자\s?친구|애인)|(?<!\b(ex|old|former)[- ])\b(girlfriend|boyfriend)\b/i;
const KIDS = /우리 아이|아이들|아들|딸아이|딸이|딸과|딸의|딸에게|자녀|육아|첫째|둘째|\b(your kids?|the kids|my kids?|your son|your daughter|my son|my daughter|children|parenting|toddler)\b/i;
const OWN_HOME = /우리 집 시세|집값이 (올|뛰|떨|내)|주택담보|내 집의|\b(your house is worth|home value|mortgage payment|your mortgage)\b/i;
const ADULT = /술자리|소주|맥주|와인|결혼|운전|출근|월급|\b(drinks|beer|wine|bar|married|driving|commute|paycheck)\b/i;

/**
 * What in the text can't be true of this life right now, or null when nothing is off.
 * The prompt already asks the narrator to keep to the facts; this is the engine's own check, so a slip never reaches the player.
 */
export function conflictIn(text: string, s: LifeState): string | null {
  const f = s.flags;
  if (!f.employed || f.retired ? OFFICE.test(text) : ownsBusiness(f) && BOSSED.test(text)) return L("회사");
  if (!ownsBusiness(f) && SHOP.test(text)) return L("가게");
  if (f.partner !== "married" && SPOUSE.test(text)) return L("배우자");
  if (f.partner !== "dating" && f.partner !== "married" && LOVER.test(text)) return L("연인");
  if (f.children === 0 && KIDS.test(text)) return L("자녀");
  if (!f.homeOwner && OWN_HOME.test(text)) return L("자가");
  if (ageOf(s) < 19 && ADULT.test(text)) return L("나이");
  return timelineConflict(text, s) ?? anachronism(text, Math.floor(s.mi / 12));
}

/** conflictIn over several pieces of text at once. */
export const contradicts = (s: LifeState, ...texts: (string | undefined)[]) => conflictIn(texts.filter(Boolean).join("\n"), s);

// ── Everyday moments written ahead ─────────────────────

const QUEUE_MAX = 4;
const QUEUE_LIFE = 24; // months an episode stays usable
export const EPISODES_PER_CALL = 3;

/** The facts an episode was written against. When any of them changes (a new job, a marriage, a child), the queue is dropped. */
export function stateKey(s: LifeState): string {
  const f = s.flags;
  return [f.employed, f.retired, ownsBusiness(f), f.job, f.company ?? "", f.education, f.school ?? "", f.partner, f.children, f.homeOwner, f.pet ?? false].join("|");
}

const queueFits = (s: LifeState) => !!s.episodes && s.episodes.key === stateKey(s) && s.mi - s.episodes.born <= QUEUE_LIFE;

/** Episodes still true of this life. Clears the queue when the life has changed since they were written. */
export function freshEpisodes(s: LifeState): Episode[] {
  if (!queueFits(s)) delete s.episodes;
  return s.episodes?.items ?? [];
}

/** Whether the next call should also write everyday moments: only when the queue is running low. */
export const wantsEpisodes = (s: LifeState) => hybridOn(s) && (queueFits(s) ? s.episodes!.items.length : 0) < 2;

const CATEGORIES = new Set<Category>(["daily", "relation", "work", "money", "health", "chance"]);

export interface RawEpisode {
  title: string;
  type: string;
  text: string;
  stats: Partial<Record<StatKey, number>>;
  money: number;
  keywords: string[];
}

/** Checks and caps the narrator's episodes, then queues them for the coming months. */
export function stockEpisodes(s: LifeState, raw: RawEpisode[] | undefined) {
  if (!raw?.length) return;
  const age = ageOf(s);
  const room = age < 19 ? 30 : Math.max(50, Math.min(300, Math.round(Math.max(0, s.wealth) * 0.03)));
  const items: Episode[] = [];
  for (const e of raw.slice(0, EPISODES_PER_CALL)) {
    const text = e.text?.trim().slice(0, 160);
    if (!text || contradicts(s, e.title, text)) continue;
    const stats: Partial<Stats> = {};
    for (const k of ["health", "happiness", "knowledge", "relationships"] as StatKey[]) {
      const v = Math.round(e.stats?.[k] ?? 0);
      if (v) stats[k] = Math.max(-4, Math.min(4, v));
    }
    items.push({
      title: (e.title?.trim() || text.slice(0, 12)).slice(0, 20),
      type: CATEGORIES.has(e.type as Category) ? (e.type as Category) : "daily",
      text,
      stats,
      money: Math.round(Math.max(-room, Math.min(room, e.money || 0)) / 10) * 10,
      keywords: (e.keywords ?? []).map((k) => k.trim().slice(0, 12)).filter(Boolean).slice(0, 3),
    });
  }
  if (!items.length) return;
  s.episodes = { key: stateKey(s), born: s.mi, items: [...freshEpisodes(s), ...items].slice(-QUEUE_MAX) };
}

/** The next everyday moment written for this life, or null when none is left that still fits. */
export function takeEpisode(s: LifeState): Episode | null {
  const items = freshEpisodes(s);
  const next = items.shift();
  if (s.episodes && !items.length) delete s.episodes;
  return next ?? null;
}

// ── Follow-ups (chains) ────────────────────────────────

const THREADS_MAX = 3;
const THREAD_WAIT = 48; // months a follow-up waits for a moment to be told in before it is let go

/** Remembers how a moment could come back, due 6-18 months later. The engine decides when; the narrator what. */
export function addThread(s: LifeState, text: string | undefined, months: number) {
  const t = text?.trim().slice(0, 120);
  if (!t) return;
  s.threads = [...(s.threads ?? []), { text: t, due: s.mi + months }].slice(-THREADS_MAX);
}

/** The follow-up whose time has come, if any. Ones that waited too long are dropped. */
export function dueThread(s: LifeState): string | null {
  const live = (s.threads ?? []).filter((t) => s.mi - t.due <= THREAD_WAIT);
  return live.find((t) => t.due <= s.mi)?.text ?? null;
}

/** Marks the due follow-up as told. */
export function closeThread(s: LifeState) {
  const text = dueThread(s);
  s.threads = (s.threads ?? []).filter((t) => t.text !== text && s.mi - t.due <= THREAD_WAIT);
}
