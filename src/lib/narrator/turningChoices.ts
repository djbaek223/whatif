// Suggested paths for the turning point, built from what the user wrote about it.
// Used when AI narration is off or fails, and as hints for the AI so its paths start from the same reading.
import { ageAt } from "../events";
import { heuristicInitial, turningPointMi } from "../engine";
import type { OpeningChoice, Preset, Profile, TurningPoint } from "../types";
import type { OpeningResult } from "./schema";

type Path = OpeningResult["choices"][number];

export type TpTheme = "exam" | "job" | "love" | "career" | "move" | "invest" | "other";

// Labels of the turning point kinds picked on the form ("입시", "취업" ...), and their ids.
const KIND_LABELS: Record<string, TpTheme> = {
  입시: "exam",
  취업: "job",
  "연애·결혼": "love",
  "이직·창업": "career",
  "이사·이민": "move",
  투자: "invest",
  기타: "other",
};

const THEME_WORDS: [TpTheme, RegExp][] = [
  ["exam", /수능|재수|삼수|입시|대학|진학|편입|전공|학과|고등학교|특목고|외고|과학고|자퇴|대학원|학교|성적/g],
  ["job", /취업|취직|입사|합격|면접|인턴|공무원|공채|신입|첫\s?직장|구직|취준|자소서/g],
  ["career", /이직|퇴사|창업|사업|승진|전직|부업|프리랜서|회사|가게|장사|직장|연봉/g],
  ["love", /결혼|연애|고백|헤어|이별|사귀|프러포즈|청혼|짝사랑|이혼|여자\s?친구|남자\s?친구|애인|그\s?사람|소개팅|약혼|좋아하던/g],
  ["move", /이사|이민|상경|해외|유학|고향|이주|독립|워홀|워킹\s?홀리데이|떠나|외국|미국|캐나다|호주|일본/g],
  ["invest", /투자|주식|코인|비트코인|아파트|부동산|전세|월세|매수|청약|대출|영끌|집을?\s?(사|살)|내\s?집/g],
];

/** The kind picked on the form, or the one the user's words point to most. */
export function themeOf(tp: TurningPoint): TpTheme {
  const picked = tp.kind ? (KIND_LABELS[tp.kind] ?? (Object.values(KIND_LABELS).includes(tp.kind as TpTheme) ? (tp.kind as TpTheme) : undefined)) : undefined;
  if (picked && picked !== "other") return picked;
  const text = `${tp.situation} ${tp.actualChoice} ${tp.regret}`;
  let best: TpTheme = "other";
  let score = 0;
  for (const [theme, re] of THEME_WORDS) {
    const n = text.match(re)?.length ?? 0;
    if (n > score) [best, score] = [theme, n];
  }
  return best;
}

const PRESET_WORDS: [Preset, RegExp][] = [
  ["love", /결혼|고백|연애|사귀|프러포즈|청혼|마음을\s?전|붙잡/],
  ["risk", /창업|사업|장사|가게|카페|차리|차린|투자|주식|코인|영끌|모험|도전|프리랜서|유튜/],
  ["study", /재수|삼수|공부|대학원|편입|수능|시험|진학|전공|학위|자격증|유학/],
  ["career", /입사|취업|취직|이직|회사|공무원|공채|인턴|정규직|일을?\s?시작|직장|대기업/],
  ["move", /이사|이민|상경|해외|고향|이주|떠나|독립|외국|워홀|워킹\s?홀리데이|서울|지방|지사|발령|전학/],
  ["family", /가족|아이|육아|부모|어머니|아버지|엄마|아빠|곁에/],
  ["rest", /쉬|휴학|휴직|여행|안식|갭이어/],
  ["health", /병원|운동|건강|치료|수술/],
];

export function presetOf(text: string): Preset | null {
  for (const [preset, re] of PRESET_WORDS) if (re.test(text)) return preset;
  return null;
}

// ── Reading the user's own words ─────────────────────

