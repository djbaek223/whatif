// Concrete names and prices: employers, schools, salaries, tuition and homes.
// Money is in today's 만원 like the rest of the engine, so a 1998 salary reads in 2026 terms.
import type { Rng } from "./rng";
import type { Degree } from "./types";

export type CompanyTier =
  | "large"
  | "it"
  | "foreign"
  | "public"
  | "civil"
  | "mid"
  | "small"
  | "startup"
  | "research"
  | "contract"
  | "field"
  | "professor"
  | "doctor";

interface Company {
  name: string;
  tier: CompanyTier;
  since?: number; // first year it hired under this name
  fields?: RegExp; // majors or job titles it suits
}

const TECH = /컴퓨터|소프트|정보|전산|데이터|AI|인공지능|개발|프로그래|IT|전자|반도체/;
const ENG = /공학|공대|기계|전기|화학|재료|산업|건축|토목|자동차|조선|에너지/;
const BIZ = /경영|경제|회계|금융|무역|통계|마케팅|세무/;
const MEDIA = /미디어|신문|방송|광고|디자인|콘텐츠|문화|게임|영상/;
const BIO = /생명|바이오|약학|화학|의학|간호|보건/;

const COMPANIES: Company[] = [
  { name: "삼성전자", tier: "large", fields: /전자|반도체|컴퓨터|공학|소프트/ },
  { name: "현대자동차", tier: "large", fields: /기계|자동차|공학|산업/ },
  { name: "SK하이닉스", tier: "large", since: 2012, fields: /반도체|전자|재료|화학/ },
  { name: "LG전자", tier: "large", since: 1995, fields: /전자|공학|디자인/ },
  { name: "LG화학", tier: "large", since: 1995, fields: /화학|재료|에너지/ },
  { name: "포스코", tier: "large", since: 2002, fields: /재료|기계|공학/ },
  { name: "삼성물산", tier: "large", fields: /건축|토목|무역|경영/ },
  { name: "CJ제일제당", tier: "large", since: 1996, fields: /식품|생명|경영|마케팅/ },
  { name: "롯데쇼핑", tier: "large", fields: /경영|마케팅|무역/ },
  { name: "신한은행", tier: "large", fields: BIZ },
  { name: "KB국민은행", tier: "large", since: 2001, fields: BIZ },
  { name: "삼성생명", tier: "large", fields: BIZ },
  { name: "한화에어로스페이스", tier: "large", since: 2015, fields: /기계|항공|전자/ },
  { name: "삼성바이오로직스", tier: "large", since: 2011, fields: BIO },
  { name: "네이버", tier: "it", since: 1999, fields: TECH },
  { name: "카카오", tier: "it", since: 2010, fields: TECH },
  { name: "쿠팡", tier: "it", since: 2010, fields: /컴퓨터|데이터|경영|물류/ },
  { name: "엔씨소프트", tier: "it", since: 1997, fields: /게임|컴퓨터|디자인/ },
  { name: "넥슨코리아", tier: "it", since: 1994, fields: /게임|컴퓨터/ },
  { name: "토스(비바리퍼블리카)", tier: "it", since: 2015, fields: /컴퓨터|금융|데이터/ },
  { name: "배달의민족(우아한형제들)", tier: "it", since: 2011, fields: /컴퓨터|마케팅|디자인/ },
  { name: "구글코리아", tier: "foreign", since: 2004, fields: TECH },
  { name: "한국마이크로소프트", tier: "foreign", since: 1988, fields: TECH },
  { name: "한국IBM", tier: "foreign", fields: TECH },
  { name: "한국P&G", tier: "foreign", since: 1989, fields: /경영|마케팅/ },
  { name: "한국전력공사", tier: "public", fields: /전기|공학|경영/ },
  { name: "한국토지주택공사(LH)", tier: "public", since: 2009, fields: /건축|토목|도시/ },
  { name: "한국수자원공사", tier: "public", fields: /토목|환경/ },
  { name: "국민건강보험공단", tier: "public", since: 2000, fields: /보건|간호|행정/ },
  { name: "한국도로공사", tier: "public", fields: /토목|교통/ },
  { name: "인천국제공항공사", tier: "public", since: 1999 },
  { name: "한국은행", tier: "public", fields: /경제|금융|통계/ },
  { name: "구청", tier: "civil" },
  { name: "시청", tier: "civil" },
  { name: "주민센터", tier: "civil" },
  { name: "세무서", tier: "civil", fields: /세무|회계/ },
  { name: "한국전자통신연구원(ETRI)", tier: "research", since: 1997, fields: TECH },
  { name: "한국과학기술연구원(KIST)", tier: "research", fields: /공학|화학|생명|재료/ },
  { name: "한국생명공학연구원", tier: "research", since: 1995, fields: BIO },
  { name: "한국개발연구원(KDI)", tier: "research", fields: /경제|통계/ },
  { name: "한국항공우주연구원", tier: "research", since: 1989, fields: /항공|기계|전자/ },
  { name: "한국타이어", tier: "mid", fields: ENG },
  { name: "오뚜기", tier: "mid", fields: /식품|마케팅/ },
  { name: "한샘", tier: "mid", fields: /디자인|건축|마케팅/ },
  { name: "코웨이", tier: "mid", since: 2006, fields: /마케팅|경영/ },
  { name: "대웅제약", tier: "mid", fields: BIO },
  { name: "한미약품", tier: "mid", fields: BIO },
  { name: "안랩", tier: "mid", since: 1995, fields: TECH },
  { name: "더존비즈온", tier: "mid", since: 2003, fields: /회계|컴퓨터/ },
  { name: "제일기획", tier: "mid", fields: MEDIA },
  { name: "CJ ENM", tier: "mid", since: 2011, fields: MEDIA },
  { name: "대한통운", tier: "mid", fields: /물류|경영/ },
  { name: "한솔제지", tier: "mid", fields: ENG },
  // Small firms are made-up but specific, so the story names a place instead of "a small company".
  { name: "온누리세무회계", tier: "small", fields: /세무|회계/ },
  { name: "새봄무역", tier: "small", fields: /무역|경영|어학/ },
  { name: "푸른종합건설", tier: "small", fields: /건축|토목/ },
  { name: "다온소프트", tier: "small", fields: /컴퓨터|디자인|소프트/ },
  { name: "한결정밀", tier: "small", fields: ENG },
  { name: "해솔기획", tier: "small", fields: MEDIA },
  { name: "누리인테리어", tier: "small", fields: /디자인|건축/ },
  { name: "별빛물류", tier: "small" },
  { name: "미래식품", tier: "small", fields: /식품|생명/ },
  { name: "하나로유통", tier: "small" },
  { name: "야놀자", tier: "startup", since: 2007, fields: /관광|마케팅|컴퓨터/ },
  { name: "직방", tier: "startup", since: 2012, fields: /부동산|컴퓨터/ },
  { name: "당근마켓", tier: "startup", since: 2015, fields: TECH },
  { name: "컬리", tier: "startup", since: 2015, fields: /식품|마케팅|물류/ },
  { name: "무신사", tier: "startup", since: 2012, fields: /의류|패션|디자인|마케팅/ },
  { name: "리디", tier: "startup", since: 2009, fields: /문학|콘텐츠|컴퓨터/ },
  { name: "업스테이지", tier: "startup", since: 2020, fields: TECH },
  { name: "뤼튼테크놀로지스", tier: "startup", since: 2021, fields: TECH },
  { name: "이마트", tier: "contract", since: 1993 },
  { name: "홈플러스", tier: "contract", since: 1997 },
  { name: "KT 고객센터", tier: "contract", since: 2002 },
  { name: "국민연금공단(계약직)", tier: "contract" },
  { name: "한결오토텍(현대차 협력사)", tier: "field", fields: /기계|자동차/ },
  { name: "대우조선 협력업체", tier: "field", since: 1994 },
  { name: "SK하이닉스 이천공장 생산라인", tier: "field", since: 2012 },
  { name: "삼성전자 기흥공장 생산라인", tier: "field" },
  { name: "서울대학교병원", tier: "doctor" },
  { name: "서울아산병원", tier: "doctor", since: 1989 },
  { name: "삼성서울병원", tier: "doctor", since: 1994 },
  { name: "세브란스병원", tier: "doctor" },
  { name: "서울성모병원", tier: "doctor", since: 2009 },
  { name: "분당서울대학교병원", tier: "doctor", since: 2003 },
  { name: "부산대학교병원", tier: "doctor" },
  { name: "경북대학교병원", tier: "doctor" },
  { name: "전남대학교병원", tier: "doctor" },
];

