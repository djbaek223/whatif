// Makes each life its own: temperament and past choices change which moments come up and how often.
import type { Effect, EventDef } from "./events";
import type { Axis, Category, LifeState, Profile, Temper, Theme, Traits } from "./types";

export const THEMES: Theme[] = ["career", "study", "family", "love", "risk", "money", "health", "leisure"];

const EVENT_THEME: Record<string, Theme> = {
  csat: "study",
  military: "career",
  graduation: "career",
  "grad-done": "study",
  "job-search": "career",
  "job-offer": "career",
  "startup-itch": "risk",
  layoff: "career",
  retirement: "career",
  crush: "love",
  marriage: "love",
  baby: "family",
  "marriage-crisis": "love",
  "parent-care": "family",
  house: "money",
  investment: "risk",
  "health-warning": "health",
  "golden-years": "leisure",
  promotion: "career",
  illness: "health",
  "old-friend": "love",
  "drift-apart": "love",
  "spouse-loss": "family",
};

const KEYWORDS: [Theme, RegExp][] = [
  ["risk", /도전|모험|사업|창업|즉흥|충동|대담|자유/],
  ["family", /가족|아이|부모|효도|가정|육아/],
  ["study", /공부|책|연구|배우|호기심|분석|논리/],
  ["health", /운동|건강|등산|달리기|요가/],
  ["money", /돈|재테크|투자|절약|저축|부동산|현실적/],
  ["career", /성실|일|성공|야망|욕심|완벽|책임|승진/],
  ["love", /사람|친구|연애|사교|외향|다정|공감/],
  ["leisure", /여행|취미|음악|게임|여유|느긋|쉬/],
];

/** Leanings read from MBTI and how the person describes themselves. Each is roughly -0.3..0.3. */
export function traitsFrom(profile: Profile, persona = ""): Traits {
  const t = Object.fromEntries(THEMES.map((k) => [k, 0])) as Traits;
  const m = profile.mbti.toUpperCase();
  const add = (k: Theme, v: number) => (t[k] += v);
  const LETTERS: [string, [Theme, number][]][] = [
    ["E", [["love", 0.1], ["leisure", 0.04]]],
    ["I", [["study", 0.08], ["love", -0.04]]],
    ["N", [["risk", 0.08], ["study", 0.04]]],
    ["S", [["money", 0.08], ["career", 0.04]]],
    ["T", [["career", 0.1]]],
    ["F", [["family", 0.1], ["love", 0.05]]],
    ["J", [["money", 0.06], ["career", 0.05], ["risk", -0.05]]],
    ["P", [["risk", 0.08], ["leisure", 0.06]]],
  ];
  for (const [letter, adds] of LETTERS) if (m.includes(letter)) for (const [k, v] of adds) add(k, v);
  const text = `${profile.personality} ${persona}`;
  for (const [k, re] of KEYWORDS) if (re.test(text)) add(k, 0.15);
  for (const k of THEMES) t[k] = Math.max(-0.3, Math.min(0.3, Math.round(t[k] * 100) / 100));
  return t;
}

/** What an outcome is mostly about, read from what it changes. */
export function effectTheme(e: Effect): Theme {
  if (e.startBusiness) return "risk";
  if (e.hire || e.switchJob || e.promote || e.flags?.employed !== undefined || e.flags?.job !== undefined) return "career";
  if (e.enroll || e.eduYears || e.flags?.education) return "study";
  if (e.addChild || e.flags?.noKids) return "family";
  if (e.flags?.partner) return "love";
  if (e.buyHome || e.wealthPct) return "money";
  if (e.risk && (e.wealth ?? 0) < 0) return "risk";
  const st = e.stats ?? {};
  const top = (Object.entries(st) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] <= 0) return e.risk ? "risk" : "leisure";
  return ({ health: "health", happiness: "leisure", knowledge: "study", relationships: "love" } as Record<string, Theme>)[top[0]];
}

export function eventTheme(ev: EventDef): Theme {
  if (ev.theme) return ev.theme;
  if (EVENT_THEME[ev.id]) return EVENT_THEME[ev.id];
  const e = ev.effect ?? ev.choices?.[0]?.effect;
  return e ? effectTheme(e) : "leisure";
}

/** How much this life is drawn to a theme: temperament plus what past choices leaned toward. */
export function affinity(s: LifeState, theme: Theme): number {
  const trait = s.traits?.[theme] ?? 0;
  const lean = Math.min(0.25, (s.leanings?.[theme] ?? 0) * 0.07);
  return Math.max(-0.35, Math.min(0.45, trait + lean));
}

/** Records a choice: its theme grows, older leanings fade a little. */
export function lean(s: LifeState, theme: Theme) {
  const next: Partial<Record<Theme, number>> = {};
  for (const k of THEMES) {
    const v = (s.leanings?.[k] ?? 0) * 0.92 + (k === theme ? 1 : 0);
    if (v > 0.05) next[k] = Math.round(v * 100) / 100;
  }
  s.leanings = next;
}

