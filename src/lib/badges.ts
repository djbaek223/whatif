// Achievements: milestones read off the life's state after every step, kept on the life so the ending can show them.
import { tierOf } from "./catalog";
import { ageOf } from "./events";
import { ownsBusiness } from "./work";
import type { LifeState } from "./types";
import { L } from "./i18n";

export interface BadgeDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  test: (s: LifeState, age: number) => boolean;
}

export interface EarnedBadge {
  id: string;
  mi: number;
  age: number;
}

const working = (s: LifeState) => s.flags.employed && !s.flags.retired;

export const BADGES: BadgeDef[] = [
  { id: "first-job", icon: "💼", get name() { return L("첫 출근"); }, get desc() { return L("처음으로 일을 시작했다"); }, test: (s) => working(s) },
  { id: "big-corp", icon: "🏢", get name() { return L("대기업 입성"); }, get desc() { return L("대기업·IT 대기업·외국계에 들어갔다"); }, test: (s) => working(s) && ["large", "it", "foreign"].includes(tierOf(s.flags.company) ?? "") },
  { id: "public", icon: "🏛️", get name() { return L("안정 지향"); }, get desc() { return L("공무원이나 공기업에 들어갔다"); }, test: (s) => working(s) && ["civil", "public"].includes(tierOf(s.flags.company) ?? "") },
  { id: "boss", icon: "🏪", get name() { return L("사장님"); }, get desc() { return L("내 가게나 회사를 차렸다"); }, test: (s) => ownsBusiness(s.flags) },
  { id: "promoted", icon: "📈", get name() { return L("승진"); }, get desc() { return L("직함이 한 단계 올랐다"); }, test: (s) => working(s) && /대리|과장|차장|부장|임원|이사|선임|책임|수석|팀장|[1-7]급/.test(s.flags.job) },
  { id: "graduate", icon: "🎓", get name() { return L("학사모"); }, get desc() { return L("대학을 마쳤다"); }, test: (s) => s.flags.education === "graduate" || (s.flags.education === "done" && /대학/.test(s.flags.school ?? "")) },
  { id: "grad-school", icon: "🧪", get name() { return L("연구의 길"); }, get desc() { return L("대학원에 들어갔다"); }, test: (s) => s.flags.education === "graduate" },
  { id: "soldier", icon: "🪖", get name() { return L("만기 전역"); }, get desc() { return L("군 복무를 마쳤다"); }, test: (s, age) => (s.flags.serviceUntil !== undefined ? s.mi >= s.flags.serviceUntil : s.flags.military && s.mi >= s.flags.busyUntil && age >= 19) && s.profile.gender === "남" },
  { id: "love", icon: "💕", get name() { return L("설렘"); }, get desc() { return L("누군가와 사귀기 시작했다"); }, test: (s) => s.flags.partner === "dating" || s.flags.partner === "married" },
  { id: "wedding", icon: "💍", get name() { return L("결혼"); }, get desc() { return L("평생을 약속했다"); }, test: (s) => s.flags.partner === "married" },
  { id: "parent", icon: "👶", get name() { return L("부모가 되다"); }, get desc() { return L("첫 아이가 태어났다"); }, test: (s) => s.flags.children >= 1 },
  { id: "big-family", icon: "👨‍👩‍👧‍👦", get name() { return L("다둥이네"); }, get desc() { return L("아이가 셋 이상"); }, test: (s) => s.flags.children >= 3 },
  { id: "pet", icon: "🐶", get name() { return L("반려 생활"); }, get desc() { return L("반려동물을 들였다"); }, test: (s) => !!s.flags.pet },
  { id: "home", icon: "🏠", get name() { return L("내 집 마련"); }, get desc() { return L("집을 샀다"); }, test: (s) => s.flags.homeOwner },
  { id: "debt-free", icon: "🔓", get name() { return L("빚 없는 내 집"); }, get desc() { return L("주택 대출이 하나도 없다"); }, test: (s) => s.flags.homeOwner && !s.flags.mortgage },
  { id: "wealth-1", icon: "💰", get name() { return L("자산 1억"); }, get desc() { return L("순자산 1억 원을 넘겼다"); }, test: (s) => s.wealth >= 10000 },
  { id: "wealth-10", icon: "💎", get name() { return L("자산 10억"); }, get desc() { return L("순자산 10억 원을 넘겼다"); }, test: (s) => s.wealth >= 100000 },
  { id: "healthy", icon: "💪", get name() { return L("강철 체력"); }, get desc() { return L("건강 90 이상"); }, test: (s) => s.stats.health >= 90 },
  { id: "happy", icon: "😄", get name() { return L("행복 만렙"); }, get desc() { return L("행복 90 이상"); }, test: (s) => s.stats.happiness >= 90 },
  { id: "scholar", icon: "📚", get name() { return L("박학다식"); }, get desc() { return L("지식 90 이상"); }, test: (s) => s.stats.knowledge >= 90 },
  { id: "social", icon: "🤝", get name() { return L("마당발"); }, get desc() { return L("관계 90 이상"); }, test: (s) => s.stats.relationships >= 90 },
  { id: "comeback", icon: "🔥", get name() { return L("다시 일어서다"); }, get desc() { return L("바닥을 친 행복을 60 이상으로 되살렸다"); }, test: (s) => s.stats.happiness >= 60 && s.history.some((h) => h.stats.happiness < 25) },
  { id: "retired", icon: "🌅", get name() { return L("은퇴"); }, get desc() { return L("긴 일을 내려놓았다"); }, test: (s) => s.flags.retired },
  { id: "age-60", icon: "🎉", get name() { return L("환갑"); }, get desc() { return L("60세를 맞았다"); }, test: (_, age) => age >= 60 },
  { id: "age-80", icon: "🎂", get name() { return L("팔순"); }, get desc() { return L("80세를 맞았다"); }, test: (_, age) => age >= 80 },
  { id: "age-100", icon: "💯", get name() { return L("백세 인생"); }, get desc() { return L("100세를 맞았다"); }, test: (_, age) => age >= 100 },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

/** Adds any badge this state newly qualifies for. Returns the same object when nothing changed. */
export function withBadges(s: LifeState): LifeState {
  const have = new Set((s.badges ?? []).map((b) => b.id));
  const age = ageOf(s);
  const fresh = BADGES.filter((b) => !have.has(b.id) && b.test(s, age)).map((b): EarnedBadge => ({ id: b.id, mi: s.mi, age }));
  return fresh.length ? { ...s, badges: [...(s.badges ?? []), ...fresh] } : s;
}
