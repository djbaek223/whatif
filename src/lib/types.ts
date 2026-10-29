export type StatKey = "health" | "happiness" | "knowledge" | "relationships";
export type Stats = Record<StatKey, number>;

export const STAT_LABELS: Record<StatKey, string> = {
  health: "건강",
  happiness: "행복",
  knowledge: "지식",
  relationships: "관계",
};

export type Gender = "남" | "여" | "기타" | "";

export interface Profile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  hometown: string;
  elementary: string;
  middle: string;
  high: string;
  university: string;
  universityYear?: string; // YYYY entered; missing or empty means the usual year (straight from high school)
  major: string;
  family: string;
  mbti: string;
  personality: string;
  currentLife: string;
}

export interface TurningPoint {
  date: string; // YYYY-MM
  situation: string;
  actualChoice: string;
  regret: string;
  kind?: string; // 입시, 취업, 연애·결혼 ... picked before the date; missing in saves from before it existed
}

export type Education = "school" | "highschool" | "university" | "graduate" | "done";
export type Partner = "none" | "dating" | "married" | "divorced" | "widowed";

export interface LifeFlags {
  education: Education;
  eduUntil: number; // month index when current schooling ends
  employed: boolean;
  job: string;
  partner: Partner;
  children: number;
  homeOwner: boolean;
  retired: boolean;
  military: boolean;
  busyUntil: number; // month index; no choice events while busy (e.g. military service)
  noKids: boolean;
  kidsBorn?: number[]; // month index of each child's birth (missing in lives saved before it existed)
  pet?: boolean;
  petSince?: number;
  // Concrete facts added later; optional so lives saved before them still load.
  company?: string; // current employer, empty when not working
  school?: string; // current or last school
  tuition?: number; // 만원 / 년, while enrolled
  workMonths?: number; // months worked so far, for titles and experienced pay
  homeArea?: string;
  homeValue?: number; // 만원, current market price of the home
  mortgage?: number; // 만원, outstanding loan
}

/** What a choice is about. Temperament and past choices make some themes come up more often. */
export type Theme = "career" | "study" | "family" | "love" | "risk" | "money" | "health" | "leisure";
export type Traits = Record<Theme, number>; // -0.3..0.3 around a neutral 0

export type Preset =
  | "original"
  | "study"
  | "career"
  | "risk"
  | "love"
  | "move"
  | "family"
  | "health"
  | "rest";

export interface OpeningChoice {
  label: string;
  preset: Preset;
  jobTitle?: string;
  place?: string; // company or school this choice leads to
  original?: boolean;
  education?: Exclude<Education, "school"> | "same";
}

/** Concrete details fixed when a choice is offered, so the label and the outcome name the same place and pay. */
export interface OptionPlan {
  kind?: "hire" | "switch" | "enroll" | "home" | "cost";
  risky?: boolean; // the plan holds only if the option's gamble works out
  place?: string; // company or school
  tier?: string; // CompanyTier of place
  salary?: number; // 만원 / 년
  tuition?: number; // 만원 / 년
  price?: number; // 만원, home price
  loan?: number; // 만원
  from?: number; // 만원 / 년, salary before a move
  cost?: number; // 만원, money in (+) or out (-)
}

export interface PendingOption {
  id: string;
  label: string;
  detail?: string; // e.g. "네이버 · 연봉 약 6,200만원"
  plan?: OptionPlan;
  theme?: Theme;
}

/** A choice written by the AI for this life. Numbers are clamped by the engine before use. */
export interface CustomOption {
  outcome: string;
  stats: Partial<Stats>;
  money: number; // 만원
  change: CustomChange;
  chance: number; // 1 = always works
  failure: string;
}

export type CustomChange =
  | "none"
  | "hire"
  | "switchJob"
  | "quitJob"
  | "enrollUniversity"
  | "enrollGraduate"
  | "buyHome"
  | "addChild"
  | "startDating"
  | "marry"
  | "retire";

export interface PendingChoice {
  eventId: string; // "turning-point" for the first choice
  title: string;
  scene: string;
  options: PendingOption[];
  freeText: boolean;
  custom?: Record<string, CustomOption>; // AI-written moments carry their own effects
  rare?: boolean; // shown on a special card and kept for the ending
  tone?: string; // AI moments: 유쾌함, 뭉클함, 긴장감, 담담함
  small?: boolean; // a small two-way dilemma rather than a life fork
}

/** What an event is about, for spreading events evenly over a life: daily life, people, work, money, health, the times, luck. */
export type Category = "daily" | "relation" | "work" | "money" | "health" | "era" | "chance";

export const CATEGORY_LABELS: Record<Category, string> = {
  daily: "일상",
  relation: "관계",
  work: "일",
  money: "돈",
  health: "건강",
  era: "시대",
  chance: "우연",
};

/** Temperament axes read from MBTI and self-description, each -1..1. */
export type Axis = "outgoing" | "bold" | "careful" | "warm";
export type Temper = Record<Axis, number>;

/** A rare moment (1% a year or less), kept for the ending. */
export interface RareMoment {
  mi: number;
  age: number;
  title: string;
  text: string;
}

export type LogKind = "era" | "news" | "turn" | "event" | "choice" | "outcome" | "milestone" | "present" | "death";

export interface LogEntry {
  mi: number; // month index (year * 12 + month - 1)
  kind: LogKind;
  text: string;
  delta?: Partial<Stats>;
  tag?: string; // news category and month, e.g. "스포츠 · 6월"
  money?: number; // 만원 change in wealth caused by this entry
  rare?: boolean; // a rare moment, shown on a special card
  reaction?: string; // news only: how the headline touched this life, drawn as the player's own line
  facts?: string[]; // turn only: job and pay, drawn as chips before the text
}

export interface ChoiceRecord {
  mi: number;
  age: number;
  title: string;
  picked: string;
}

export interface LifeState {
  version: 1;
  profile: Profile;
  turningPoint: TurningPoint;
  persona: string;
  mi: number;
  stats: Stats;
  wealth: number; // 만원
  income: number; // 만원 / 월
  flags: LifeFlags;
  log: LogEntry[];
  pending: PendingChoice | null;
  openingChoices: OpeningChoice[];
  rng: number;
  cooldowns: Record<string, number>;
  done: string[]; // ids of once-only events that already happened
  intenseUntil: number;
  presentShown: boolean;
  dead: boolean;
  deathAge: number | null;
  choices: ChoiceRecord[];
  history: { year: number; stats: Stats }[]; // one snapshot per simulated year, for the life graph
  traits?: Traits; // from MBTI and self-description
  leanings?: Partial<Record<Theme, number>>; // what past choices leaned toward
  ai?: boolean; // AI narration on: allows moments written for this life
  // Added with the larger event pool; optional so older saves still load.
  temper?: Temper;
  counts?: Record<string, number>; // times each event has happened
  marks?: Record<string, number>; // month index when a chain step happened, e.g. "biz-offer"
  seeds?: string[]; // people and threads from earlier events the narrator can pick up again
  recent?: string[]; // "category:keyword,keyword" of recent moments, so the narrator avoids repeats
  rares?: RareMoment[];
  badges?: { id: string; mi: number; age: number }[]; // achievements, in the order they were earned
}

export interface Ending {
  title: string;
  memoir: string;
  epitaph: string;
  comparison: string;
}