/** Starting salary range (annual, 만원, today's won) for a new graduate. Experienced hires get more. */
export const SALARY: Record<CompanyTier, [number, number]> = {
  large: [4800, 5800],
  it: [4600, 5600],
  foreign: [4600, 6000],
  public: [3800, 4500],
  civil: [2900, 3200],
  research: [4200, 5000],
  mid: [3500, 4200],
  small: [2800, 3300],
  startup: [3300, 4500],
  contract: [2500, 2800],
  field: [2800, 3400],
  professor: [6500, 7500],
  doctor: [6000, 8000],
};

export const TIER_LABEL: Record<CompanyTier, string> = {
  large: "대기업",
  it: "IT 대기업",
  foreign: "외국계 기업",
  public: "공기업",
  civil: "공무원",
  research: "연구소",
  mid: "중견기업",
  small: "중소기업",
  startup: "스타트업",
  contract: "계약직",
  field: "현장직",
  professor: "대학 교수",
  doctor: "병원 의사",
};

const TITLE: Record<CompanyTier, string> = {
  large: "사원",
  it: "사원",
  foreign: "사원",
  public: "사원",
  civil: "9급 공무원",
  research: "연구원",
  mid: "사원",
  small: "사원",
  startup: "팀원",
  contract: "계약직 사원",
  field: "생산직 사원",
  professor: "조교수",
  doctor: "전공의",
};

