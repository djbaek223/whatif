import type { CompanyTier } from "./catalog";
import { formatWealth } from "./format";
import { LIFE_EVENTS } from "./lifeEvents";
import { MORE_EVENTS } from "./moreEvents";
import type { Axis, Category, LifeFlags, LifeState, Stats, Theme } from "./types";

type Dyn<T> = T | ((s: LifeState) => T);

export interface Effect {
  text: Dyn<string>;
  alt?: string[]; // other ways to say text; one is picked at random
  stats?: Partial<Stats>;
  wealth?: number; // 만원, added
  wealthPct?: number; // fraction of current positive wealth, added
  income?: number; // sets monthly income (만원)
  incomePct?: number; // multiplies monthly income
  flags?: Partial<LifeFlags>;
  eduYears?: number; // schooling length from now
  busyMonths?: number;
  addChild?: boolean;
  intense?: number; // months of month-by-month turns after this
  risk?: { chance: (s: LifeState) => number; success: Effect; failure: Effect };
  // Concrete life changes. The engine names the company, school or home and works out the money.
  hire?: { tier: CompanyTier | "auto"; title?: string };
  switchJob?: { payPct: number };
  promote?: boolean;
  enroll?: { level: "university" | "graduate" | "abroad"; pick?: "profile" | "fit" | "better" };
  buyHome?: "best" | "cheap";
  homeValuePct?: number; // change in the home's price; the gain or loss lands in wealth
  note?: string; // what a cost was for, shown with the amount
  mark?: string; // remembers when this happened, so a later event in a chain can follow it
  seed?: Dyn<string>; // a person or thread the narrator can bring back later
}

export interface ChoiceDef {
  id: string;
  label: Dyn<string>;
  effect: Effect;
  when?: (s: LifeState) => boolean;
}

export interface EventDef {
  id: string;
  title: string;
  minAge: number;
  maxAge: number;
  perYear: number | ((s: LifeState) => number);
  when?: (s: LifeState, age: number) => boolean;
  once?: boolean;
  cooldown?: number; // months before it can happen again
  intro: Dyn<string>; // fallback scene text
  theme?: Theme;
  choices?: ChoiceDef[];
  effect?: Effect; // passive events apply this without asking
  category?: Category; // read from the theme when missing
  keywords?: string[]; // what it is about, for the narrator's no-repeat list
  temper?: Partial<Record<Axis, number>>; // e.g. { outgoing: 0.8 }: more likely for outgoing people, less for reserved
  rare?: boolean; // 1% a year or less; shown on a special card and listed in the ending
  small?: boolean; // a two-way everyday dilemma; these share one cooldown so they come about once every year or two
  repeatable?: boolean; // life-stage events that may need to come back more than three times (job search, promotion)
}

const knowledgeOdds = (base: number) => (s: LifeState) =>
  Math.min(0.9, Math.max(0.1, base + (s.stats.knowledge - 50) / 100));

