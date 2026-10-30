// Degrees: what schooling a life has finished, and what it opens. A course's degree is credited once its last month
// has passed, so dropping out earns nothing. Employers ask for a degree (catalog.ts TIER_NEEDS), and the narrator is told.
import { DEGREE_RANK, TIER_LABEL, canWorkAt, isMedical, type CompanyTier } from "./catalog";
import { DEGREE_LABELS, type Degree, type LifeFlags, type LifeState } from "./types";
import { L, V } from "./i18n";

const COLLEGE = /전문대/;
const GRAD = /대학원|박사|석사/;

/** The degree a course at this school leads to: an associate's at a 전문대, a bachelor's otherwise; graduate school gives a master's, then a PhD. */
export function programFor(level: "university" | "graduate" | "abroad", school: string | undefined, degree: Degree): Degree {
  if (level === "abroad") return "phd";
  if (level === "graduate") return DEGREE_RANK[degree] >= DEGREE_RANK.master ? "phd" : "master";
  return COLLEGE.test(school ?? "") ? "college" : "bachelor";
}

/** Highest degree so far. Lives saved before degrees existed are read from where they are in school. */
export function degreeOf(f: LifeFlags): Degree {
  if (f.degree) return f.degree;
  switch (f.education) {
    case "school":
    case "highschool":
      return "none";
    case "university":
      return "high";
    case "graduate":
      return "bachelor";
    default:
      if (!f.school) return "high";
      if (GRAD.test(f.school)) return "master";
      if (/미국|영국|독일|일본|싱가포르/.test(f.school)) return "phd";
      return COLLEGE.test(f.school) ? "college" : "bachelor";
  }
}

/** The degree this person holds once the course they are finishing is over (graduation choices are asked on its last day). */
export function degreeOnLeaving(s: LifeState): Degree {
  const f = s.flags;
  const now = degreeOf(f);
  if ((f.education !== "university" && f.education !== "graduate") || s.mi < f.eduUntil) return now;
  const program = f.program ?? programFor(f.education === "graduate" ? "graduate" : "university", f.school, now);
  return DEGREE_RANK[program] > DEGREE_RANK[now] ? program : now;
}

/** Credits a finished course: once its last month has passed, the degree is earned, whatever happens next. */
export function creditDegree(s: LifeState): Degree | null {
  const f = s.flags;
  const enrolled = f.education === "university" || f.education === "graduate";
  if (!enrolled || s.mi < f.eduUntil) return null;
  const before = degreeOf(f);
  f.degree = degreeOnLeaving(s);
  f.program = f.degree; // credited: the course gives nothing more however long one stays

  return f.degree !== before ? f.degree : null;
}

/** Leaving high school (graduating, or after a retake) gives a high school diploma. */
export function creditHighSchool(f: LifeFlags) {
  if (DEGREE_RANK[degreeOf(f)] < DEGREE_RANK.high) f.degree = "high";
}

export const degreeLabel = (f: LifeFlags) => DEGREE_LABELS[degreeOf(f)];

const SHORT: Record<Degree, string> = { get none() { return L("중졸"); }, get high() { return L("고졸"); }, get college() { return L("전문대"); }, get bachelor() { return L("대졸"); }, get master() { return L("석사"); }, get phd() { return L("박사"); } };

/** The degree beside the 교육 gauge, once school is behind (or under way past high school). Nothing for a child. */
export function degreeTag(s: LifeState): string | undefined {
  const f = s.flags;
  if (f.education === "school" || (f.education === "highschool" && f.retaking === undefined)) return undefined;
  if ((f.education === "university" || f.education === "graduate") && s.mi < f.eduUntil) return L`${SHORT[f.program ?? (f.education === "graduate" ? "master" : "bachelor")]} 과정`;
  return SHORT[degreeOf(f)];
}

const OPEN_ORDER: CompanyTier[] = ["professor", "doctor", "research", "large", "it", "foreign", "public", "mid", "civil", "startup", "small", "field", "contract"];

/** What this degree opens and what stays closed, in words for the narrator. */
export function degreeFacts(s: LifeState): string {
  const d = degreeOf(s.flags);
  const major = s.profile.major;
  const open = OPEN_ORDER.filter((t) => canWorkAt(t, d, major)).map((t) => V(TIER_LABEL[t]));
  const closed = OPEN_ORDER.filter((t) => !canWorkAt(t, d, major) && (t !== "doctor" || isMedical(major))).map((t) => V(TIER_LABEL[t]));
  const course = s.flags.program && (s.flags.education === "university" || s.flags.education === "graduate") && s.mi < s.flags.eduUntil ? L`, ${DEGREE_LABELS[s.flags.program]} 과정 중` : "";
  return L`${DEGREE_LABELS[d]}${course}. 지원 가능: ${open.join("·") || L("없음")}${closed.length ? L`. 학력이 모자라 지원 불가: ${closed.join("·")}` : ""}`;
}
