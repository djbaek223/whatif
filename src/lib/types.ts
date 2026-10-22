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
}

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
  original?: boolean;
  education?: Exclude<Education, "school"> | "same";
}

export interface PendingChoice {
  eventId: string; // "turning-point" for the first choice
  title: string;
  scene: string;
  options: { id: string; label: string }[];
  freeText: boolean;
}

export type LogKind = "era" | "turn" | "event" | "choice" | "outcome" | "milestone" | "present" | "death";

export interface LogEntry {
  mi: number; // month index (year * 12 + month - 1)
  kind: LogKind;
  text: string;
  delta?: Partial<Stats>;
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
}

export interface Ending {
  title: string;
  memoir: string;
  epitaph: string;
  comparison: string;
}
