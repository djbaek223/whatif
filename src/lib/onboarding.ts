// Helpers for the profile and turning point questions: school years, sentence templates, suggestions and personality chips.
import { isEn, isUS, type Region } from "./region";
import type { TurningPoint } from "./types";
import { L } from "./i18n";

const hasFinal = (word: string) => {
  const c = word.trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false;
};
/** Korean particle that fits the word before it, e.g. josa("재수", "와", "과") → "와". */
export const josa = (word: string, noFinal: string, withFinal: string) => (hasFinal(word) ? withFinal : noFinal);

export interface SchoolStage {
  key: "elementary" | "middle" | "high" | "university";
  label: string;
  from: number; // entry year (March)
  to: number; // graduation year (February)
}

/** School years from the birth date, Korean system: school starts in March of the year a child turns seven. */
export function schoolYears(birthDate: string, universityYear?: string): { stages: SchoolStage[]; early: boolean } | null {
  const [y, m] = birthDate.split("-").map(Number);
  if (!y || !m) return null;
  if (isUS()) {
    // Kindergarten starts in September of the year a child turns five by September 1; K-5, 6-8, 9-12, then college.
    const day = Number(birthDate.split("-")[2]) || 1;
    const k = y + (m < 9 || (m === 9 && day <= 1) ? 5 : 6);
    const uni = Number(universityYear) || k + 13;
    return {
      early: false,
      stages: [
        { key: "elementary", label: isEn() ? "Elementary school" : "초등학교", from: k, to: k + 6 },
        { key: "middle", label: isEn() ? "Middle school" : "중학교", from: k + 6, to: k + 9 },
        { key: "high", label: isEn() ? "High school" : "고등학교", from: k + 9, to: k + 13 },
        { key: "university", label: isEn() ? "College" : "대학교", from: uni, to: uni + 4 },
      ],
    };
  }
  // Children born in January or February started a year early until the 2009 school year (빠른년생).
  const early = m <= 2 && y <= 2002;
  const e = y + (early ? 6 : 7);
  const uni = Number(universityYear) || e + 12;
  return {
    early,
    stages: [
      { key: "elementary", label: L("초등학교"), from: e, to: e + 6 },
      { key: "middle", label: isEn() ? "Middle school" : "중학교", from: e + 6, to: e + 9 },
      { key: "high", label: L("고등학교"), from: e + 9, to: e + 12 },
      { key: "university", label: L("대학교"), from: uni, to: uni + 4 },
    ],
  };
}

export type TpKind = "exam" | "job" | "love" | "career" | "move" | "invest" | "other";

export interface TpKindDef {
  id: TpKind;
  label: string;
  icon: string;
  /** The blanks of the sentence template; the age comes from the chosen date. */
  a: string;
  b: string;
  why: string;
  example: { a: string; b: string; why: string };
}

const TP_KINDS: TpKindDef[] = [
  { id: "exam", label: "입시", icon: "🎓", a: "재수", b: "성적에 맞춰 진학", why: "부모님 형편", example: { a: "재수", b: "성적에 맞춰 지방대 진학", why: "또 1년을 버틸 자신이 없었던 것" } },
  { id: "job", label: "취업", icon: "💼", a: "대기업 인턴", b: "스타트업 정규직", why: "안정성", example: { a: "합격한 중견기업 입사", b: "1년 더 대기업 준비", why: "점점 줄어드는 통장 잔고" } },
  { id: "love", label: "연애·결혼", icon: "💍", a: "지금 결혼", b: "조금 더 기다림", why: "서로 다른 미래 계획", example: { a: "5년 사귄 사람과 결혼", b: "헤어지고 유학", why: "그 사람을 혼자 두는 것" } },
  { id: "career", label: "이직·창업", icon: "🚀", a: "회사에 남기", b: "창업", why: "가족의 생계", example: { a: "10년 다닌 회사에 남기", b: "친구와 카페 창업", why: "아이 학원비" } },
  { id: "move", label: "이사·이민", icon: "✈️", a: "서울에 남기", b: "캐나다 이민", why: "부모님 곁을 떠나는 것", example: { a: "고향에 남기", b: "서울로 상경", why: "혼자 계실 어머니" } },
  { id: "invest", label: "투자", icon: "📈", a: "집 사기", b: "전세 유지", why: "대출 이자", example: { a: "영끌해서 아파트 매수", b: "전세로 버티기", why: "금리가 오를지도 모른다는 불안" } },
  { id: "other", label: "기타", icon: "✏️", a: "첫 번째 길", b: "두 번째 길", why: "가장 걸렸던 것", example: { a: "군대 일찍 가기", b: "대학 졸업 후 입대", why: "친구들과 멀어지는 것" } },
];