export const EVENTS: EventDef[] = [
  // ── 교육 ──────────────────────────────────────────
  {
    id: "csat",
    title: "수능과 진로",
    minAge: 17,
    maxAge: 20,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "highschool" && s.mi % 12 >= 9, // results season, Oct-Dec
    intro: "수능 성적표가 나왔다. 앞으로의 진로를 정해야 한다.",
    choices: [
      {
        id: "university",
        label: "성적에 맞춰 대학에 진학한다",
        effect: {
          text: "대학 생활이 시작되었다.",
          stats: { knowledge: 5, happiness: 3 },
          flags: { education: "university" },
          eduYears: 4,
          enroll: { level: "university", pick: "fit" },
        },
      },
      {
        id: "retake",
        label: "재수를 한다",
        effect: {
          text: "1년을 더 공부하기로 했다.",
          stats: { happiness: -8 },
          intense: 6,
          busyMonths: 11,
          risk: {
            chance: knowledgeOdds(0.5),
            success: {
              text: "재수 끝에 원하던 대학에 붙었다.",
              stats: { knowledge: 10, happiness: 12 },
              flags: { education: "university" },
              eduYears: 5,
              enroll: { level: "university", pick: "better" },
            },
            failure: {
              text: "성적이 기대만큼 오르지 않았지만, 대학에는 진학했다.",
              stats: { knowledge: 4, happiness: -5 },
              flags: { education: "university" },
              eduYears: 5,
              enroll: { level: "university", pick: "fit" },
            },
          },
        },
      },
      {
        id: "work",
        label: "대학 대신 바로 일을 시작한다",
        effect: {
          text: "또래보다 일찍 사회에 나왔다.",
          stats: { knowledge: -2, happiness: 2 },
          flags: { education: "done" },
          hire: { tier: "field" },
        },
      },
    ],
  },
  {
    id: "military",
    title: "입대 영장",
    minAge: 19,
    maxAge: 24,
    perYear: 0.5,
    once: true,
    when: (s) => s.profile.gender === "남" && !s.flags.military,
    intro: "입영 통지서가 날아왔다.",
    choices: [
      {
        id: "enlist",
        label: "지금 입대한다",
        effect: {
          text: "머리를 깎고 훈련소에 들어갔다. 18개월의 군 생활이 시작되었다.",
          stats: { health: 3, relationships: 3, happiness: -6 },
          flags: { military: true },
          busyMonths: 18,
        },
      },
      {
        id: "delay",
        label: "학업이나 일을 이유로 미룬다",
        when: (s) => s.flags.education === "university" || s.flags.employed,
        effect: {
          text: "입대를 미뤘다. 언젠가는 가야 한다.",
          stats: { happiness: 2 },
          flags: { military: true },
          busyMonths: 0,
        },
      },
    ],
  },
  {
    id: "graduation",
    title: "졸업 후의 길",
    minAge: 21,
    maxAge: 35,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "university" && s.mi >= s.flags.eduUntil,
    intro: (s) => `${s.flags.school ? `${s.flags.school} ` : ""}졸업장을 받았다. 무엇을 할지 정해야 한다.`,
    choices: [
      {
        id: "big-company",
        label: "대기업 공채에 도전한다",
        effect: {
          text: "자기소개서를 수십 장 썼다.",
          flags: { education: "done" },
          intense: 6,
          risk: {
            chance: knowledgeOdds(0.4),
            success: {
              text: "최종 합격 문자를 받았다.",
              stats: { happiness: 12 },
              hire: { tier: "large" },
            },
            failure: {
              text: "대기업은 떨어졌고, 눈을 낮춰 다시 지원했다.",
              stats: { happiness: -4 },
              hire: { tier: "small" },
            },
          },
        },
      },
      {
        id: "civil-service",
        label: "공무원 시험을 준비한다",
        effect: {
          text: "노량진 학원에 등록했다.",
          stats: { happiness: -6 },
          flags: { education: "done" },
          busyMonths: 14,
          intense: 3,
          risk: {
            chance: knowledgeOdds(0.35),
            success: {
              text: "공무원 시험에 합격했다.",
              stats: { happiness: 10 },
              hire: { tier: "civil" },
            },
            failure: {
              text: "시험에 떨어지고 아르바이트를 시작했다.",
              stats: { happiness: -10 },
              flags: { employed: false, job: "" },
              income: 120,
            },
          },
        },
      },
      {
        id: "grad-school",
        label: "대학원에 진학한다",
        effect: {
          text: "연구실 생활이 시작되었다.",
          stats: { knowledge: 10, happiness: -2 },
          flags: { education: "graduate" },
          eduYears: 2,
          income: 80,
          enroll: { level: "graduate" },
        },
      },
      {
        id: "startup",
        label: "친구들과 창업한다",
        effect: {
          text: "작은 사무실을 얻고 창업했다.",
          intense: 12,
          flags: { education: "done" },
          wealth: -1500,
          note: "사무실 보증금과 초기 비용",
          risk: {
            chance: () => 0.25,
            success: {
              text: "서비스가 입소문을 타며 투자를 받았다.",
              stats: { happiness: 15, knowledge: 8 },
              flags: { employed: true, job: "스타트업 대표" },
              income: 500,
            },
            failure: {
              text: "1년 만에 폐업하고 빚이 남았다.",
              stats: { happiness: -15, knowledge: 6 },
              flags: { employed: false, job: "" },
              wealth: -2000,
              income: 0,
            },
          },
        },
      },
    ],
  },
  {
    id: "grad-done",
    title: "학위 이후",
    minAge: 23,
    maxAge: 45,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "graduate" && s.mi >= s.flags.eduUntil,
    intro: "학위 논문이 통과되었다.",
    choices: [
      {
        id: "research",
        label: "연구소에 취업한다",
        effect: {
          text: "연구원으로 일하게 되었다.",
          stats: { knowledge: 5, happiness: 6 },
          flags: { education: "done" },
          hire: { tier: "research" },
        },
      },
      {
        id: "abroad",
        label: "해외 박사 과정에 도전한다",
        effect: {
          text: "짐을 싸서 해외로 떠났다.",
          stats: { knowledge: 12, relationships: -8, happiness: 2 },
          flags: { education: "graduate" },
          eduYears: 5,
          income: 150,
          enroll: { level: "abroad" },
        },
      },
      {
        id: "industry",
        label: "기업 연구직으로 간다",
        effect: {
          text: "기업 연구소에 들어갔다.",
          stats: { happiness: 4 },
          flags: { education: "done" },
          hire: { tier: "large", title: "연구원" },
        },
      },
    ],
  },
  // ── 일 ──────────────────────────────────────────
  {
    id: "job-search",
    title: "일자리 찾기",
    minAge: 20,
    maxAge: 50,
    perYear: 0.8,
    cooldown: 12,
    repeatable: true,
    when: (s) => !s.flags.employed && !s.flags.retired && s.flags.education === "done",
    intro: (s) => `통장 잔고가 줄어들고 있다${s.wealth < 1000 ? ` (남은 자산 ${formatWealth(s.wealth)})` : ""}.${s.flags.children ? ` ${s.flags.children > 1 ? `아이 ${s.flags.children}명을` : "아이를"} 키우려면` : ""} 일을 구해야 한다.`,
    choices: [
      {
        id: "regular",
        label: "정규직에 계속 지원한다",
        effect: {
          text: "이력서를 다시 다듬었다.",
          intense: 3,
          risk: {
            chance: knowledgeOdds(0.5),
            success: {
              text: "정규직 합격 소식을 받았다.",
              stats: { happiness: 10 },
              hire: { tier: "auto" },
            },
            failure: {
              text: "번번이 떨어졌다.",
              stats: { happiness: -8 },
            },
          },
        },
      },
      {
        id: "contract",
        label: "계약직이라도 먼저 시작한다",
        effect: {
          text: "계약직으로 일을 시작했다.",
          stats: { happiness: 2 },
          hire: { tier: "contract" },
        },
      },
      {
        id: "skill-up",
        label: "기술을 배우며 준비한다",
        effect: {
          text: "국비 교육 과정에 들어갔다. 수강료는 내일배움카드로 해결했다.",
          stats: { knowledge: 8, happiness: -2 },
          busyMonths: 6,
        },
      },
    ],
  },
  {
    id: "job-offer",
    title: "이직 제안",
    minAge: 27,
    maxAge: 55,
    perYear: 0.15,
    cooldown: 24,
    when: (s) => s.flags.employed,
    intro: (s) => `${s.flags.company ? `${s.flags.company}에서 일한 지 몇 해, ` : ""}예전 동료에게서 함께 일하자는 연락이 왔다. 지금 연봉은 ${formatWealth(s.income * 12)}이다.`,
    choices: [
      {
        id: "move",
        label: "더 좋은 조건으로 옮긴다",
        effect: {
          text: "새 회사로 옮겼다.",
          intense: 3,
          switchJob: { payPct: 1.2 },
          risk: {
            chance: () => 0.7,
            success: { text: "일도 사람도 잘 맞았다.", stats: { happiness: 8 } },
            failure: { text: "연봉은 올랐지만 조직 문화가 맞지 않았다.", stats: { happiness: -10, health: -3 } },
          },
        },
      },
      {
        id: "negotiate",
        label: "제안을 근거로 지금 회사와 협상한다",
        effect: { text: "연봉을 조금 올렸다.", stats: { happiness: 3 }, incomePct: 1.06 },
      },
      {
        id: "stay",
        label: "지금 자리에 남는다",
        effect: { text: "익숙한 자리에 남았다.", stats: { relationships: 2 } },
      },
    ],
  },
  {
    id: "startup-itch",
    title: "창업의 유혹",
    minAge: 28,
    maxAge: 52,
    perYear: 0.06,
    cooldown: 60,
    when: (s) => s.flags.employed && s.flags.job !== "스타트업 대표",
    intro: "오래 품어온 사업 아이디어가 머리를 떠나지 않는다.",
    choices: [
      {
        id: "quit",
        label: "회사를 그만두고 창업한다",
        effect: {
          text: "사표를 내고 창업했다.",
          intense: 12,
          wealth: -3000,
          note: "창업 자금",
          risk: {
            chance: () => 0.3,
            success: {
              text: "사업이 자리를 잡았다.",
              stats: { happiness: 15 },
              flags: { employed: true, job: "사업가" },
              income: 700,
            },
            failure: {
              text: "사업을 접고 다시 일자리를 찾게 되었다.",
              stats: { happiness: -15, health: -5 },
              flags: { employed: false, job: "" },
              income: 0,
              wealth: -2000,
            },
          },
        },
      },
      {
        id: "side",
        label: "퇴근 후 사이드 프로젝트로 해본다",
        effect: { text: "주말마다 작은 프로젝트를 시작했다.", stats: { knowledge: 5, happiness: 3, health: -2 } },
      },
      {
        id: "drop",
        label: "현실을 택하고 접는다",
        effect: { text: "아이디어를 서랍에 넣었다.", stats: { happiness: -2 } },
      },
    ],
  },
  {
    id: "layoff",
    title: "희망퇴직",
    minAge: 40,
    maxAge: 60,
    perYear: 0.04,
    once: true,
    when: (s) => s.flags.employed && s.flags.job !== "공무원",
    intro: (s) => `${s.flags.company || "회사"}가 구조조정을 발표하고 희망퇴직 신청을 받는다. 위로금은 연봉 1년 치 수준이다.`,
    choices: [
      {
        id: "accept",
        label: "위로금을 받고 나온다",
        effect: {
          text: "위로금을 받고 회사를 나왔다.",
          stats: { happiness: -6 },
          wealth: 6000,
          note: "희망퇴직 위로금",
          flags: { employed: false, job: "" },
          income: 0,
        },
      },
      {
        id: "hold",
        label: "끝까지 버틴다",
        effect: {
          text: "버티기로 했다.",
          risk: {
            chance: () => 0.6,
            success: { text: "구조조정이 끝나고 자리를 지켰다.", stats: { happiness: -4 } },
            failure: {
              text: "결국 권고사직을 받았다.",
              stats: { happiness: -12 },
              flags: { employed: false, job: "" },
              income: 0,
              wealth: 2000,
            },
          },
        },
      },
    ],
  },
  {
    id: "retirement",
    title: "은퇴",
    minAge: 58,
    maxAge: 70,
    perYear: 0.6,
    once: true,
    when: (s) => s.flags.employed,
    intro: "정년이 다가왔다. 이후의 삶을 정해야 한다.",
    choices: [
      {
        id: "retire",
        label: "은퇴하고 연금으로 산다",
        effect: {
          text: "긴 직장 생활을 마쳤다.",
          stats: { happiness: 5, health: 2 },
          flags: { employed: false, retired: true, job: "은퇴" },
          income: 130,
        },
      },
      {
        id: "rehire",
        label: "재취업해 조금 더 일한다",
        effect: {
          text: "경력을 살려 작은 회사에 재취업했다.",
          stats: { knowledge: 2, health: -2 },
          incomePct: 0.5,
        },
      },
      {
        id: "countryside",
        label: "귀촌한다",
        effect: {
          text: "시골에 작은 집을 얻었다.",
          stats: { happiness: 8, health: 4, relationships: -4 },
          flags: { employed: false, retired: true, job: "은퇴" },
          wealth: -2000,
          note: "시골집 마련",
          income: 110,
        },
      },
    ],
  },
  // ── 관계 ──────────────────────────────────────────
  {
    id: "crush",
    title: "설레는 사람",
    minAge: 17,
    maxAge: 48,
    perYear: 0.35,
    cooldown: 12,
    when: (s) => s.flags.partner === "none" || s.flags.partner === "divorced" || s.flags.partner === "widowed",
    repeatable: true, // comes back until it is settled
    intro: "자꾸 눈길이 가는 사람이 생겼다.",
    choices: [
      {
        id: "confess",
        label: "용기를 내어 마음을 전한다",
        effect: {
          text: "마음을 전했다.",
          risk: {
            chance: (s) => Math.min(0.85, 0.35 + s.stats.relationships / 200),
            success: { text: "연애를 시작했다.", stats: { happiness: 12, relationships: 6 }, flags: { partner: "dating" } },
            failure: { text: "정중하게 거절당했다.", stats: { happiness: -8 } },
          },
        },
      },
      {
        id: "friend",
        label: "친구로 지낸다",
        effect: { text: "좋은 친구로 남았다.", stats: { relationships: 4 } },
      },
      {
        id: "focus",
        label: "지금은 내 일에 집중한다",
        effect: { text: "마음을 접고 일에 집중했다.", stats: { knowledge: 3, happiness: -2 } },
      },
    ],
  },
  {
    id: "marriage",
    title: "결혼 이야기",
    minAge: 24,
    maxAge: 55,
    perYear: 0.45,
    cooldown: 12,
    when: (s) => s.flags.partner === "dating",
    repeatable: true, // comes back until it is settled
    intro: "연인과 결혼 이야기가 오가기 시작했다.",
    choices: [
      {
        id: "marry",
        label: "결혼한다",
        effect: {
          text: "결혼식을 올렸다.",
          stats: { happiness: 12, relationships: 10 },
          flags: { partner: "married" },
          wealth: -2500,
          note: "예식과 신혼살림",
          intense: 3,
        },
      },
      {
        id: "wait",
        label: "조금 더 연애한다",
        effect: { text: "결혼은 조금 더 생각해보기로 했다.", stats: { relationships: 2 } },
      },
      {
        id: "breakup",
        label: "헤어진다",
        effect: { text: "긴 대화 끝에 헤어졌다.", stats: { happiness: -12, relationships: -5 }, flags: { partner: "none" } },
      },
    ],
  },
  {
    id: "baby",
    title: "아이",
    minAge: 25,
    maxAge: 44,
    perYear: 0.3,
    cooldown: 18,
    when: (s) => s.flags.partner === "married" && s.flags.children < 3 && !s.flags.noKids,
    repeatable: true, // comes back until it is settled
    intro: (s) => {
      const n = s.flags.children;
      const work = !s.flags.employed && !s.flags.retired ? " 아직 일자리를 찾는 중이라 마음이 복잡하다." : "";
      if (n === 0) return `배우자와 아이 이야기를 나누게 되었다.${work}`;
      return `${n === 1 ? "첫째를" : `아이 ${n}명을`} 키우는 사이, 배우자와 ${n === 1 ? "둘째" : `${["", "", "", "셋째", "넷째", "다섯째"][n + 1] ?? "막내"}`} 이야기가 나왔다.${work}`;
    },
    choices: [
      {
        id: "have",
        label: (s) => (s.flags.children === 0 ? "아이를 갖는다" : s.flags.children === 1 ? "둘째를 갖는다" : `한 명 더, ${["", "", "", "셋째", "넷째", "다섯째"][s.flags.children + 1] ?? "막내"}를 갖는다`),
        effect: {
          text: "",
          stats: { happiness: 10, relationships: 8, health: -3 },
          addChild: true,
          wealth: -800,
          note: "출산과 산후조리",
          intense: 6,
        },
      },
      {
        id: "later",
        label: "아직은 아니다",
        effect: { text: "조금 더 준비하기로 했다.", stats: {} },
      },
      {
        id: "dink",
        label: (s) => (s.flags.children === 0 ? "둘이서만 살기로 한다" : s.flags.children === 1 ? "외동으로 키우기로 한다" : "지금 아이들로 충분하다"),
        effect: { text: (s) => (s.flags.children === 0 ? "둘만의 삶을 꾸리기로 했다." : "지금의 가족에 집중하기로 했다."), stats: { happiness: 3 }, flags: { noKids: true } },
      },
    ],
  },
  {
    id: "marriage-crisis",
    title: "부부의 위기",
    minAge: 30,
    maxAge: 70,
    perYear: (s) => (s.stats.relationships < 40 ? 0.08 : 0.025),
    cooldown: 60,
    when: (s) => s.flags.partner === "married",
    intro: "배우자와 다툼이 잦아졌다. 대화가 줄었다.",
    choices: [
      {
        id: "counsel",
        label: "부부 상담을 받는다",
        effect: { text: "상담을 받으며 서로를 다시 알아갔다.", stats: { relationships: 8, happiness: 4 }, wealth: -200, note: "상담비" },
      },
      {
        id: "divorce",
        label: "이혼한다",
        effect: {
          text: "이혼 서류에 도장을 찍었다.",
          stats: { happiness: -10, relationships: -8 },
          flags: { partner: "divorced" },
          wealthPct: -0.4,
          note: "재산 분할",
        },
      },
      {
        id: "endure",
        label: "참고 지낸다",
        effect: { text: "아무 일 없다는 듯 지냈다.", stats: { happiness: -6, health: -2 } },
      },
    ],
  },
  {
    id: "parent-care",
    title: "부모님의 노후",
    minAge: 42,
    maxAge: 65,
    perYear: 0.12,
    once: true,
    intro: "부모님의 건강이 급격히 나빠졌다.",
    choices: [
      {
        id: "live-together",
        label: "직접 모신다",
        effect: { text: "부모님을 모시고 살게 되었다.", stats: { relationships: 8, happiness: -5, health: -3 }, wealth: -1500 },
      },
      {
        id: "facility",
        label: "요양 시설을 알아본다",
        effect: { text: "좋은 요양원을 찾아 자주 찾아뵈었다.", stats: { relationships: -2 }, wealth: -3000 },
      },
      {
        id: "share",
        label: "형제자매와 나눠 맡는다",
        effect: { text: "형제자매와 돌아가며 돌보기로 했다.", stats: { relationships: 3 }, wealth: -800 },
      },
    ],
  },
  // ── 돈 ──────────────────────────────────────────
  {
    id: "house",
    title: "내 집 마련",
    minAge: 29,
    maxAge: 62,
    perYear: 0.15,
    cooldown: 36,
    when: (s) => !s.flags.homeOwner && s.wealth > 8000,
    repeatable: true, // comes back until it is settled
    intro: (s) => `전세 계약 만료가 다가온다. 모아둔 돈은 ${formatWealth(s.wealth)}. 집값 이야기가 끊이지 않는다.`,
    choices: [
      {
        id: "buy",
        label: (s) => (s.wealth < 30000 ? "대출을 끼고 집을 산다" : "집을 산다"),
        effect: {
          text: "",
          buyHome: "best",
          stats: { happiness: 6 },
          risk: {
            chance: () => 0.6,
            success: { text: "몇 년 사이 집값이 올랐다.", homeValuePct: 0.3 },
            failure: { text: (s) => (s.flags.mortgage ? "집값이 떨어지고 이자 부담이 커졌다." : "사자마자 집값이 떨어졌다."), homeValuePct: -0.12, stats: { happiness: -6 } },
          },
        },
      },
      {
        id: "rent",
        label: "전세로 계속 산다",
        effect: { text: "전세를 연장했다.", stats: {} },
      },
      {
        id: "move-out",
        label: "집값이 싼 곳으로 옮긴다",
        effect: {
          text: "외곽으로 이사했다.",
          buyHome: "cheap",
          stats: { happiness: 2, relationships: -3 },
        },
      },
    ],
  },
  {
    id: "investment",
    title: "투자 열풍",
    minAge: 25,
    maxAge: 75,
    perYear: 0.12,
    cooldown: 36,
    when: (s) => s.wealth > 1000,
    intro: "주변 사람들이 모두 주식과 코인 이야기를 한다.",
    choices: [
      {
        id: "all-in",
        label: "크게 투자한다",
        effect: {
          text: "모아둔 돈의 상당 부분을 투자했다.",
          risk: {
            chance: () => 0.4,
            success: { text: "수익률이 크게 났다.", wealthPct: 0.6, stats: { happiness: 8 } },
            failure: { text: "반 토막이 났다.", wealthPct: -0.35, stats: { happiness: -10, health: -2 } },
          },
        },
      },
      {
        id: "little",
        label: "조금만 넣어본다",
        effect: {
          text: "여윳돈만 조금 투자했다.",
          risk: {
            chance: () => 0.55,
            success: { text: "소소하게 벌었다.", wealthPct: 0.06 },
            failure: { text: "조금 잃었다.", wealthPct: -0.04 },
          },
        },
      },
      {
        id: "skip",
        label: "관심을 끈다",
        effect: { text: "적금이나 꾸준히 넣기로 했다.", stats: {} },
      },
    ],
  },
  // ── 건강 ──────────────────────────────────────────
  {
    id: "health-warning",
    title: "건강검진 결과",
    minAge: 38,
    maxAge: 95,
    perYear: (s) => 0.05 + (s.stats.health < 50 ? 0.15 : 0),
    cooldown: 24,
    intro: "건강검진에서 재검 판정이 나왔다.",
    choices: [
      {
        id: "treat",
        label: "바로 정밀검사와 치료를 받는다",
        effect: { text: "일찍 발견해 치료를 받았다.", stats: { health: 12, happiness: -2 }, wealth: -500, note: "정밀검사와 치료비" },
      },
      {
        id: "lifestyle",
        label: "운동과 식단부터 바꾼다",
        effect: { text: "매일 아침 걷기 시작했다.", stats: { health: 7, happiness: 2 } },
      },
      {
        id: "ignore",
        label: "바빠서 미룬다",
        effect: {
          text: "일이 바빠 병원 가는 걸 미뤘다.",
          risk: {
            chance: () => 0.5,
            success: { text: "다행히 큰 문제는 없었다.", stats: {} },
            failure: { text: "나중에 병이 커져서 발견되었다.", stats: { health: -20, happiness: -8 }, wealth: -1500, note: "수술과 입원비" },
          },
        },
      },
    ],
  },
  {
    id: "golden-years",
    title: "노년의 하루",
    minAge: 62,
    maxAge: 100,
    perYear: 0.2,
    cooldown: 48,
    intro: "시간이 많아졌다. 무엇으로 하루를 채울까.",
    choices: [
      {
        id: "volunteer",
        label: "봉사활동을 시작한다",
        effect: { text: "동네 복지관에서 봉사를 시작했다.", stats: { happiness: 6, relationships: 6 } },
      },
      {
        id: "grandkids",
        label: "손주를 돌본다",
        when: (s) => s.flags.children > 0,
        effect: { text: "손주들과 시간을 보냈다.", stats: { happiness: 8, relationships: 8, health: -2 } },
      },
      {
        id: "travel",
        label: "여행을 다닌다",
        effect: { text: "가보고 싶던 곳들을 다녔다.", stats: { happiness: 9, health: 2 }, wealth: -600 },
      },
      {
        id: "learn",
        label: "새로운 것을 배운다",
        effect: { text: "평생교육원에 등록했다.", stats: { knowledge: 6, happiness: 4 } },
      },
    ],
  },
  // ── 선택 없이 일어나는 일 ───────────────────────────
  {
    id: "promotion",
    title: "승진",
    minAge: 28,
    maxAge: 60,
    perYear: (s) => 0.12 + (s.stats.knowledge - 50) / 500,
    cooldown: 24,
    repeatable: true,
    when: (s) => s.flags.employed,
    intro: "",
    effect: { text: "책임도 월급도 늘었다.", stats: { happiness: 5 }, incomePct: 1.12, promote: true },
  },
  {
    id: "illness",
    title: "병치레",
    minAge: 0,
    maxAge: 120,
    perYear: (s) => 0.02 + Math.max(0, 50 - s.stats.health) / 400,
    cooldown: 12,
    intro: "",
    effect: { text: "크게 앓아누웠다.", stats: { health: -10, happiness: -4 }, wealth: -200, note: "병원비" },
  },
  {
    id: "old-friend",
    title: "오랜 친구",
    minAge: 20,
    maxAge: 100,
    perYear: 0.12,
    cooldown: 24,
    intro: "",
    effect: { text: "오랜 친구와 다시 연락이 닿았다.", stats: { relationships: 5, happiness: 3 } },
  },
  {
    id: "drift-apart",
    title: "멀어진 연인",
    minAge: 18,
    maxAge: 60,
    perYear: 0.1,
    cooldown: 12,
    when: (s) => s.flags.partner === "dating",
    intro: "",
    effect: { text: "연인과 조금씩 멀어지다 헤어졌다.", stats: { happiness: -8 }, flags: { partner: "none" } },
  },
  {
    id: "spouse-loss",
    title: "배우자와의 이별",
    minAge: 65,
    maxAge: 120,
    perYear: (s) => Math.max(0, (ageOf(s) - 60) * 0.004),
    once: true,
    when: (s) => s.flags.partner === "married",
    intro: "",
    effect: { text: "평생을 함께한 배우자가 먼저 세상을 떠났다.", stats: { happiness: -20, relationships: -10, health: -5 }, flags: { partner: "widowed" } },
  },
  {
    id: "home-parent",
    title: "아이와 일자리",
    minAge: 20,
    maxAge: 50,
    perYear: 0.9,
    cooldown: 14,
    repeatable: true,
    when: (s) => !s.flags.employed && !s.flags.retired && s.flags.education === "done" && (s.flags.kidsBorn ?? []).some((b) => s.mi - b < 12),
    intro: "아이가 태어났지만 아직 일자리가 없다. 육아와 구직을 어떻게 할지 정해야 한다.",
    theme: "family",
    choices: [
      { id: "care", label: "1년은 육아에 전념한다", effect: { text: "아이 곁에서 첫해를 보냈다. 통장은 가벼워졌지만 아이와 가까워졌다.", stats: { relationships: 8, happiness: 3 }, busyMonths: 12 } },
      {
        id: "daycare",
        label: "어린이집에 맡기고 구직에 나선다",
        effect: {
          text: "아이를 어린이집에 맡기고 면접을 다녔다.",
          stats: { happiness: -2 },
          wealth: -150,
          note: "어린이집 비용",
          risk: { chance: (s) => Math.min(0.8, 0.35 + s.stats.knowledge / 200), success: { text: "일자리를 구했다.", stats: { happiness: 6 }, hire: { tier: "auto" } }, failure: { text: "아직 합격 소식은 없었다.", stats: { happiness: -4 } } },
        },
      },
      { id: "remote", label: "집에서 할 수 있는 일을 찾는다", effect: { text: "아이가 잠든 밤에 재택 부업을 시작했다.", stats: { health: -2, knowledge: 2 }, income: 120, flags: { employed: true, job: "재택 프리랜서" } } },
    ],
  },
  {
    // Written by the AI for this life (title, scene, options, effects); never fires without AI.
    id: "personal",
    title: "나만의 갈림길",
    minAge: 15,
    maxAge: 95,
    perYear: 0.3,
    cooldown: 20,
    repeatable: true, // each one is written fresh
    when: (s) => !!s.ai,
    intro: "",
    choices: [],
  },
  ...LIFE_EVENTS,
  ...MORE_EVENTS,
];

export function ageOf(s: LifeState): number {
  return ageAt(s.profile.birthDate, s.mi);
}

export function ageAt(birthDate: string, mi: number): number {
  const [y, m] = birthDate.split("-").map(Number);
  return Math.floor((mi - (y * 12 + (m - 1))) / 12);
}

export function eventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
