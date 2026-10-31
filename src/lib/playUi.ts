// What the play screen is doing right now, and the facts its panels show, kept apart from the components so a
// script can check them (npm run check:play). Everything here reads the life as the engine left it: no number is
// made up for the screen.
import { formatWealth, payLabel, statusLabel, turningPointMi } from "./engine";
import { degreeTag } from "./education";
import { ageAt } from "./events";
import { L } from "./i18n";
import { STAT_LABELS, type LifeChapter, type LifeState, type StatKey } from "./types";

/**
 * One state for the screen instead of a handful of booleans:
 * - timeline: the story leads; the dock offers 다음 달로 and 선택까지 진행.
 * - progressing: time runs on its own until the next choice (or the next big one, with 선택도 맡기기); only 멈추기.
 * - decision: the choice sheet leads; the dock is gone.
 * - submitting-choice: the player's own words are being read; the sheet stays, its buttons wait.
 * - consequence: what the choice just changed, before the story carries on.
 * - present: the card comparing the real life with this one.
 * - ending: the life is over and the memoir is being written.
 */
export type LifeUiMode = "timeline" | "progressing" | "decision" | "submitting-choice" | "consequence" | "present" | "ending";

export interface ModeInput {
  dead: boolean;
  presentOpen: boolean;
  consequence: boolean; // a choice the player made has resolved and its result is not yet dismissed
  pending: boolean;
  big: boolean; // the pending choice is a big fork (engine isBigChoice)
  busy: boolean; // the player's own words are being read
  auto: boolean;
  autoDecide: boolean;
}

export function playMode(m: ModeInput): LifeUiMode {
  if (m.dead) return "ending";
  if (m.presentOpen) return "present";
  if (m.consequence) return "consequence";
  if (m.pending) {
    if (m.busy) return "submitting-choice";
    // With 선택도 맡기기 on, a small choice is picked for the player on the next tick: time keeps running.
    if (m.auto && m.autoDecide && !m.big) return "progressing";
    return "decision";
  }
  return m.auto ? "progressing" : "timeline";
}

/** Whether auto progress should stop at this choice and hand it to the player. */
export function stopsProgress(autoDecide: boolean, big: boolean): boolean {
  return !autoDecide || big;
}

/** The step button: "다음 달로", "3개월 뒤로", "1년 뒤로". */
export function stepLabel(months: number): string {
  if (months === 1) return L("다음 달로");
  if (months === 12) return L("1년 뒤로");
  return L`${months}개월 뒤로`;
}

/** "1년 3개월" */
export function spanName(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && L`${y}년`, m && L`${m}개월`].filter(Boolean).join(" ");
}

/** The degree as its own profile line, "학력 · 고졸", apart from the 지식 gauge. Nothing for a child. */
export function degreeLine(life: LifeState): string | undefined {
  const tag = degreeTag(life);
  return tag ? L`학력 · ${tag}` : undefined;
}

// ── Consequence ─────────────────────────────────────────

export interface LifeChange {
  label: string;
  from: string;
  to: string;
}

export interface StatChange {
  key: StatKey;
  label: string;
  from: number;
  to: number;
  diff: number;
}

export interface Consequence {
  mi: number;
  title: string; // the choice's title
  picked: string; // what the player chose, in their words or the option's
  story: string; // what happened, as the engine wrote it
  rare: boolean;
  changes: LifeChange[]; // status, pay and wealth, before → after
  events: string[]; // lasting changes the engine recorded (결혼, 첫째 아이 출생, 입학: ...)
  stats: StatChange[];
}

/**
 * What a choice changed, read from the life just before it was made and right after.
 * Null when no choice resolved in between (the sheet was dismissed, or the choice is still pending).
 */