// The same kinds for an American life, with American examples.
const US_TP_KINDS: TpKindDef[] = [
  { id: "exam", label: "School", icon: "🎓", a: "a gap year", b: "the school I got into", why: "money", example: { a: "a gap year to reapply", b: "the state school that accepted me", why: "the thought of another year of waiting" } },
  { id: "job", label: "First job", icon: "💼", a: "a big-company internship", b: "a startup job", why: "security", example: { a: "the offer from a mid-size company", b: "holding out for Google", why: "my shrinking bank balance" } },
  { id: "love", label: "Love & marriage", icon: "💍", a: "getting married now", b: "waiting a little longer", why: "our different plans", example: { a: "marrying my college sweetheart", b: "breaking up to move to Chicago", why: "leaving them behind" } },
  { id: "career", label: "Career change", icon: "🚀", a: "staying at my company", b: "starting a business", why: "supporting my family", example: { a: "staying at the company I'd been at for ten years", b: "opening a coffee shop with a friend", why: "my kids' college fund" } },
  { id: "move", label: "Moving", icon: "✈️", a: "staying in my hometown", b: "moving to California", why: "leaving my parents", example: { a: "staying in Ohio", b: "moving to New York", why: "my mom living alone" } },
  { id: "invest", label: "Money & home", icon: "📈", a: "buying a house", b: "renting a while longer", why: "the mortgage", example: { a: "stretching every dollar to buy a house", b: "keeping on renting", why: "worrying that rates would go up" } },
  { id: "other", label: "Other", icon: "✏️", a: "the first path", b: "the second path", why: "what weighed on me most", example: { a: "enlisting right after high school", b: "going to college first", why: "drifting away from my friends" } },
];

// Each list again in the other language: a Korean life told in English, an American life told in Korean.
const TP_KINDS_EN: TpKindDef[] = [
  { id: "exam", label: "Exams", icon: "🎓", a: "retaking the exam", b: "the college my scores got me into", why: "my parents' finances", example: { a: "a year to retake the exam", b: "a college outside Seoul that fit my scores", why: "not being sure I could last another year" } },
  { id: "job", label: "First job", icon: "💼", a: "an internship at a conglomerate", b: "a full-time startup job", why: "security", example: { a: "joining the mid-size company that took me", b: "another year preparing for a big company", why: "my shrinking bank balance" } },
  { id: "love", label: "Love & marriage", icon: "💍", a: "getting married now", b: "waiting a little longer", why: "our different plans", example: { a: "marrying the person I'd dated for five years", b: "breaking up to study abroad", why: "leaving them behind" } },
  { id: "career", label: "Career change", icon: "🚀", a: "staying at my company", b: "starting a business", why: "supporting my family", example: { a: "staying at the company I'd been at for ten years", b: "opening a café with a friend", why: "my kid's cram school fees" } },
  { id: "move", label: "Moving", icon: "✈️", a: "staying in Seoul", b: "emigrating to Canada", why: "leaving my parents", example: { a: "staying in my hometown", b: "moving up to Seoul", why: "my mother living alone" } },
  { id: "invest", label: "Money & home", icon: "📈", a: "buying a home", b: "keeping the jeonse lease", why: "the loan interest", example: { a: "borrowing everything to buy an apartment", b: "holding on with a jeonse lease", why: "worrying that rates would go up" } },
  { id: "other", label: "Other", icon: "✏️", a: "the first path", b: "the second path", why: "what weighed on me most", example: { a: "doing military service early", b: "enlisting after graduation", why: "drifting away from my friends" } },
];

const US_TP_KINDS_KO: TpKindDef[] = [
  { id: "exam", label: "진학", icon: "🎓", a: "갭이어", b: "붙은 대학 진학", why: "학비", example: { a: "1년 쉬고 다시 지원", b: "합격한 주립대 진학", why: "또 1년을 기다려야 한다는 생각" } },
  { id: "job", label: "첫 직장", icon: "💼", a: "대기업 인턴", b: "스타트업 정규직", why: "안정성", example: { a: "합격한 중견기업 입사", b: "구글 합격까지 버티기", why: "점점 줄어드는 통장 잔고" } },
  { id: "love", label: "연애·결혼", icon: "💍", a: "지금 결혼", b: "조금 더 기다림", why: "서로 다른 미래 계획", example: { a: "대학 때부터 사귄 사람과 결혼", b: "헤어지고 시카고로 이사", why: "그 사람을 두고 떠나는 것" } },
  { id: "career", label: "이직·창업", icon: "🚀", a: "회사에 남기", b: "창업", why: "가족의 생계", example: { a: "10년 다닌 회사에 남기", b: "친구와 커피숍 창업", why: "아이 대학 학자금" } },
  { id: "move", label: "이사", icon: "✈️", a: "고향에 남기", b: "캘리포니아로 이사", why: "부모님 곁을 떠나는 것", example: { a: "오하이오에 남기", b: "뉴욕으로 이사", why: "혼자 계실 어머니" } },
  { id: "invest", label: "돈·집", icon: "📈", a: "집 사기", b: "조금 더 월세 살기", why: "모기지 부담", example: { a: "있는 돈을 다 모아 집 사기", b: "계속 월세 살기", why: "금리가 오를지도 모른다는 불안" } },
  { id: "other", label: "기타", icon: "✏️", a: "첫 번째 길", b: "두 번째 길", why: "가장 걸렸던 것", example: { a: "고등학교 졸업 후 바로 입대", b: "대학 먼저 가기", why: "친구들과 멀어지는 것" } },
];