const RANK = ["large", "it", "foreign", "public", "research", "mid", "startup", "civil", "small", "field", "contract"] as const;

// ── Degrees and who hires whom ─────────────────────

export const DEGREE_RANK: Record<Degree, number> = { none: 0, high: 1, college: 2, bachelor: 3, master: 4, phd: 5 };

/** The least schooling each kind of employer takes: a degree for the big companies, a master's for a research institute, a PhD to teach. */
export const TIER_NEEDS: Record<CompanyTier, Degree> = {
  large: "bachelor",
  it: "bachelor",
  foreign: "bachelor",
  public: "college",
  research: "master",
  professor: "phd",
  doctor: "bachelor", // and a medical degree, see MEDICAL
  mid: "high",
  civil: "high",
  startup: "none",
  small: "none",
  field: "none",
  contract: "none",
};

/** A medical school major: the only way to become a doctor. Veterinary, oriental and dental medicine, nursing and biomedical engineering are other paths. */
export const isMedical = (major: string) => /의예|의학|의대|의과/.test(major) && !/수의|한의|치의|간호|의학공학|생의학|의공/.test(major);

export function canWorkAt(tier: CompanyTier, degree: Degree, major: string): boolean {
  if (DEGREE_RANK[degree] < DEGREE_RANK[TIER_NEEDS[tier]]) return false;
  return tier !== "doctor" || isMedical(major);
}

/** The best league this person can join at or below the one asked for: a high school graduate aiming at 대기업 ends up at a 중견기업. */
export function fitTier(tier: CompanyTier, degree: Degree, major: string): CompanyTier {
  if (canWorkAt(tier, degree, major)) return tier;
  const i = RANK.indexOf(tier as (typeof RANK)[number]);
  const below = (i < 0 ? RANK.slice(RANK.indexOf("research")) : RANK.slice(i + 1)).filter((t) => canWorkAt(t, degree, major));
  return below[0] ?? "contract";
}

/** Graduate degrees pay more where they count: companies, labs and the public sector. */
export function degreePay(tier: CompanyTier, degree: Degree): number {
  if (!["large", "it", "foreign", "public", "research"].includes(tier)) return 1;
  return degree === "phd" ? 1.18 : degree === "master" ? 1.08 : 1;
}

export function tierOf(company: string | undefined): CompanyTier | undefined {
  if (!company) return undefined;
  // An exact name first: "삼성전자 기흥공장 생산라인" is a factory line, not 삼성전자's head office.
  return (COMPANIES.find((c) => c.name === company) ?? COMPANIES.find((c) => company.includes(c.name)))?.tier;
}

