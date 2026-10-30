// Suggested paths for an American turning point, read from English words. Same idea as narrator/turningChoices.ts:
// the other road the player names first, then paths that fit the kind of turning point, their age and their regret.
import { T } from "../../lib/i18n";
import type { OpeningChoice, Preset } from "../../lib/types";

export type TpTheme = "exam" | "job" | "love" | "career" | "move" | "invest" | "other";

export const THEME_WORDS: [TpTheme, RegExp][] = [
  ["exam", /\b(college|university|school|SAT|ACT|appl(y|ied|ication)|admission|major|transfer|grad school|scholarship|dropout|drop out|grades?|community college)\b/gi],
  ["job", /\b(job|hired|offer|interview|internship|intern|resume|first job|new grad|apply for|career fair|government job|enlist)\b/gi],
  ["career", /\b(quit|resign|startup|start(ed)? a business|my own business|promotion|side hustle|freelanc\w*|company|shop|store|restaurant|salary|raise|career change)\b/gi],
  ["love", /\b(marry|married|marriage|wedding|propos\w*|girlfriend|boyfriend|dating|date|break up|broke up|divorce|engaged|crush|ex|love|relationship|partner)\b/gi],
  ["move", /\b(move|moved|moving|relocat\w*|abroad|overseas|hometown|leave town|left town|New York|California|Texas|Europe|another state|across the country|study abroad|Peace Corps)\b/gi],
  ["invest", /\b(invest\w*|stocks?|crypto|bitcoin|house|home|condo|mortgage|rent|renting|real estate|down payment|401\(?k\)?|savings)\b/gi],
];