export function consequenceOf(before: LifeState, after: LifeState): Consequence | null {
  if (after.choices.length <= before.choices.length) return null;
  const choice = after.choices[after.choices.length - 1];
  const added = after.log.slice(before.log.length);
  const outcomes = added.filter((e) => e.kind === "outcome");
  const changes: LifeChange[] = [];
  const sb = statusLabel(before);
  const sa = statusLabel(after);
  if (sb !== sa) changes.push({ label: L("상태"), from: sb, to: sa });
  const pb = payLabel(before);
  const pa = payLabel(after);
  if (pb !== pa) changes.push({ label: L("수입"), from: pb || L("없음"), to: pa || L("없음") });
  if (before.wealth !== after.wealth) changes.push({ label: L("자산"), from: formatWealth(before.wealth), to: formatWealth(after.wealth) });
  const db = degreeTag(before);
  const da = degreeTag(after);
  if (db !== da && da) changes.push({ label: L("학력"), from: db ?? L("없음"), to: da });
  const events = (after.chapters ?? []).filter((c) => c.at >= before.log.length).flatMap((c) => c.items);
  const stats = (Object.keys(STAT_LABELS) as StatKey[])
    .map((key) => ({ key, label: STAT_LABELS[key], from: before.stats[key], to: after.stats[key], diff: after.stats[key] - before.stats[key] }))
    .filter((c) => c.diff !== 0);
  return {
    mi: choice.mi,
    title: choice.title,
    picked: choice.picked,
    story: outcomes.map((e) => e.text).filter(Boolean).join("\n"),
    rare: outcomes.some((e) => e.rare),
    changes,
    events,
    stats,
  };
}

/** "+4", "-2" */
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// ── Milestones ──────────────────────────────────────────

export type MilestoneKind = "start" | "school" | "graduated" | "job" | "business" | "jobless" | "married" | "dating" | "breakup" | "divorced" | "widowed" | "child" | "home" | "retired" | "rare" | "choice" | "change" | "now";

export interface Milestone {
  mi: number;
  age: number;
  kind: MilestoneKind;
  text: string;
  major: boolean; // shown under 주요 사건; the rest only under 전체
}

const MAJOR = new Set<MilestoneKind>(["start", "school", "graduated", "job", "business", "married", "divorced", "widowed", "child", "home", "retired", "rare", "now"]);
const ORDER: MilestoneKind[] = ["retired", "business", "job", "school", "graduated", "married", "divorced", "widowed", "child", "home", "jobless", "breakup", "dating"];

export const MILESTONE_ICON: Record<MilestoneKind, string> = {
  start: "⟲",
  school: "🎓",
  graduated: "🎓",
  job: "💼",
  business: "🏪",
  jobless: "📭",
  married: "💍",
  dating: "💕",
  breakup: "💔",
  divorced: "📄",
  widowed: "🕯",
  child: "👶",
  home: "🏠",
  retired: "🌅",
  rare: "✦",
  choice: "◆",
  change: "•",
  now: "●",
};

function kindOf(c: LifeChapter): MilestoneKind {
  return ORDER.find((k) => c.tags?.includes(k)) ?? "change";
}

/**
 * The turns this life took, in order: where it started, each lasting change the engine recorded, rare moments,
 * and now. Lives saved before changes were kept for the screen fall back to the choices made.
 */
export function milestonesOf(life: LifeState): Milestone[] {
  const born = life.profile.birthDate;
  const at = (mi: number) => ageAt(born, mi);
  const start = turningPointMi(life.turningPoint);
  const out: Milestone[] = [{ mi: start, age: at(start), kind: "start", text: L("변곡점에서 다시 시작"), major: true }];
  if (life.chapters?.length) {
    for (const c of life.chapters) {
      const kind = kindOf(c);
      out.push({ mi: c.mi, age: at(c.mi), kind, text: c.items.join(", "), major: MAJOR.has(kind) });
    }
  } else {
    for (const c of life.choices.slice(1)) out.push({ mi: c.mi, age: c.age, kind: "choice", text: L`${c.title}: ${c.picked}`, major: true });
  }
  for (const r of life.rares ?? []) out.push({ mi: r.mi, age: r.age, kind: "rare", text: r.title, major: true });
  if (!life.dead) out.push({ mi: life.mi, age: at(life.mi), kind: "now", text: L`지금 · ${statusLabel(life)}`, major: true });
  return out.sort((a, b) => a.mi - b.mi);
}