const PAIR_PATTERNS = [
  /([^,.!?\n]{1,40}?)\s*(?:와|과|랑|이랑|하고)\s+([^,.!?\n]{1,40}?)\s*(?:사이에서|사이)/,
  /([^,.!?\n]{1,40}?)\s*(?:vs\.?|VS\.?|대)\s+([^,.!?\n]{1,40})/,
  /([^,.!?\n]{1,40}?)(?:하느냐|냐)\s+([^,.!?\n]{1,40}?)(?:하느냐|냐)/,
  /([^,.!?\n]{1,40}?)\s*(?:아니면|또는|혹은)\s+([^,.!?\n]{1,40})/,
];
// "아파트를 살지 전세로 버틸지", "워홀을 갈지 말지": verb stems ending in ㄹ before 지.
const VERB_PAIR = /([^,.!?\n]{1,40}?)지\s+([^,.!?\n]{1,40}?)지(?=[\s,.!?]|$)/;
const VERB_OR_NOT = /([^,.!?\n]{1,40}?)지\s*(?:말지|안\s*할지|않을지)/;
const VERB_ALONE = /([^,.!?\n]{1,40}?)지\s*(?:고민|망설|결정|생각)/;

// Leading words that set the scene ("19살,", "그때") rather than name a path.
const LEAD = /^(?:\d+\s*(?:살|세)\s*,?\s*|그때\s*|당시\s*|나는\s*|저는\s*|결국\s*)+/;

const HANGUL = 0xac00;
const jong = (ch: string) => (ch.charCodeAt(0) - HANGUL) % 28;
const withJong = (ch: string, j: number) => String.fromCharCode(ch.charCodeAt(0) - jong(ch) + j);
const endsInRieul = (s: string) => {
  const ch = s.at(-1) ?? "";
  return ch.charCodeAt(0) >= HANGUL && ch.charCodeAt(0) <= 0xd7a3 && jong(ch) === 8;
};

/** "아파트를 살" → "아파트를 산다", "밥을 먹을" → "밥을 먹는다". */
function declarative(future: string): string {
  if (future.endsWith("을")) return `${future.slice(0, -1)}는다`;
  return `${future.slice(0, -1)}${withJong(future.at(-1)!, 4)}다`;
}
/** "워홀을 갈" → "워홀을 가지 않는다". */
function negative(future: string): string {
  if (future.endsWith("을")) return `${future.slice(0, -1)}지 않는다`;
  return `${future.slice(0, -1)}${withJong(future.at(-1)!, 0)}지 않는다`;
}

/** The two paths the user was torn between, when the situation names them. */
export function pathsIn(situation: string): [string, string] | null {
  const clean = (x: string) => x.replace(LEAD, "").trim();
  const ok = (a: string, b: string) => a.length >= 2 && b.length >= 2 && a !== b;
  const m = situation.match(PAIR_PATTERNS[0]);
  if (m && ok(clean(m[1]), m[2].trim())) return [clean(m[1]), m[2].trim()];
  const yesNo = (x: string): [string, string] => [declarative(clean(x)), negative(clean(x))];
  const or = situation.match(VERB_OR_NOT);
  if (or && endsInRieul(or[1].trim())) return yesNo(or[1]);
  const v = situation.match(VERB_PAIR);
  if (v && endsInRieul(v[1].trim()) && endsInRieul(v[2].trim()) && ok(clean(v[1]), v[2].trim())) return [declarative(clean(v[1])), declarative(v[2].trim())];
  const alone = situation.match(VERB_ALONE);
  if (alone && endsInRieul(alone[1].trim())) return yesNo(alone[1]);
  for (const re of PAIR_PATTERNS.slice(1)) {
    const p = situation.match(re);
    if (p && ok(clean(p[1]), p[2].trim())) return [clean(p[1]), p[2].trim()];
  }
  return null;
}

const squash = (s: string) => s.replace(/[\s.,!?'"()~·]/g, "");
const bigrams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));

// Words that carry a path's meaning; two phrases sharing one are the same path told differently.
const CORE: [string, RegExp][] = [
  ["재수", /재수|삼수|다시\s?수능/],
  ["성적대로", /(성적|점수)에\s?맞춰/],
  ["결혼", /결혼|청혼|프러포즈/],
  ["헤어", /헤어|이별/],
  ["고백", /고백|마음을\s?전/],
  ["이직", /이직/],
  ["창업", /창업|사업|가게를?\s?(차|열)|카페를?\s?(차|열)/],
  ["유학", /유학/],
  ["이민", /이민/],
  ["워홀", /워홀|워킹\s?홀리데이/],
  ["전세", /전세/],
  ["매수", /집을?\s?(사|산|샀)|아파트를?\s?(사|산|샀)|매수|영끌/],
  ["주식", /주식|코인/],
  ["공무원", /공무원/],
  ["대학원", /대학원|석사|박사/],
  ["상경", /상경|서울/],
  ["남기", /남(?:아|았|는|기|을)/],
];
const negated = (s: string) => /(않|안\s|못\s|말았|포기|접었|접고)/.test(s);
const cores = (s: string) => new Set(CORE.filter(([, re]) => re.test(s)).map(([k]) => k));