/** Picks an employer of the tier that existed that year, preferring ones that fit the major. */
export function pickCompany(rng: Rng, tier: CompanyTier, year: number, major: string, exclude?: string): string {
  const pool = COMPANIES.filter((c) => c.tier === tier && (c.since ?? 0) <= year && c.name !== exclude);
  if (!pool.length) return TIER_LABEL[tier];
  const fit = pool.filter((c) => c.fields?.test(major));
  return rng.pick(fit.length && rng.chance(0.75) ? fit : pool).name;
}

/** Annual salary for someone joining this tier with some years of experience. */
export function salaryFor(rng: Rng, tier: CompanyTier, yearsExp: number): number {
  const [lo, hi] = SALARY[tier];
  const base = lo + (hi - lo) * rng.next();
  const exp = Math.min(1.7, 1 + 0.035 * Math.max(0, yearsExp));
  return Math.round((base * exp) / 50) * 50;
}

export function titleFor(tier: CompanyTier, yearsExp: number): string {
  if (tier === "professor") return yearsExp >= 12 ? "정교수" : yearsExp >= 6 ? "부교수" : "조교수";
  if (tier === "doctor") return yearsExp >= 12 ? "과장" : yearsExp >= 4 ? "전문의" : "전공의";
  if (tier === "civil") return yearsExp >= 15 ? "6급 공무원" : yearsExp >= 7 ? "7급 공무원" : "9급 공무원";
  if (tier === "research") return yearsExp >= 10 ? "책임연구원" : yearsExp >= 4 ? "선임연구원" : "연구원";
  if (tier === "contract" || tier === "field" || tier === "startup") return TITLE[tier];
  if (yearsExp >= 18) return "부장";
  if (yearsExp >= 13) return "차장";
  if (yearsExp >= 8) return "과장";
  if (yearsExp >= 4) return "대리";
  return "사원";
}

/** A tier one step better (or the same when already at the top), for job moves. */
export function betterTier(rng: Rng, tier: CompanyTier | undefined): CompanyTier {
  if (!tier) return rng.pick(["mid", "small", "large"] as const);
  if (tier === "professor" || tier === "doctor") return tier; // a move to another university or hospital
  const i = RANK.indexOf(tier as (typeof RANK)[number]);
  if (i <= 0) return rng.pick(["large", "it", "foreign"] as const);
  return rng.chance(0.35) ? RANK[Math.max(0, i - 1)] : tier;
}

/** Guesses the tier of a free-form company name or job title (from the AI or the profile). */
export function guessTier(name: string): CompanyTier {
  const known = tierOf(name);
  if (known) return known;
  if (/공무원|구청|시청|군청|도청|주민센터|세무서/.test(name)) return "civil";
  if (/공사|공단|공기업/.test(name)) return "public";
  if (/교수/.test(name)) return "professor";
  if (/의사|병원|의원|전공의|전문의|레지던트|인턴의/.test(name)) return "doctor";
  if (/연구원|연구소/.test(name)) return "research";
  if (/스타트업|벤처|창업/.test(name)) return "startup";
  if (/계약직|아르바이트|알바|인턴/.test(name)) return "contract";
  if (/공장|생산|현장/.test(name)) return "field";
  if (/삼성|현대|LG|SK|롯데|포스코|한화|GS|CJ|대기업|은행/.test(name)) return "large";
  if (/구글|애플|아마존|마이크로소프트|외국계/.test(name)) return "foreign";
  if (/중소/.test(name)) return "small";
  return "mid";
}

// ── Schools ────────────────────────────────────────

export type SchoolTier = "top" | "seoul" | "national" | "regional" | "college";