/** At most `n` milestones for a summary or a share card: the big ones, spread over the life. */
export function keyMilestones(life: LifeState, n: number): Milestone[] {
  const big = milestonesOf(life).filter((m) => m.major && m.kind !== "now" && m.kind !== "start");
  if (big.length <= n) return big;
  return Array.from({ length: n }, (_, i) => big[Math.round((i * (big.length - 1)) / (n - 1))]);
}

/** The month a date marker in the feed stands for, as an element id, so a milestone can scroll to it. */
export const markerId = (mi: number) => `t-${mi}`;

/** The first date marker at or after this month (a change can come in a month that logged nothing else). */
export function markerFor(mi: number, marks: number[]): number | null {
  let best: number | null = null;
  for (const m of marks) if (m >= mi && (best === null || m < best)) best = m;
  return best ?? (marks.length ? Math.max(...marks) : null);
}

// ── Summary and share card ──────────────────────────────

export interface LifeSummaryFacts {
  name: string;
  bornYear: number;
  lastYear: number;
  years: number; // years lived in this branch, from the turning point
  age: number;
  status: string;
  degree?: string;
  wealth: string;
  work: string[]; // job changes, in order
  family: string[]; // partner and children changes, in order
  milestones: Milestone[];
}

const WORK = new Set<MilestoneKind>(["job", "business", "jobless", "retired"]);
const FAMILY = new Set<MilestoneKind>(["married", "divorced", "widowed", "child", "dating", "breakup"]);

export function summaryOf(life: LifeState): LifeSummaryFacts {
  const all = milestonesOf(life);
  const start = turningPointMi(life.turningPoint);
  return {
    name: life.profile.name || L("나"),
    bornYear: Number(life.profile.birthDate.slice(0, 4)),
    lastYear: Math.floor(life.mi / 12),
    years: Math.max(0, Math.floor((life.mi - start) / 12)),
    age: life.deathAge ?? ageAt(life.profile.birthDate, life.mi),
    status: statusLabel(life),
    degree: degreeTag(life),
    wealth: formatWealth(life.wealth),
    work: all.filter((m) => WORK.has(m.kind)).map((m) => L`${m.age}세 ${m.text}`),
    family: all.filter((m) => FAMILY.has(m.kind)).map((m) => L`${m.age}세 ${m.text}`),
    milestones: keyMilestones(life, 6),
  };
}

export interface ShareParts {
  name: boolean;
  years: boolean;
  line: boolean;
  milestones: boolean;
  stats: boolean;
  wealth: boolean;
}

/** Off by default: the name (often the real one). Everything else is on and can be unticked before sharing. */
export const DEFAULT_SHARE: ShareParts = { name: false, years: true, line: true, milestones: true, stats: true, wealth: false };

/** The text that goes out when sharing, made only from the parts the player kept. */
export function shareText(life: LifeState, line: string, parts: ShareParts, url: string): string {
  const s = summaryOf(life);
  const who = parts.name ? s.name : L("또 다른 나");
  const rows = [L`What If · ${who}의 또 다른 인생`];
  if (parts.years) rows.push(L`${s.bornYear}–${s.lastYear} · ${s.age}세`);
  if (parts.line && line) rows.push(`“${line}”`);
  if (parts.milestones) for (const m of keyMilestones(life, 4)) rows.push(`${MILESTONE_ICON[m.kind]} ${L`${m.age}세`} ${m.text}`);
  if (parts.stats) rows.push((Object.keys(STAT_LABELS) as StatKey[]).map((k) => `${STAT_LABELS[k]} ${life.stats[k]}`).join(" · "));
  if (parts.wealth) rows.push(L`남긴 자산 ${s.wealth}`);
  rows.push(L`나도 살아보기 → ${url}`);
  return rows.join("\n");
}