/** The kinds of turning point for the current region, in the display language. */
export const tpKinds = () => (isUS() ? (isEn() ? US_TP_KINDS : US_TP_KINDS_KO) : isEn() ? TP_KINDS_EN : TP_KINDS);

export const kindDef = (labelOrId?: string) => tpKinds().find((k) => k.label === labelOrId || k.id === labelOrId);

export interface TpBlanks {
  a: string;
  b: string;
  why: string;
}

/** "19살, 재수와 지방대 진학 사이에서 고민했다. 가장 마음에 걸린 건 부모님 형편이었다." */
export function fillTemplate(age: number | null, f: TpBlanks): string {
  if (!f.a.trim() && !f.b.trim()) return "";
  const a = f.a.trim() || "____";
  const b = f.b.trim() || "____";
  const why = f.why.trim();
  if (isEn()) {
    const head = `${age !== null && age >= 0 ? `At ${age}, I` : "I"} was torn between ${a} and ${b}.`;
    return why ? `${head} What weighed on me most was ${why}.` : head;
  }
  const head = `${age !== null && age >= 0 ? `${age}살, ` : ""}${a}${josa(a, "와", "과")} ${b} 사이에서 고민했다.`;
  return why ? `${head} 가장 마음에 걸린 건 ${why}${josa(why, "였다", "이었다")}.` : head;
}

export interface Suggestion {
  kind: TpKind;
  label: string;
  date: string; // YYYY-MM
  age: number;
}

// Turning points many people meet, by age (만 나이) and month.
const COMMON: { age: number; month: number; kind: TpKind; label: string; gender?: "남" }[] = [
  { age: 15, month: 11, kind: "exam", label: "고등학교 고르기" },
  { age: 18, month: 12, kind: "exam", label: "대학 선택" },
  { age: 20, month: 2, kind: "other", label: "입대 시기", gender: "남" },
  { age: 22, month: 3, kind: "move", label: "휴학·어학연수" },
  { age: 26, month: 1, kind: "job", label: "첫 직장" },
  { age: 29, month: 6, kind: "move", label: "독립·이사" },
  { age: 31, month: 4, kind: "love", label: "결혼" },
  { age: 34, month: 9, kind: "career", label: "첫 이직" },
  { age: 37, month: 3, kind: "invest", label: "내 집 마련" },
  { age: 42, month: 5, kind: "career", label: "창업 고민" },
  { age: 50, month: 1, kind: "career", label: "제2의 직업" },
];

// The same for an American life: applying to college in senior year, no army, buying a house a little earlier.
const US_COMMON: typeof COMMON = [
  { age: 14, month: 8, kind: "exam", label: "Choosing a high school" },
  { age: 17, month: 11, kind: "exam", label: "College applications" },
  { age: 20, month: 5, kind: "move", label: "A semester abroad" },
  { age: 22, month: 6, kind: "job", label: "First job" },
  { age: 24, month: 8, kind: "move", label: "Moving to a new city" },
  { age: 29, month: 6, kind: "love", label: "Getting married" },
  { age: 32, month: 9, kind: "career", label: "First job change" },
  { age: 33, month: 4, kind: "invest", label: "Buying a house" },
  { age: 42, month: 5, kind: "career", label: "Starting a business" },
  { age: 50, month: 1, kind: "career", label: "A second career" },
];

const COMMON_EN: typeof COMMON = [
  { age: 15, month: 11, kind: "exam", label: "Choosing a high school" },
  { age: 18, month: 12, kind: "exam", label: "Choosing a college" },
  { age: 20, month: 2, kind: "other", label: "When to enlist", gender: "남" },
  { age: 22, month: 3, kind: "move", label: "A leave of absence to study abroad" },
  { age: 26, month: 1, kind: "job", label: "First job" },
  { age: 29, month: 6, kind: "move", label: "Moving out" },
  { age: 31, month: 4, kind: "love", label: "Getting married" },
  { age: 34, month: 9, kind: "career", label: "First job change" },
  { age: 37, month: 3, kind: "invest", label: "Buying a home" },
  { age: 42, month: 5, kind: "career", label: "Thinking of starting a business" },
  { age: 50, month: 1, kind: "career", label: "A second career" },
];

