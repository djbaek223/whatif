// Achievements: milestones read off the life's state after every step, kept on the life so the ending can show them.
import { tierOf } from "./catalog";
import { ageOf } from "./events";
import { BUSINESS } from "./scene";
import type { LifeState } from "./types";

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
  { id: "first-job", icon: "💼", name: "첫 출근", desc: "처음으로 일을 시작했다", test: (s) => working(s) },
  { id: "big-corp", icon: "🏢", name: "대기업 입성", desc: "대기업·IT 대기업·외국계에 들어갔다", test: (s) => working(s) && ["large", "it", "foreign"].includes(tierOf(s.flags.company) ?? "") },
  { id: "public", icon: "🏛️", name: "안정 지향", desc: "공무원이나 공기업에 들어갔다", test: (s) => working(s) && ["civil", "public"].includes(tierOf(s.flags.company) ?? "") },
  { id: "boss", icon: "🏪", name: "사장님", desc: "내 가게나 회사를 차렸다", test: (s) => working(s) && BUSINESS.test(s.flags.job) },
  { id: "promoted", icon: "📈", name: "승진", desc: "직함이 한 단계 올랐다", test: (s) => working(s) && /대리|과장|차장|부장|임원|이사|선임|책임|수석|팀장|[1-7]급/.test(s.flags.job) },
  { id: "graduate", icon: "🎓", name: "학사모", desc: "대학을 마쳤다", test: (s) => s.flags.education === "graduate" || (s.flags.education === "done" && /대학/.test(s.flags.school ?? "")) },
  { id: "grad-school", icon: "🧪", name: "연구의 길", desc: "대학원에 들어갔다", test: (s) => s.flags.education === "graduate" },
  { id: "soldier", icon: "🪖", name: "만기 전역", desc: "군 복무를 마쳤다", test: (s, age) => s.flags.military && s.mi >= s.flags.busyUntil && age >= 19 },
  { id: "love", icon: "💕", name: "설렘", desc: "누군가와 사귀기 시작했다", test: (s) => s.flags.partner === "dating" || s.flags.partner === "married" },
  { id: "wedding", icon: "💍", name: "결혼", desc: "평생을 약속했다", test: (s) => s.flags.partner === "married" },
  { id: "parent", icon: "👶", name: "부모가 되다", desc: "첫 아이가 태어났다", test: (s) => s.flags.children >= 1 },
  { id: "big-family", icon: "👨‍👩‍👧‍👦", name: "다둥이네", desc: "아이가 셋 이상", test: (s) => s.flags.children >= 3 },
  { id: "pet", icon: "🐶", name: "반려 생활", desc: "반려동물을 들였다", test: (s) => !!s.flags.pet },
  { id: "home", icon: "🏠", name: "내 집 마련", desc: "집을 샀다", test: (s) => s.flags.homeOwner },
  { id: "debt-free", icon: "🔓", name: "빚 없는 내 집", desc: "주택 대출이 하나도 없다", test: (s) => s.flags.homeOwner && !s.flags.mortgage },
  { id: "wealth-1", icon: "💰", name: "자산 1억", desc: "순자산 1억 원을 넘겼다", test: (s) => s.wealth >= 10000 },
  { id: "wealth-10", icon: "💎", name: "자산 10억", desc: "순자산 10억 원을 넘겼다", test: (s) => s.wealth >= 100000 },
  { id: "healthy", icon: "💪", name: "강철 체력", desc: "건강 90 이상", test: (s) => s.stats.health >= 90 },
  { id: "happy", icon: "😄", name: "행복 만렙", desc: "행복 90 이상", test: (s) => s.stats.happiness >= 90 },
  { id: "scholar", icon: "📚", name: "박학다식", desc: "지식 90 이상", test: (s) => s.stats.knowledge >= 90 },
  { id: "social", icon: "🤝", name: "마당발", desc: "관계 90 이상", test: (s) => s.stats.relationships >= 90 },
  { id: "comeback", icon: "🔥", name: "다시 일어서다", desc: "바닥을 친 행복을 60 이상으로 되살렸다", test: (s) => s.stats.happiness >= 60 && s.history.some((h) => h.stats.happiness < 25) },
  { id: "retired", icon: "🌅", name: "은퇴", desc: "긴 일을 내려놓았다", test: (s) => s.flags.retired },
  { id: "age-60", icon: "🎉", name: "환갑", desc: "60세를 맞았다", test: (_, age) => age >= 60 },
  { id: "age-80", icon: "🎂", name: "팔순", desc: "80세를 맞았다", test: (_, age) => age >= 80 },
  { id: "age-100", icon: "💯", name: "백세 인생", desc: "100세를 맞았다", test: (_, age) => age >= 100 },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

/** Adds any badge this state newly qualifies for. Returns the same object when nothing changed. */
export function withBadges(s: LifeState): LifeState {
  const have = new Set((s.badges ?? []).map((b) => b.id));
  const age = ageOf(s);
  const fresh = BADGES.filter((b) => !have.has(b.id) && b.test(s, age)).map((b): EarnedBadge => ({ id: b.id, mi: s.mi, age }));
  return fresh.length ? { ...s, badges: [...(s.badges ?? []), ...fresh] } : s;
}
