// The calendar a Korean life runs on: the exam season, the March school year, and how long army service lasted
// in the year one enlisted. The engine sets school and service dates from these, and the narrator is told them,
// so a retake never ends in the same year and a four-year degree never ends early.
import type { LifeFlags, LifeState } from "./types";
import { L } from "./i18n";
import { isUS } from "./region";

const mi = (year: number, month: number) => year * 12 + (month - 1);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (m: number) => (isUS() ? `${MONTHS[m % 12]} ${Math.floor(m / 12)}` : `${Math.floor(m / 12)}년 ${(m % 12) + 1}월`);

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
  return f.serviceUntil !== undefined ? s.mi < f.serviceUntil : s.mi < f.busyUntil && ageAt(s) < 26;
}

/** Going to classes: enrolled, the course has begun, and not away on military leave. */
export const onCampus = (s: LifeState) => s.flags.education === "university" && s.mi >= (s.flags.eduFrom ?? 0) && !inService(s);

/** Preparing for another exam after high school (재수, 삼수). */
export const retaking = (s: LifeState) => s.flags.education === "highschool" && s.flags.retaking !== undefined;

/**
 * Enlists now: service length for this year, and a university course put on hold (군 휴학).
 * Returns the sentences that say so.
 */
export function enlist(s: LifeState): string[] {
  const f = s.flags;
  const months = serviceMonths(s.mi);
  const back = s.mi + months;
  f.military = true;
  f.serviceFrom = s.mi;
  f.serviceUntil = back;
  f.busyUntil = Math.max(f.busyUntil, back);
  const out = [isUS() ? `Four years of active duty, out in ${fmt(back)}.` : `육군 복무 ${months}개월, ${fmt(back)} 전역 예정이다.`];
  if ((f.education === "university" || f.education === "graduate") && s.mi <= f.eduUntil) {
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
    out.push(isUS() ? `College is on hold: back in ${fmt(f.eduFrom)}, graduating ${fmt(f.eduUntil)}.` : `학교는 휴학했다. ${fmt(f.eduFrom)} 복학, ${fmt(f.eduUntil)} 졸업 예정.`);
  }
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
  if (isUS()) return `Took a gap year to work and reapply. Decisions come in spring ${year}; college starts in September ${year} at the earliest.`;
  return L`${n >= 2 ? L("삼수") : L("재수")}를 시작했다. 다음 수능은 ${year}년 11월, 대학은 빨라도 ${year + 1}년 3월에 들어간다.`;
}

/** Dates the narrator must keep to: exam and entrance years, graduation, service. Empty when none apply. */
export function timelineFacts(s: LifeState): string[] {
  const f = s.flags;
  const out: string[] = [];
  if (retaking(s)) {
    const exam = Math.floor(f.retaking! / 12);
    if (isUS()) out.push(`Gap year: reapplying to college, decisions in spring ${exam}, starting September ${exam} at the earliest. Do not write that they got in or started before then`);
    else out.push(L`${(f.retakes ?? 1) >= 2 ? L("삼수") : L("재수")} 중: 다음 수능 ${exam}년 11월, 대학 입학은 빨라도 ${exam + 1}년 3월. 그 전에 대학에 붙거나 입학했다고 쓰지 않음`);
  }
  if (f.education === "university" || f.education === "graduate") {
    const what = f.education === "university" ? L("대학") : L("대학원");
    if (f.entered !== undefined && s.mi < f.entered) out.push(L`${what} 합격, ${fmt(f.entered)} 입학 예정. 아직 수업·캠퍼스 생활 전`);
    else if (f.entered !== undefined) {
      const years = f.education === "university" ? (isUS() ? ` (year ${Math.min(4, Math.floor((s.mi - f.entered) / 12) + 1)})` : L` (${Math.min(4, Math.floor((s.mi - f.entered) / 12) + 1)}학년차)`) : "";
      out.push(L`${what}: ${fmt(f.entered)} 입학${years}, 졸업 예정 ${fmt(f.eduUntil)}. 그 전에 졸업했다고 쓰지 않음`);
    } else out.push(L`${what}: 졸업 예정 ${fmt(f.eduUntil)}. 그 전에 졸업했다고 쓰지 않음`);
    if (!inService(s) && f.eduFrom !== undefined && s.mi < f.eduFrom && f.entered !== f.eduFrom) out.push(L`휴학 중, ${fmt(f.eduFrom)} 복학 예정`);
  }
  if (isUS()) {
    if (inService(s) && f.serviceFrom !== undefined && f.serviceUntil !== undefined)
      out.push(`On active duty: enlisted ${fmt(f.serviceFrom)}, out in ${fmt(f.serviceUntil)}. Do not write that they left the service before then`);
    else if (f.serviceUntil !== undefined && f.serviceFrom !== undefined) out.push(`Military service: ${fmt(f.serviceFrom)} to ${fmt(f.serviceUntil)}, honorably discharged (a veteran)`);
    return out;
  }
  if (inService(s) && f.serviceFrom !== undefined && f.serviceUntil !== undefined)
    out.push(L`군 복무 중: ${fmt(f.serviceFrom)} 입대, 육군 ${f.serviceUntil - f.serviceFrom}개월, ${fmt(f.serviceUntil)} 전역 예정. 그 전에 전역했다고 쓰지 않음`);
  else if (f.serviceUntil !== undefined && f.serviceFrom !== undefined) out.push(L`군 복무: ${fmt(f.serviceFrom)}~${fmt(f.serviceUntil)} 육군 만기 전역`);
  else if (s.profile.gender === "남" && !f.military) out.push(L("군 미필 (아직 입대 전)"));
  return out;
}

// Korean and English words for the same things; a life's texts are in one language or the other.
const CAMPUS = /강의실|수강|학점|중간고사|기말고사|동아리|과 MT|새내기|캠퍼스|\b(lecture hall|midterms?|finals week|dorm|campus|freshman|sorority|fraternity)\b/i;
const GRADUATED = /졸업(했|식|장을 받|장)|\b(graduated|commencement|got (my|her|his|their) diploma)\b/i;
const DISCHARGED = /전역했|제대했|전역식|전역 날 |\b(discharged|got out of the (army|service|military))\b/i;
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