/** Whether two phrases name the same path ("지방대 진학" and "재수하지 않고 지방대에 갔다"). */
export function samePath(a: string, b: string): boolean {
  const x = squash(a);
  const y = squash(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  // "결혼한다" and "결혼하지 않았다" share a word but are opposite paths.
  if (negated(a) === negated(b)) {
    const ca = cores(a);
    for (const k of cores(b)) if (ca.has(k)) return true;
  }
  const bx = bigrams(x);
  const by = bigrams(y);
  let shared = 0;
  for (const g of bx) if (by.has(g)) shared++;
  return shared / Math.min(bx.size, by.size) >= 0.5;
}

function hasBatchim(word: string): boolean | null {
  const ch = word.trim().at(-1);
  if (!ch) return null;
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[0-9LMNRlmnr]$/.test(ch) ? true : null;
  return code % 28 !== 0;
}

/** "재수" → "재수를 택한다"; a phrase that is already a sentence ("서울로 간다") stays as it is. */
export function asChoice(phrase: string): string {
  const p = phrase.trim().replace(/[.。]$/, "");
  if (/(다|자|기로)$/.test(p)) return p;
  const b = hasBatchim(p);
  return `${p}${b === null ? "을(를)" : b ? "을" : "를"} 택한다`;
}

// ── Paths that fit each kind of turning point ─────────

interface Ctx {
  age: number;
  student: boolean; // still in school at the turning point
  employed: boolean;
  partnered: boolean;
  university: string;
  major: string;
  hometown: string;
}

type Candidate = OpeningChoice & { when?: (c: Ctx) => boolean };

function pool(theme: TpTheme, c: Ctx): Candidate[] {
  const uni = c.university || "원하던 대학";
  const town = c.hometown.trim().split(/\s/)[0] || "고향";
  const inSeoul = /서울/.test(town);
  switch (theme) {
    case "exam":
      return [
        { label: "특목고·자사고 입시에 도전한다", preset: "study", education: "same", when: (x) => x.age <= 16 },
        { label: "집 가까운 학교에서 내신에 집중한다", preset: "family", education: "same", when: (x) => x.age <= 16 },
        { label: "재수해서 원하던 대학에 다시 도전한다", preset: "study", education: "highschool", when: (x) => x.age >= 17 && x.age <= 21 },
        { label: `점수에 맞춰 ${uni}에 바로 들어간다`, preset: "study", education: "university", when: (x) => x.age >= 17 && x.age <= 21 },
        { label: "전공을 바꿔 정말 하고 싶던 공부를 한다", preset: "study", education: "university", when: (x) => x.age >= 17 && x.age <= 25 },
        { label: "대학 대신 일찍 일을 시작한다", preset: "career", jobTitle: "사회초년생", education: "done", when: (x) => x.age >= 17 && x.age <= 24 },
        { label: "해외로 유학을 떠난다", preset: "move", education: "university", when: (x) => x.age >= 15 && x.age <= 25 },
        { label: "대학원에 진학해 공부를 이어간다", preset: "study", education: "graduate", when: (x) => x.age >= 21 },
        { label: "공무원 시험을 준비한다", preset: "career", jobTitle: "공무원", education: "done", when: (x) => x.age >= 20 },
      ];
    case "job":
      return [
        { label: "1년 더 준비해서 대기업 공채에 도전한다", preset: "career", place: "대기업", education: "done" },
        { label: "합격한 회사에 일단 입사한다", preset: "career", education: "done" },
        { label: "공무원 시험으로 방향을 바꾼다", preset: "career", jobTitle: "공무원", education: "done" },
        { label: "작은 스타트업에 합류해 빨리 배운다", preset: "career", place: "스타트업", education: "done" },
        { label: "대학원에 가서 전문성을 쌓는다", preset: "study", education: "graduate" },
        { label: "워킹홀리데이로 해외에서 일해 본다", preset: "move", when: (x) => x.age <= 30 },
      ];
    case "career":
      return [
        { label: "지금 회사에 남아 자리를 지킨다", preset: "family", when: (x) => x.employed },
        { label: "더 큰 회사로 이직한다", preset: "career", when: (x) => x.employed },
        { label: "모아 둔 돈으로 내 사업을 시작한다", preset: "risk", jobTitle: "사업가" },
        { label: "회사를 다니며 부업으로 먼저 시험해 본다", preset: "career", when: (x) => x.employed },
        { label: "잠시 쉬면서 다음 길을 고민한다", preset: "rest" },
        { label: "대학원에 가서 다른 분야로 옮긴다", preset: "study", education: "graduate" },
      ];
    case "love":
      return [
        { label: "용기를 내 그 사람에게 마음을 전한다", preset: "love", when: (x) => !x.partnered },
        { label: "그 사람과 결혼한다", preset: "love", when: (x) => x.age >= 24 },
        { label: "헤어지고 내 길에 집중한다", preset: "study" },
        { label: "결혼은 미루고 조금 더 기다린다", preset: "career", when: (x) => x.age >= 24 },
        { label: "그 사람을 따라 낯선 도시로 간다", preset: "move" },
        { label: "가족의 반대를 받아들인다", preset: "family" },
      ];
    case "move":
      return [
        { label: inSeoul ? "서울을 떠나 지방에서 새로 시작한다" : `${town}을 떠나 서울로 올라간다`, preset: "move" },
        { label: `${town}에 남아 가족 곁을 지킨다`, preset: "family" },
        { label: "해외로 이민을 떠난다", preset: "move", when: (x) => x.age >= 22 },
        { label: "해외에서 공부하며 기회를 찾는다", preset: "study", education: "graduate", when: (x) => x.age >= 21 && x.age <= 35 },
        { label: "워킹홀리데이로 1년 살아 본다", preset: "move", when: (x) => x.age <= 30 },
      ];
    case "invest":
      return [
        { label: "대출을 받아서라도 집을 산다", preset: "risk" },
        { label: "전세로 버티며 돈을 모은다", preset: "family" },
        { label: "모아 둔 돈을 주식에 건다", preset: "risk" },
        { label: "투자는 접고 일에 집중한다", preset: "career", when: (x) => x.employed },
        { label: "집값이 싼 지역으로 옮겨 내 집을 마련한다", preset: "move" },
      ];
    case "other":
      return [];
  }
}

// When the user's words don't point anywhere, paths that fit their age.
function byAge(c: Ctx): Candidate[] {
  if (c.age < 17)
    return [
      { label: "공부에 모든 걸 걸어 본다", preset: "study", education: "same" },
      { label: "좋아하던 운동이나 음악에 깊이 빠져 본다", preset: "rest" },
      { label: "친구들 곁에 남겠다고 부모님을 설득한다", preset: "family" },
    ];
  if (c.student)
    return [
      { label: "원하던 공부에 끝까지 매달린다", preset: "study", education: "highschool" },
      { label: "일찍 사회에 나가 돈을 번다", preset: "career", jobTitle: "사회초년생", education: "done" },
      { label: "낯선 도시의 학교로 떠난다", preset: "move", education: c.university ? "university" : "same" },
    ];
  if (c.age < 30)
    return [
      { label: "더 큰 회사, 더 큰 무대로 간다", preset: "career", place: "대기업" },
      { label: "하고 싶던 일에 모험을 건다", preset: "risk", jobTitle: "창업가" },
      { label: "그 사람에게 마음을 전한다", preset: "love" },
    ];
  return [
    { label: "모든 걸 걸고 새로운 일을 시작한다", preset: "risk", jobTitle: "사업가" },
    { label: "가족과 보내는 시간을 택한다", preset: "family" },
    { label: "삶의 터전을 옮긴다", preset: "move" },
  ];
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The road not taken, read from the situation, phrased as a path to pick. */
export function roadNotTaken(tp: TurningPoint): string | null {
  const pair = pathsIn(tp.situation);
  if (!pair) return null;
  const [a, b] = pair;
  const actual = tp.actualChoice.trim();
  if (!actual) return null;
  if (samePath(a, actual) && !samePath(b, actual)) return b;
  if (samePath(b, actual) && !samePath(a, actual)) return a;
  // "갈지 말지": a short "갔다" means they did it; anything else that isn't a "no" means they didn't.
  if (negated(b) && !negated(a)) {
    if (negated(actual)) return a;
    return squash(actual).length <= 4 ? b : a;
  }
  return null;
}

/** Two other paths for this turning point: the one the user names first, then ones that fit its kind, age and regret. */
export function alternativePaths(profile: Profile, tp: TurningPoint): Path[] {
  const mi = turningPointMi(tp);
  const age = ageAt(profile.birthDate, mi);
  const init = heuristicInitial(profile, tp);
  const ctx: Ctx = {
    age,
    student: age < 20,
    employed: init.employed,
    partnered: init.partner === "dating" || init.partner === "married" || /사귄|사귀던|사귀고|여자\s?친구|남자\s?친구|애인|연인|약혼|아내|남편|배우자/.test(tp.situation),
    university: profile.university.trim(),
    major: profile.major.trim(),
    hometown: profile.hometown,
  };
  const actual = tp.actualChoice.trim();
  const picked: OpeningChoice[] = [];
  // Paths already on the table: the one actually taken, both the user named, and those picked so far.
  const pair = pathsIn(tp.situation);
  const named = [actual, ...(pair ?? [])].filter(Boolean);
  const taken = (label: string) => named.some((n) => samePath(label, n)) || picked.some((p) => samePath(p.label, label));

  // 1. The other path the user wrote down ("A와 B 사이에서"); both when no actual choice is given,
  //    and the second-named when we can't tell which one they took.
  const road = roadNotTaken(tp);
  const own = road ? [road] : pair ? (actual ? [pair[1]] : pair) : [];
  for (const phrase of own) {
    // Not doing something ("가지 않는다") means staying where they are.
    const preset = negated(phrase) ? "family" : (presetOf(phrase) ?? "risk");
    picked.push({
      label: asChoice(phrase),
      preset,
      jobTitle: /공무원/.test(phrase) ? "공무원" : /창업|사업/.test(phrase) ? "창업가" : "",
      place: /대기업/.test(phrase) ? "대기업" : /스타트업/.test(phrase) ? "스타트업" : "",
      education: preset === "study" ? (/대학원|석사|박사/.test(phrase) ? "graduate" : /재수|삼수|수능/.test(phrase) ? "highschool" : ctx.student ? "university" : "same") : "same",
    });
  }

  // 2. Paths that fit the kind of turning point, leaning toward what the regret hints at.
  const theme = themeOf(tp);
  const wish = presetOf(tp.regret);
  const actualPreset = presetOf(actual);
  const fits = pool(theme, ctx).filter((c) => !c.when || c.when(ctx));
  const seed = hash(`${tp.date}|${tp.situation}|${actual}`);
  const rank = (c: Candidate, i: number) =>
    (wish && c.preset === wish ? -10 : 0) + (actualPreset && c.preset === actualPreset ? 5 : 0) + (picked.some((p) => p.preset === c.preset) ? 3 : 0) + ((i + seed) % fits.length) / 10;
  const ordered = fits.map((c, i) => [c, rank(c, i)] as const).sort((x, y) => x[1] - y[1]).map(([c]) => c);
  for (const c of [...ordered, ...byAge(ctx)]) {
    if (picked.length >= 2) break;
    if (!taken(c.label)) picked.push(c);
  }
  return picked.slice(0, 2).map(({ label, preset, jobTitle, place, education }) => ({ label, preset, jobTitle: jobTitle ?? "", place: place ?? "", original: false, education: education ?? "same" }));
}

const THEME_NAMES: Record<TpTheme, string> = { exam: "입시", job: "취업", love: "연애·결혼", career: "이직·창업", move: "이사·이민", invest: "투자", other: "기타" };

/** What the rules read from the turning point, handed to the AI so its paths start from the same place. */
export function pathHints(profile: Profile, tp: TurningPoint) {
  const road = roadNotTaken(tp);
  return { kind: THEME_NAMES[themeOf(tp)], roadNotTaken: road ? asChoice(road) : null, examples: alternativePaths(profile, tp).map((c) => c.label) };
}

/** Fills the AI's paths up to three with rule-based ones when it returned fewer. */
export function topUpChoices(choices: Path[], profile: Profile, tp: TurningPoint): Path[] {
  const out = choices.slice(0, 3);
  for (const c of alternativePaths(profile, tp)) {
    if (out.length >= 3) break;
    if (!out.some((o) => samePath(o.label, c.label))) out.push(c);
  }
  return out;
}
