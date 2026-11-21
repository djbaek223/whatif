// The calendar a Korean life runs on: the exam season, the March school year, and how long army service lasted
// in the year one enlisted. The engine sets school and service dates from these, and the narrator is told them,
// so a retake never ends in the same year and a four-year degree never ends early.
import type { Draft, LifeFlags, LifeState, ServiceKind } from "./types";
import type { Rng } from "./rng";
import { L, T } from "./i18n";
import { isEn, isUS } from "./region";

const mi = (year: number, month: number) => year * 12 + (month - 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (m: number) => (isEn() ? `${MONTHS[m % 12]} ${Math.floor(m / 12)}` : `${Math.floor(m / 12)}년 ${(m % 12) + 1}월`);

// Army (육군) active service by enlistment date. Steps from 병무청 and press histories (세계일보 2014, 중앙일보 2017):
// 36 after the war, 33 from 1959, 30 from 1962, back to 36 after 1·21 (1968), 33 from 1977, 30 from 1984,
// 26 from 1993 (graded in for those who enlisted from March 1989), 24 from October 2003,
// cut step by step to 21 by 2011, and to 18 for those enlisting from 2020 on.
const STEPS: [from: number, months: number][] = [
  [mi(1959, 1), 33],
  [mi(1962, 1), 30],
  [mi(1968, 2), 36],
  [mi(1977, 1), 33],
  [mi(1984, 1), 30],
];
const SLOPES: [from: number, to: number, a: number, b: number][] = [
  [mi(1989, 3), mi(1993, 1), 30, 26],
  [mi(2008, 1), mi(2011, 2), 24, 21],
  [mi(2018, 10), mi(2020, 6), 21, 18],
];

/** Months of army service for someone enlisting in this month. An American enlists for four years of active duty. */
export function serviceMonths(at: number): number {
  if (isUS()) return 48;
  for (const [from, to, a, b] of SLOPES) if (at >= from && at < to) return Math.round(a + ((b - a) * (at - from)) / (to - from));
  if (at >= mi(2020, 6)) return 18;
  if (at >= mi(2011, 2)) return 21;
  if (at >= mi(2003, 10)) return 24;
  if (at >= mi(1993, 1)) return 26;
  let months = 36;
  for (const [from, m] of STEPS) if (at >= from) months = m;
  return months;
}

/**
 * Months for this way of serving, enlisting this month. 공군 has run about three months longer than 육군.
 * 보충역 commutes from home: 방위병 18 months (14 from 1990), and from 1995 공익근무요원 (사회복무요원 from 2013)
 * about three months longer than 육군 (24 against 21 in the 2010s, 21 against 18 now).
 */
export function serviceLength(at: number, kind: ServiceKind = "army"): number {
  if (isUS()) return 48;
  if (kind === "air") return serviceMonths(at) + 3;
  if (kind === "reserve") return at < mi(1990, 1) ? 18 : at < mi(1995, 1) ? 14 : serviceMonths(at) + 3;
  return serviceMonths(at);
}

/** What the reserve service was called that year. */
const reserveName = (at: number) => (at < mi(1995, 1) ? L("방위병") : at < mi(2013, 1) ? L("공익근무요원") : L("사회복무요원"));

/** "육군", "공군" or the reserve's name, for this life's service. */
export function serviceName(f: LifeFlags): string {
  const kind = f.serviceKind ?? "army";
  return kind === "air" ? L("공군") : kind === "reserve" ? reserveName(f.serviceFrom ?? 0) : L("육군");
}

/** Leaving the service: 전역 for soldiers, 소집해제 for the reserve. */
export const dischargeWord = (f: LifeFlags) => (f.serviceKind === "reserve" ? L("소집해제") : L("전역"));

/**
 * A Korean man who still owes military service: not served, not exempt. Before the exam at 19 everyone counts.
 * Women, other genders and American lives owe nothing.
 */
export function owesService(s: LifeState): boolean {
  if (isUS() || s.profile.gender !== "남") return false;
  return !s.flags.military && s.flags.draft !== "exempt";
}

/**
 * 병역판정검사 in the year one turns 19: 현역, 보충역 or 면제, at about the rates of the time (병무청 yearly
 * statistics, rounded: many more 방위 in the 1970s-80s, about nine in ten 현역 in the 2000s-2010s, fewer since
 * the 2021 standards). Poor health shifts the odds. Returns the line for the feed, or null when no exam is due.
 */
export function draftExam(s: LifeState, rng: Rng): string | null {
  const f = s.flags;
  if (isUS() || s.profile.gender !== "남" || f.military || f.draft || ageAt(s) < 19) return null;
  const year = Math.floor(s.mi / 12);
  const [reserve, exempt] = year < 1990 ? [0.3, 0.05] : year < 2004 ? [0.15, 0.04] : year < 2021 ? [0.08, 0.03] : [0.14, 0.04];
  const frail = Math.max(0, 50 - s.stats.health) / 100; // health 30 adds 0.2
  const roll = rng.next();
  const draft: Draft = roll < exempt + frail / 4 ? "exempt" : roll < exempt + reserve + frail ? "reserve" : "active";
  f.draft = draft;
  if (draft === "exempt") {
    f.military = true;
    return L("병역판정검사에서 면제 판정을 받았다. 군대에 가지 않는다.");
  }
  if (draft === "reserve") return L`병역판정검사에서 4급 보충역 판정을 받았다. ${reserveName(s.mi)}으로 집에서 출퇴근하며 복무하게 된다.`;
  return L`병역판정검사에서 ${rng.pick(["1", "2", "3"])}급 현역 판정을 받았다.`;
}

/** The first March at or after this month: when a university year starts. In the US the year starts in September. */
export const nextMarch = (m: number) =>
  isUS() ? (m % 12 <= 8 ? m - (m % 12) + 8 : m - (m % 12) + 20) : m % 12 <= 2 ? m - (m % 12) + 2 : m - (m % 12) + 14;

/** The first March or September at or after this month: when a semester starts (graduate school, coming back from leave). */
export function nextTerm(m: number): number {
  const month = m % 12;
  if (isUS()) return month === 0 ? m : month <= 8 ? m - month + 8 : m - month + 12; // January or September
  if (month <= 2) return m - month + 2;
  if (month <= 8) return m - month + 8;
  return m - month + 14;
}

/** The next exam results season (October to December) after this month. A retake decided in the 1996 season waits for 1997's.
 * In the US it is college decisions season, March, after applying the autumn before. */
export const nextExamSeason = (m: number) =>
  isUS() ? (m % 12 < 2 ? m - (m % 12) + 2 : m - (m % 12) + 14) : m % 12 < 9 ? m - (m % 12) + 9 : m - (m % 12) + 21;

/** Puts school dates for a new course: classes from the next March (university) or term (graduate), for this many years. */
export function startCourse(f: LifeFlags, now: number, years: number) {
  const from = f.education === "university" ? nextMarch(now) : nextTerm(now);
  f.entered = from;
  f.eduFrom = from;
  f.eduUntil = from + years * 12 - 1;
}

const ageAt = (s: LifeState) => {
  const [y, m] = s.profile.birthDate.split("-").map(Number);
  return Math.floor((s.mi - (y * 12 + (m - 1))) / 12);
};

/** Serving in the army right now. Lives saved before serviceUntil existed fall back to the old busy guess. */
export function inService(s: LifeState): boolean {
  const f = s.flags;
  if (isUS()) return f.serviceUntil !== undefined && s.mi < f.serviceUntil && s.mi >= (f.serviceFrom ?? 0);
  if (!f.military || s.profile.gender !== "남") return false;
  if (f.serviceUntil !== undefined) return s.mi < f.serviceUntil;
  // Lives saved before service dates (and before the draft exam) guess from the busy months.
  return f.draft === undefined && s.mi < f.busyUntil && ageAt(s) < 26;
}

/** Going to classes: enrolled, the course has begun, and not away on military leave. */
export const onCampus = (s: LifeState) => s.flags.education === "university" && s.mi >= (s.flags.eduFrom ?? 0) && !inService(s);

/** Preparing for another exam after high school (재수, 삼수). */
export const retaking = (s: LifeState) => s.flags.education === "highschool" && s.flags.retaking !== undefined;

/**
 * Enlists now: service length for this year and way of serving, any job left behind, and a university course put on
 * hold (군 휴학). Someone who deferred until graduation goes in with the diploma. Returns the sentences that say so.
 */
export function enlist(s: LifeState, kind: ServiceKind = "army"): string[] {
  const f = s.flags;
  if (isUS()) kind = "army";
  const months = serviceLength(s.mi, kind);
  const back = s.mi + months;
  f.military = true;
  f.serviceFrom = s.mi;
  f.serviceUntil = back;
  f.serviceKind = kind;
  f.busyUntil = Math.max(f.busyUntil, back);
  const out = [
    isUS()
      ? T`Four years of active duty, out in ${fmt(back)}.`
      : kind === "reserve"
        ? L`${reserveName(s.mi)}으로 ${months}개월, 집에서 출퇴근하며 복무한다. ${fmt(back)} 소집해제 예정이다.`
        : L`${kind === "air" ? L("공군") : L("육군")} 복무 ${months}개월, ${fmt(back)} 전역 예정이다.`,
  ];
  const student = f.education === "university" || f.education === "graduate";
  if (f.employed && !f.retired) {
    // A soldier can't keep a job: whatever one did is left behind and comes back as a job search after discharge.
    f.employed = false;
    f.job = "";
    f.company = undefined;
    f.selfEmployed = undefined;
    s.income = 0;
    out.push(isUS() ? T("Left the job behind.") : L("다니던 일은 그만두었다."));
  }
  if (student && s.mi < f.eduUntil) {
    if ((f.eduFrom ?? 0) > s.mi) {
      // Admitted but not started: the place is kept and the first year begins after service.
      const length = f.eduUntil - f.eduFrom!;
      f.eduFrom = f.education === "university" ? nextMarch(back) : nextTerm(back);
      f.entered = f.eduFrom;
      f.eduUntil = f.eduFrom + length;
    } else {
      // Semesters left, counting the one being left mid-way, start again at the first term after discharge.
      const terms = Math.max(1, Math.ceil((f.eduUntil - s.mi + 1) / 6));
      f.eduFrom = nextTerm(back);
      f.eduUntil = f.eduFrom + terms * 6 - 1;
    }
    out.push(isUS() ? T`College is on hold: back in ${fmt(f.eduFrom)}, graduating ${fmt(f.eduUntil)}.` : L`학교는 휴학했다. ${fmt(f.eduFrom)} 복학, ${fmt(f.eduUntil)} 졸업 예정.`);
  } else if (student && !isUS()) out.push(L("졸업장을 받아 두고 입대했다. 앞으로의 진로는 전역한 뒤에 정한다."));
  return out;
}

/** Starts a retake year: back to studying for next year's exam; university is the March after it at the earliest. */
export function startRetake(s: LifeState): string {
  const f = s.flags;
  const exam = nextExamSeason(s.mi);
  const n = (f.retakes ?? 0) + 1;
  f.education = "highschool";
  f.retaking = exam;
  f.retakes = n;
  f.employed = false;
  f.job = "";
  f.busyUntil = Math.max(f.busyUntil, exam);
  const year = Math.floor(exam / 12);
  if (isUS()) return T`Took a gap year to work and reapply. Decisions come in spring ${year}; college starts in September ${year} at the earliest.`;
  return L`${n >= 2 ? L("삼수") : L("재수")}를 시작했다. 다음 수능은 ${year}년 11월, 대학은 빨라도 ${year + 1}년 3월에 들어간다.`;
}

/** Dates the narrator must keep to: exam and entrance years, graduation, service. Empty when none apply. */
export function timelineFacts(s: LifeState): string[] {
  const f = s.flags;
  const out: string[] = [];
  if (retaking(s)) {
    const exam = Math.floor(f.retaking! / 12);
    if (isUS()) out.push(T`Gap year: reapplying to college, decisions in spring ${exam}, starting September ${exam} at the earliest. Do not write that they got in or started before then`);
    else out.push(L`${(f.retakes ?? 1) >= 2 ? L("삼수") : L("재수")} 중: 다음 수능 ${exam}년 11월, 대학 입학은 빨라도 ${exam + 1}년 3월. 그 전에 대학에 붙거나 입학했다고 쓰지 않음`);
  }
  if (f.education === "university" || f.education === "graduate") {
    const what = f.education === "university" ? L("대학") : L("대학원");
    if (f.entered !== undefined && s.mi < f.entered) out.push(L`${what} 합격, ${fmt(f.entered)} 입학 예정. 아직 수업·캠퍼스 생활 전`);
    else if (f.entered !== undefined) {
      const years = f.education === "university" ? (isUS() ? T` (year ${Math.min(4, Math.floor((s.mi - f.entered) / 12) + 1)})` : L` (${Math.min(4, Math.floor((s.mi - f.entered) / 12) + 1)}학년차)`) : "";
      out.push(L`${what}: ${fmt(f.entered)} 입학${years}, 졸업 예정 ${fmt(f.eduUntil)}. 그 전에 졸업했다고 쓰지 않음`);
    } else out.push(L`${what}: 졸업 예정 ${fmt(f.eduUntil)}. 그 전에 졸업했다고 쓰지 않음`);
    if (!inService(s) && f.eduFrom !== undefined && s.mi < f.eduFrom && f.entered !== f.eduFrom) out.push(L`휴학 중, ${fmt(f.eduFrom)} 복학 예정`);
  }
  if (isUS()) {
    if (inService(s) && f.serviceFrom !== undefined && f.serviceUntil !== undefined)
      out.push(T`On active duty: enlisted ${fmt(f.serviceFrom)}, out in ${fmt(f.serviceUntil)}. Do not write that they left the service before then`);
    else if (f.serviceUntil !== undefined && f.serviceFrom !== undefined) out.push(T`Military service: ${fmt(f.serviceFrom)} to ${fmt(f.serviceUntil)}, honorably discharged (a veteran)`);
    return out;
  }
  if (inService(s) && f.serviceFrom !== undefined && f.serviceUntil !== undefined) {
    if (f.serviceKind === "reserve")
      out.push(L`${serviceName(f)} 복무 중: ${fmt(f.serviceFrom)}부터 ${f.serviceUntil - f.serviceFrom}개월, 집에서 출퇴근, ${fmt(f.serviceUntil)} 소집해제 예정. 학교·직장에 다니지 않음`);
    else out.push(L`군 복무 중: ${fmt(f.serviceFrom)} 입대, ${serviceName(f)} ${f.serviceUntil - f.serviceFrom}개월, ${fmt(f.serviceUntil)} 전역 예정. 그 전에 전역했다고 쓰지 않음`);
  } else if (f.serviceUntil !== undefined && f.serviceFrom !== undefined)
    out.push(f.serviceKind === "reserve" ? L`병역: ${fmt(f.serviceFrom)}~${fmt(f.serviceUntil)} ${serviceName(f)} 소집해제` : L`군 복무: ${fmt(f.serviceFrom)}~${fmt(f.serviceUntil)} ${serviceName(f)} 만기 전역`);
  else if (s.profile.gender === "남" && f.draft === "exempt") out.push(L("병역 면제 (군대에 가지 않음)"));
  else if (s.profile.gender === "남" && !f.military)
    out.push(f.draft === "reserve" ? L("군 미필 (보충역 판정, 아직 복무 전). 이미 다녀왔다고 쓰지 않음") : L("군 미필 (아직 입대 전). 이미 군대에 다녀왔다고 쓰지 않음"));
  return out;
}

// Korean and English words for the same things; a life's texts are in one language or the other.
const CAMPUS = /강의실|수강|학점|중간고사|기말고사|동아리|과 MT|새내기|캠퍼스|\b(lecture hall|midterms?|finals week|dorm|campus|freshman|sorority|fraternity)\b/i;
const GRADUATED = /졸업(했|식|장을 받|장)|\b(graduated|commencement|got (my|her|his|their) diploma)\b/i;
const DISCHARGED = /전역했|제대했|전역식|전역 날 |소집해제(됐|되었|했)|\b(discharged|got out of the (army|service|military))\b/i;
const ADMITTED = /입학했|합격했|새내기|신입생|입학식|캠퍼스 생활|\b(got into|accepted (to|at|into)|admitted|freshman|orientation week)\b/i;

/** What in the text breaks the school and service dates, or null. Used with hybrid.conflictIn. */
export function timelineConflict(text: string, s: LifeState): string | null {
  const f = s.flags;
  if (retaking(s) && ADMITTED.test(text)) return L("재수");
  if (inService(s) && (CAMPUS.test(text) || DISCHARGED.test(text))) return L("군 복무");
  if ((f.education === "university" || f.education === "graduate") && s.mi < f.eduUntil && GRADUATED.test(text) && !/고등학교 졸업|고교 졸업|high school/i.test(text)) return L("졸업");
  if (f.education === "university" && (f.eduFrom ?? 0) > s.mi && CAMPUS.test(text)) return L("입학 전");
  return null;
}