/** Affinity relative to this life's average, so temperament reshapes what happens without making life busier overall. */
export function relativeAffinity(s: LifeState, theme: Theme): number {
  const mean = THEMES.reduce((sum, k) => sum + affinity(s, k), 0) / THEMES.length;
  return affinity(s, theme) - mean;
}

// ── Temperament ────────────────────────────────────────

const AXIS_WORDS: [Axis, RegExp, RegExp][] = [
  ["outgoing", /외향|사교|활발|친구\s?많|수다|사람\s?좋아|분위기\s?메이커/, /내향|조용|낯가림|혼자|소심|집순이|집돌이/],
  ["bold", /도전|모험|즉흥|충동|대담|과감|자유|호기심/, /안정|무난|겁|보수적/],
  ["careful", /신중|꼼꼼|계획|성실|완벽|현실적|절약|원칙/, /덤벙|대충|게으|즉흥/],
  ["warm", /다정|공감|배려|정\s?많|착한|따뜻|감성/, /냉정|이성적|논리|직설/],
];

/** Temperament from MBTI letters and the self-description. Each axis is -1..1, 0 when nothing is known. */
export function temperFrom(profile: Profile, persona = ""): Temper {
  const m = profile.mbti.toUpperCase();
  const t: Temper = { outgoing: 0, bold: 0, careful: 0, warm: 0 };
  if (/^[EI][NS][TF][JP]$/.test(m)) {
    t.outgoing += m[0] === "E" ? 0.5 : -0.5;
    t.bold += (m[1] === "N" ? 0.25 : -0.15) + (m[3] === "P" ? 0.25 : -0.15);
    t.careful += m[3] === "J" ? 0.45 : -0.3;
    t.warm += m[2] === "F" ? 0.5 : -0.4;
  }
  const text = `${profile.personality} ${persona}`;
  for (const [axis, plus, minus] of AXIS_WORDS) {
    if (plus.test(text)) t[axis] += 0.45;
    if (minus.test(text)) t[axis] -= 0.45;
  }
  for (const k of Object.keys(t) as Axis[]) t[k] = Math.max(-1, Math.min(1, Math.round(t[k] * 100) / 100));
  return t;
}

/** Temperament weights for events written before the larger pool; newer events carry their own. */
export const ID_TEMPER: Record<string, Partial<Record<Axis, number>>> = {
  "blind-date": { outgoing: 0.6 },
  club: { outgoing: 0.7 },
  mt: { outgoing: 0.5 },
  concert: { outgoing: 0.5, bold: 0.2 },
  "team-dinner": { outgoing: 0.4 },
  reunion: { outgoing: 0.6, warm: 0.2 },
  "trip-abroad": { bold: 0.5, outgoing: 0.2 },
  exchange: { bold: 0.7 },
  "startup-itch": { bold: 0.9, careful: -0.5 },
  investment: { bold: 0.7, careful: -0.4 },
  "scam-call": { careful: -0.8 },
  "lost-wallet": { careful: -0.7 },
  "fender-bender": { careful: -0.6 },
  certificate: { careful: 0.6 },
  exercise: { careful: 0.3 },
  hobby: { bold: 0.3 },
  "class-president": { outgoing: 0.7 },
  "friend-fallout": { warm: -0.4 },
  "parent-care": { warm: 0.4 },
  "dating-fight": { warm: -0.4 },
};

/** How much more (or less) often an event comes up for this temperament: e^(sum of axis × weight), within 0.4..2.5. */
export function temperFactor(s: LifeState, weights: Partial<Record<Axis, number>> | undefined): number {
  if (!weights) return 1;
  const t = s.temper ?? (s.temper = temperFrom(s.profile, s.persona));
  let x = 0;
  for (const [k, w] of Object.entries(weights) as [Axis, number][]) x += (t[k] ?? 0) * w;
  return Math.max(0.4, Math.min(2.5, Math.exp(x)));
}

const THEME_CATEGORY: Record<Theme, Category> = {
  career: "work",
  study: "daily",
  family: "relation",
  love: "relation",
  risk: "money",
  money: "money",
  health: "health",
  leisure: "daily",
};

const ID_CATEGORY: Record<string, Category> = {
  lottery: "chance",
  "scam-call": "chance",
  "lost-wallet": "chance",
  "fender-bender": "chance",
  "old-friend": "relation",
  "first-phone": "era",
  "smartphone-class": "era",
  personal: "daily",
};

/** The category an event counts under: its own, a known one for older events, or one read from its theme. */
export function eventCategory(ev: EventDef): Category {
  return ev.category ?? ID_CATEGORY[ev.id] ?? THEME_CATEGORY[eventTheme(ev)];
}
