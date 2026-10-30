// Fixed monthly costs of an adult life: housing, living, children and school. They come out of wealth every turn
// (engine drift), show in the header, and the feed says when they change (a wedding, a home, a child starting school).
// Money is in today's 만원 like the rest of the engine.
import { MORTGAGE_RATE } from "./catalog";
import { ageAt } from "./events";
import { inService } from "./timeline";
import type { LifeState } from "./types";

export interface Expense {
  label: string;
  amount: number; // 만원 / 월
}

export const ADULT_AGE = 20;

const ageOf = (s: LifeState) => ageAt(s.profile.birthDate, s.mi);

/** Lives with parents: a single young adult who is studying or has no job yet. Pays a share of living costs, no rent. */
function atHome(s: LifeState, age: number): boolean {
  const f = s.flags;
  const single = f.partner !== "married";
  const studying = f.education === "highschool" || f.education === "university" || f.education === "graduate";
  return single && !f.homeOwner && f.children === 0 && ((studying && age <= 26) || (!f.employed && !f.retired && age < 27));
}

/** This month's fixed costs, item by item. Empty before adulthood and during army service. */
export function monthlyCosts(s: LifeState): Expense[] {
  const f = s.flags;
  const age = ageOf(s);
  if (age < ADULT_AGE || inService(s)) return [];
  const out: Expense[] = [];
  const add = (label: string, amount: number) => amount > 0 && out.push({ label, amount: Math.round(amount) });
  const married = f.partner === "married";

  if (atHome(s, age)) add("생활비 (부모님 댁)", f.employed ? 90 : 50);
  else {
    add("생활비", f.retired ? (married ? 190 : 130) : married ? 220 : 150);
    if (f.homeOwner) add("관리비·재산세", 25);
    else add("월세", married ? (f.children ? 95 : 80) : 60);
  }
  if (f.homeOwner && f.mortgage) add("대출 이자", (f.mortgage * MORTGAGE_RATE) / 12);

  // Children: care until school, then 학원 on top, then university tuition and pocket money until 23.
  const kidAges = f.kidsBorn?.length === f.children ? f.kidsBorn.map((b) => (s.mi - b) / 12) : Array(f.children).fill(10);
  let care = 0;
  let academy = 0;
  let college = 0;
  for (const a of kidAges) {
    if (a < 7) care += 60;
    else if (a < 13) {
      care += 45;
      academy += 30;
    } else if (a < 19) {
      care += 50;
      academy += 55;
    } else if (a < 23) college += 100;
  }
  add("자녀 양육비", care);
  add("자녀 학원비", academy);
  add("자녀 대학 등록금", college);

  // One's own tuition while classes run; parents cover half until 24.
  const enrolled = (f.education === "university" || f.education === "graduate") && s.mi <= f.eduUntil && s.mi >= (f.eduFrom ?? 0);
  if (enrolled && f.tuition) add(age <= 24 ? "등록금 (절반은 부모님)" : "등록금", (f.tuition / 12) * (age <= 24 ? 0.5 : 1));
  return out;
}

export const costTotal = (items: Expense[]) => items.reduce((sum, e) => sum + e.amount, 0);

/** Tuition is also charged before adulthood (an early entrant), so the engine asks for it on its own. */
export function tuitionOnly(s: LifeState): number {
  const f = s.flags;
  const enrolled = (f.education === "university" || f.education === "graduate") && s.mi <= f.eduUntil && s.mi >= (f.eduFrom ?? 0);
  if (!enrolled || !f.tuition || inService(s)) return 0;
  return Math.round((f.tuition / 12) * (ageOf(s) <= 24 ? 0.5 : 1));
}

/** "월세 60 · 생활비 150": the items, biggest first. */
export const costBreakdown = (items: Expense[]) =>
  [...items]
    .sort((a, b) => b.amount - a.amount)
    .map((e) => `${e.label} ${e.amount.toLocaleString()}만원`)
    .join(" · ");

/** A feed line when fixed costs move by 20만원 or more a month, naming what changed. Null otherwise. */
export function costChange(before: Record<string, number> | undefined, items: Expense[], age: number): { text: string; facts: string[] } | null {
  if (!before) return null; // a life saved before fixed costs were shown: start counting from now
  const now = Object.fromEntries(items.map((e) => [e.label, e.amount]));
  const was = before;
  const a = costTotal(Object.entries(was).map(([label, amount]) => ({ label, amount })));
  const b = costTotal(items);
  if (Math.abs(b - a) < 20) return null;
  const labels = [...new Set([...Object.keys(was), ...Object.keys(now)])];
  const moved = labels
    .map((l) => ({ l, d: (now[l] ?? 0) - (was[l] ?? 0) }))
    .filter((x) => Math.abs(x.d) >= 10)
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
    .slice(0, 2);
  const first = a === 0 && age >= ADULT_AGE && age <= ADULT_AGE + 1;
  const text = first
    ? "성인이 되었다. 이제 매달 나가는 돈은 스스로 감당한다."
    : b > a
      ? "매달 고정으로 나가는 돈이 늘었다."
      : "매달 고정으로 나가는 돈이 줄었다.";
  const facts = [`월 지출 ${a.toLocaleString()} → ${b.toLocaleString()}만원`, ...moved.map(({ l, d }) => `${l} ${d > 0 ? "+" : ""}${d.toLocaleString()}`)];
  return { text, facts };
}