const UNIVERSITIES: Record<SchoolTier, string[]> = {
  top: ["서울대학교", "연세대학교", "고려대학교", "KAIST", "포항공과대학교"],
  seoul: ["성균관대학교", "한양대학교", "서강대학교", "중앙대학교", "경희대학교", "한국외국어대학교", "이화여자대학교", "건국대학교", "동국대학교", "홍익대학교", "서울시립대학교"],
  national: ["부산대학교", "경북대학교", "전남대학교", "충남대학교", "충북대학교", "강원대학교", "전북대학교", "경상국립대학교"],
  regional: ["영남대학교", "계명대학교", "조선대학교", "동아대학교", "한남대학교", "인하대학교", "아주대학교", "단국대학교"],
  college: ["인하공업전문대학", "영진전문대학교", "명지전문대학", "대림대학교"],
};

/** Yearly tuition (만원). National universities charge about half of private ones. */
export function tuitionFor(school: string, level: "university" | "graduate" | "abroad"): number {
  if (level === "abroad") return 0; // funded PhD: tuition waived, a stipend instead
  const national = /서울대|KAIST|포항공과|부산대|경북대|전남대|충남대|충북대|강원대|전북대|경상국립대|서울시립대|국립/.test(school);
  if (level === "graduate") return national ? 600 : 1100;
  if (/전문대/.test(school)) return 700;
  return national ? 450 : 900;
}

/** Picks a university by how well the exam went (knowledge stat), or keeps the one in the profile. */
export function pickUniversity(rng: Rng, knowledge: number, fromProfile?: string): string {
  if (fromProfile?.trim()) return fromProfile.trim();
  const tier: SchoolTier = knowledge >= 82 ? "top" : knowledge >= 68 ? "seoul" : knowledge >= 55 ? rng.pick(["national", "regional"] as const) : knowledge >= 42 ? "regional" : "college";
  return rng.pick(UNIVERSITIES[tier]);
}

export function pickGradSchool(rng: Rng, knowledge: number, undergrad?: string): string {
  if (undergrad && rng.chance(0.5)) return `${undergrad} 대학원`;
  return `${rng.pick(UNIVERSITIES[knowledge >= 70 ? "top" : "seoul"])} 대학원`;
}

/** A university to teach at: one a step or two below where one studied is the usual first post. */
export function pickFaculty(rng: Rng, knowledge: number): string {
  return rng.pick(UNIVERSITIES[knowledge >= 80 ? rng.pick(["top", "seoul"] as const) : knowledge >= 65 ? rng.pick(["seoul", "national"] as const) : "regional"]);
}

export function pickAbroad(rng: Rng): string {
  return rng.pick(["미국 UC버클리", "미국 미시간대", "미국 일리노이대", "영국 임페리얼칼리지", "독일 뮌헨공대", "일본 도쿄대", "미국 퍼듀대", "싱가포르국립대"]);
}

// ── Homes ──────────────────────────────────────────

export interface HomeArea {
  name: string;
  price: number; // 만원, a typical 84㎡ (32평) apartment in 2026 won
}

const AREAS: HomeArea[] = [
  { name: "서울 강남구", price: 280000 },
  { name: "서울 마포구", price: 160000 },
  { name: "서울 노원구", price: 75000 },
  { name: "경기 성남시 분당구", price: 150000 },
  { name: "경기 수원시", price: 65000 },
  { name: "경기 고양시 일산", price: 60000 },
  { name: "인천 송도", price: 70000 },
  { name: "부산 해운대구", price: 70000 },
  { name: "대전 유성구", price: 55000 },
  { name: "대구 수성구", price: 75000 },
  { name: "광주 남구", price: 40000 },
  { name: "청주시", price: 35000 },
  { name: "경기 평택시", price: 40000 },
  { name: "천안시", price: 33000 },
];

/** The best area this person can buy in with at most 60% borrowed, nudged toward their hometown. */
export function pickHome(rng: Rng, wealth: number, hometown: string, cheap = false): HomeArea {
  const budget = Math.max(0, wealth) / 0.4;
  const affordable = AREAS.filter((a) => a.price <= budget).sort((a, b) => b.price - a.price);
  if (!affordable.length) return { name: "외곽의 빌라", price: Math.max(15000, Math.round(budget / 1000) * 1000) };
  const home = affordable.find((a) => hometown && a.name.includes(hometown.slice(0, 2)));
  if (home && !cheap) return home;
  const pool = cheap ? affordable.slice(-3) : affordable.slice(0, 3);
  return rng.pick(pool);
}

export const MORTGAGE_RATE = 0.042; // yearly