export const PRESET_WORDS: [Preset, RegExp][] = [
  ["love", /\b(marry|propos\w*|ask (her|him|them) out|tell (her|him|them)|confess|date|stay together|win (her|him|them) back)\b/i],
  ["risk", /\b(startup|start a business|own business|open a|shop|café|cafe|restaurant|invest|stocks?|crypto|all in|freelanc\w*|YouTube|band|music career)\b/i],
  ["study", /\b(gap year|reapply|study|grad school|master'?s|PhD|law school|med school|transfer|major|degree|college|university|certificat\w*|study abroad)\b/i],
  ["career", /\b(job|hired|offer|company|government|internship|full-time|work at|corporate|enlist|army|navy|air force|marines)\b/i],
  ["move", /\b(move|moving|relocat\w*|abroad|overseas|hometown|leave|left|another state|New York|California|city|transfer to)\b/i],
  ["family", /\b(family|kids?|children|parents?|mom|dad|mother|father|stay close|take care)\b/i],
  ["rest", /\b(rest|take a break|time off|sabbatical|travel|backpack)\b/i],
  ["health", /\b(hospital|exercise|health|treatment|surgery|rehab)\b/i],
];

export const presetOf = (text: string): Preset | null => PRESET_WORDS.find(([, re]) => re.test(text))?.[0] ?? null;

export const negated = (s: string) => /\b(not|n't|never|gave up|give up|stay(ed)? put|turn(ed)? (it )?down|pass(ed)? on)\b/i.test(s);

const LEAD = /^(?:at \d+,?\s*|when i was \d+,?\s*|back then,?\s*|i\s+|whether to\s+|to\s+)+/i;

/** The two paths the player was torn between, when the situation names them. */
export function pathsIn(situation: string): [string, string] | null {
  const clean = (x: string) => x.replace(LEAD, "").replace(/[.,!?]+$/, "").trim();
  const ok = (a: string, b: string) => a.length >= 2 && b.length >= 2 && a.toLowerCase() !== b.toLowerCase();
  const patterns = [
    /between\s+([^,.!?\n]{2,60}?)\s+and\s+([^,.!?\n]{2,60})/i,
    /whether to\s+([^,.!?\n]{2,60}?)\s+or not\b/i,
    /whether to\s+([^,.!?\n]{2,60}?)\s+or\s+([^,.!?\n]{2,60})/i,
    /([^,.!?\n]{2,60}?)\s+(?:vs\.?|versus)\s+([^,.!?\n]{2,60})/i,
    /(?:should I|could)\s+([^,.!?\n]{2,60}?)\s+or\s+([^,.!?\n]{2,60})/i,
  ];
  for (const re of patterns) {
    const m = situation.match(re);
    if (!m) continue;
    if (m[2] === undefined) return [clean(m[1]), `Don't ${clean(m[1])}`];
    if (ok(clean(m[1]), clean(m[2]))) return [clean(m[1]), clean(m[2])];
  }
  return null;
}

/** "a gap year" → "Go with a gap year"; a phrase that starts with a verb ("move to Austin") is capitalized as it is. */
export function asChoice(phrase: string): string {
  const p = phrase.trim().replace(/[.]$/, "");
  const verb = /^(go|stay|take|move|quit|start|open|marry|break|ask|tell|apply|accept|turn|join|enlist|buy|keep|sell|leave|study|transfer|work|try|wait|say|don't|do|get|find|follow|reapply|put)\b/i;
  const cap = p.charAt(0).toUpperCase() + p.slice(1);
  return verb.test(p) ? cap : `Go with ${p}`;
}

export interface Ctx {
  age: number;
  student: boolean;
  employed: boolean;
  partnered: boolean;
  university: string;
  hometown: string;
}

export type Candidate = OpeningChoice & { when?: (c: Ctx) => boolean };

export function usPool(theme: TpTheme, c: Ctx): Candidate[] {
  const uni = c.university || T("my dream school");
  const town = c.hometown.trim().split(",")[0] || T("my hometown");
  switch (theme) {
    case "exam":
      return [
        { label: T("Apply to a magnet high school"), preset: "study", education: "same", when: (x) => x.age <= 15 },
        { label: T("Stay at the local school and focus on grades"), preset: "family", education: "same", when: (x) => x.age <= 15 },
        { label: T("Take a gap year and reapply"), preset: "study", education: "highschool", when: (x) => x.age >= 17 && x.age <= 20 },
        { label: T`Go to ${uni} this fall`, preset: "study", education: "university", when: (x) => x.age >= 17 && x.age <= 21 },
        { label: T("Start at community college and transfer"), preset: "family", education: "university", when: (x) => x.age >= 17 && x.age <= 21 },
        { label: T("Switch to the major I really wanted"), preset: "study", education: "university", when: (x) => x.age >= 18 && x.age <= 24 },
        { label: T("Skip college and start working"), preset: "career", jobTitle: "Entry-level worker", education: "done", when: (x) => x.age >= 17 && x.age <= 24 },
        { label: T("Enlist in the military"), preset: "career", jobTitle: "Private", education: "done", when: (x) => x.age >= 17 && x.age <= 26 },
        { label: T("Go to grad school"), preset: "study", education: "graduate", when: (x) => x.age >= 21 },
      ];
    case "job":
      return [
        { label: T("Hold out a year for a big-name company"), preset: "career", place: "Fortune 500 company", education: "done" },
        { label: T("Take the offer I already have"), preset: "career", education: "done" },
        { label: T("Go for a stable government job"), preset: "career", jobTitle: "Government employee", education: "done" },
        { label: T("Join a small startup and learn fast"), preset: "career", place: "startup", education: "done" },
        { label: T("Go to grad school first"), preset: "study", education: "graduate" },
        { label: T("Teach English abroad for a year"), preset: "move", when: (x) => x.age <= 30 },
      ];
    case "career":
      return [
        { label: T("Stay at my company and hold my ground"), preset: "family", when: (x) => x.employed },
        { label: T("Move to a bigger company"), preset: "career", when: (x) => x.employed },
        { label: T("Start my own business with my savings"), preset: "risk", jobTitle: "Business owner" },
        { label: T("Keep my job and test it as a side hustle"), preset: "career", when: (x) => x.employed },
        { label: T("Take time off to figure out what's next"), preset: "rest" },
        { label: T("Go back to school for a new field"), preset: "study", education: "graduate" },
      ];
    case "love":
      return [
        { label: T("Work up the nerve and tell them how I feel"), preset: "love", when: (x) => !x.partnered },
        { label: T("Marry them"), preset: "love", when: (x) => x.age >= 22 },
        { label: T("Break up and focus on my own path"), preset: "study" },
        { label: T("Hold off on marriage a little longer"), preset: "career", when: (x) => x.age >= 22 },
        { label: T("Follow them to a new city"), preset: "move" },
        { label: T("Go along with what my family wants"), preset: "family" },
      ];
    case "move":
      return [
        { label: T`Leave ${town} for New York`, preset: "move" },
        { label: T`Stay in ${town}, close to family`, preset: "family" },
        { label: T("Move abroad for good"), preset: "move", when: (x) => x.age >= 22 },
        { label: T("Study abroad and look for a way in"), preset: "study", education: "graduate", when: (x) => x.age >= 21 && x.age <= 35 },
        { label: T("Move across the country for a fresh start"), preset: "move", when: (x) => x.age <= 40 },
      ];
    case "invest":
      return [
        { label: T("Stretch and buy the house"), preset: "risk" },
        { label: T("Keep renting and save up"), preset: "family" },
        { label: T("Put my savings into the stock market"), preset: "risk" },
        { label: T("Forget investing and focus on work"), preset: "career", when: (x) => x.employed },
        { label: T("Move somewhere cheaper and buy there"), preset: "move" },
      ];
    case "other":
      return [];
  }
}

export function usByAge(c: Ctx): Candidate[] {
  if (c.age < 13)
    return [
      { label: T("Get serious about school"), preset: "study" },
      { label: T("Join a team or pick up an instrument"), preset: "health" },
      { label: T("Switch to a school across town"), preset: "move" },
    ];
  if (c.age < 17)
    return [
      { label: T("Throw myself into school"), preset: "study", education: "same" },
      { label: T("Go all in on sports or music"), preset: "rest" },
      { label: T("Talk my parents into staying near my friends"), preset: "family" },
    ];
  if (c.student)
    return [
      { label: T("Stick with the studies I wanted"), preset: "study", education: "highschool" },
      { label: T("Start working and earning early"), preset: "career", jobTitle: "Entry-level worker", education: "done" },
      { label: T("Go to school in a city I've never lived in"), preset: "move", education: c.university ? "university" : "same" },
    ];
  if (c.age < 30)
    return [
      { label: T("Aim for a bigger company and a bigger stage"), preset: "career", place: "Fortune 500 company" },
      { label: T("Take a risk on what I always wanted to do"), preset: "risk", jobTitle: "Founder" },
      { label: T("Tell that person how I feel"), preset: "love" },
    ];
  return [
    { label: T("Bet everything on something new"), preset: "risk", jobTitle: "Business owner" },
    { label: T("Choose more time with family"), preset: "family" },
    { label: T("Pick up and move"), preset: "move" },
  ];
}

export const US_KIND_NAMES: Record<TpTheme, string> = { exam: "school", job: "first job", love: "love and marriage", career: "career change", move: "moving", invest: "money and home", other: "other" };

export const partneredWords = /\b(girlfriend|boyfriend|dating|engaged|fianc[eé]e?|wife|husband|spouse|partner|my ex)\b/i;