const US_COMMON_KO: typeof COMMON = [
  { age: 14, month: 8, kind: "exam", label: "고등학교 고르기" },
  { age: 17, month: 11, kind: "exam", label: "대학 지원" },
  { age: 20, month: 5, kind: "move", label: "해외 교환학기" },
  { age: 22, month: 6, kind: "job", label: "첫 직장" },
  { age: 24, month: 8, kind: "move", label: "새 도시로 이사" },
  { age: 29, month: 6, kind: "love", label: "결혼" },
  { age: 32, month: 9, kind: "career", label: "첫 이직" },
  { age: 33, month: 4, kind: "invest", label: "집 장만" },
  { age: 42, month: 5, kind: "career", label: "창업" },
  { age: 50, month: 1, kind: "career", label: "제2의 직업" },
];

/** Common turning points that already happened in this life, newest first; optionally of one kind. */
export function suggestions(birthDate: string, gender: string, now: Date, kind?: string): Suggestion[] {
  const [y, m] = birthDate.split("-").map(Number);
  if (!y || !m) return [];
  const nowMi = now.getFullYear() * 12 + now.getMonth();
  return (isUS() ? (isEn() ? US_COMMON : US_COMMON_KO) : isEn() ? COMMON_EN : COMMON).filter((c) => (!c.gender || !gender || c.gender === gender) && (!kind || kind === "other" || c.kind === kind))
    .map((c) => {
      // The month of the year they turned that age; earlier months fall in the next calendar year.
      const year = y + c.age + (c.month < m ? 1 : 0);
      return { kind: c.kind, label: c.label, date: `${year}-${String(c.month).padStart(2, "0")}`, age: c.age };
    })
    .filter((s) => monthIndex(s.date) <= nowMi)
    .reverse()
    .slice(0, 4);
}

const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m - 1;
};

/** 만 나이 at a YYYY-MM month, or null while either date is missing. */
export function ageIn(birthDate: string, ym: string): number | null {
  const [by, bm] = birthDate.split("-").map(Number);
  if (!by || !bm || !/^\d{4}-\d{2}$/.test(ym)) return null;
  return Math.floor((monthIndex(ym) - (by * 12 + bm - 1)) / 12);
}

export const personalityChips = () => [L("외향적"), L("내성적"), L("도전적"), L("신중함"), L("성실함"), L("호기심 많음"), L("다정함"), L("현실적"), L("가족 중심"), L("여유로움"), L("운동 좋아함"), L("여행 좋아함")];

export const EMPTY_TP: TurningPoint = { date: "", situation: "", actualChoice: "", regret: "" };

/** "한국" or "미국" (Korea, the US) in the display language. */
export const countryName = (c: Region) => (c === "us" ? L("미국") : L("한국"));

/**
 * 빠른 시작: only the year to go back to. The month is the one a common turning point of that age falls in
 * (the college exam at 18, the first job at 26), and such a school or first-job moment also gives the kind, so the
 * paths offered fit. Any other year starts in March (September in the US), when school years and fresh starts begin.
 * The situation stays empty: the story writes what that age and year were like (fallback.ts, the opening prompt).
 */
export function quickTurningPoint(birthDate: string, gender: string, year: number, now: Date): TurningPoint {
  const [by, bm] = birthDate.split("-").map(Number);
  const common = (isUS() ? US_COMMON : COMMON).filter((c) => !c.gender || !gender || c.gender === gender);
  const hit = by && bm ? common.find((c) => by + c.age + (c.month < bm ? 1 : 0) === year) : undefined;
  let month = hit?.month ?? (isUS() ? 9 : 3);
  // This year: no later than now.
  if (year === now.getFullYear()) month = Math.min(month, now.getMonth() + 1);
  const kind = hit && (hit.kind === "exam" || hit.kind === "job") ? kindDef(hit.kind)?.label : undefined;
  return { ...EMPTY_TP, date: `${year}-${String(month).padStart(2, "0")}`, ...(kind ? { kind } : {}) };
}

/** A few ages to go back to in one tap, as years, for 빠른 시작; only years already lived. */
export function quickYears(birthDate: string, now: Date): { year: number; age: number }[] {
  const by = Number(birthDate.slice(0, 4));
  if (!by) return [];
  return [10, 15, 18, 20, 25, 30, 35, 40, 50, 60]
    .map((age) => ({ year: by + age, age }))
    .filter((y) => y.year <= now.getFullYear())
    .slice(-6);
}

/** 빠른 시작: the player gave only the year to go back to, nothing about the moment itself (no situation, no choice made). */
export function quickStart(tp: unknown): boolean {
  const t = (tp ?? {}) as { situation?: unknown; actualChoice?: unknown };
  return !String(t.situation ?? "").trim() && !String(t.actualChoice ?? "").trim();
}
