import { DEGREE_RANK, isMedical, type CompanyTier } from "./catalog";
import { degreeOnLeaving } from "./education";
import { formatWealth } from "./format";
import { LIFE_EVENTS } from "./lifeEvents";
import { MORE_EVENTS } from "./moreEvents";
import type { Axis, Category, LifeFlags, LifeState, Stats, Theme } from "./types";
import { inService, retaking } from "./timeline";
import { employee, ownsBusiness } from "./work";
import { L } from "./i18n";
import { region, type Region } from "./region";

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
  eduYears?: number; // course length; classes start the next March (university) or term (graduate), see timeline.ts
  busyMonths?: number;
  enlist?: boolean; // army service for as long as it lasted that year, with any course put on leave
  retake?: boolean; // another year for next year's exam (재수, 삼수)
  addChild?: boolean;
  intense?: number; // months of month-by-month turns after this
  risk?: { chance: (s: LifeState) => number; success: Effect; failure: Effect };
  // Concrete life changes. The engine names the company, school or home and works out the money.
  hire?: { tier: CompanyTier | "auto"; title?: string };
  switchJob?: { payPct: number };
  promote?: boolean;
  enroll?: { level: "university" | "graduate" | "abroad"; pick?: "profile" | "fit" | "better" };
  buyHome?: "best" | "cheap";
  startBusiness?: { title?: string; name?: string; income?: number }; // opens a shop or business of one's own; how it goes plays out later
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
  region?: Region; // only in this country's lives (e.g. 수능 and army service are Korean); missing means everywhere
  repeatable?: boolean; // life-stage events that may need to come back more than three times (job search, promotion)
}

const knowledgeOdds = (base: number) => (s: LifeState) =>
  Math.min(0.9, Math.max(0.1, base + (s.stats.knowledge - 50) / 100));

/** The life forks and life-stage events. These always play as written; the rest of the pool may be written by the narrator (see hybrid.ts). */
export const CORE_EVENTS: EventDef[] = [
  // ── 교육 ──────────────────────────────────────────
  {
    id: "csat",
    get title() { return L("수능과 진로"); },
    minAge: 17,
    maxAge: 21,
    perYear: 1,
    // Comes back after a retake: the next exam season, a year on (see timeline.ts). At most three tries.
    when: (s) => s.flags.education === "highschool" && s.mi % 12 >= 9 && (s.flags.retaking === undefined || s.mi >= s.flags.retaking),
    intro: (s) => (retaking(s) ? L`${(s.flags.retakes ?? 1) >= 2 ? L("삼수") : L("재수")} 끝에 다시 본 수능 성적표가 나왔다. 이번에는 정해야 한다.` : L("수능 성적표가 나왔다. 앞으로의 진로를 정해야 한다.")),
    choices: [
      {
        id: "university",
        get label() { return L("성적에 맞춰 대학에 진학한다"); },
        when: (s) => !retaking(s),
        effect: {
          get text() { return L("성적에 맞춰 원서를 냈다."); },
          stats: { knowledge: 5, happiness: 3 },
          flags: { education: "university" },
          eduYears: 4,
          enroll: { level: "university", pick: "fit" },
        },
      },
      {
        id: "retake-apply",
        get label() { return L("다시 본 성적으로 대학에 지원한다"); },
        when: retaking,
        effect: {
          get text() { return L("1년을 버틴 성적표를 들고 원서를 냈다."); },
          risk: {
            chance: knowledgeOdds(0.5),
            success: {
              get text() { return L("재수 끝에 원하던 대학에 붙었다."); },
              stats: { knowledge: 10, happiness: 12 },
              flags: { education: "university" },
              eduYears: 4,
              enroll: { level: "university", pick: "better" },
            },
            failure: {
              get text() { return L("성적이 기대만큼 오르지 않았지만, 대학에는 진학하기로 했다."); },
              stats: { knowledge: 4, happiness: -5 },
              flags: { education: "university" },
              eduYears: 4,
              enroll: { level: "university", pick: "fit" },
            },
          },
        },
      },
      {
        id: "retake",
        label: (s) => (retaking(s) ? L("한 번 더 도전한다 (삼수)") : L("재수를 한다")),
        when: (s) => (s.flags.retakes ?? 0) < 2,
        effect: {
          get text() { return L("1년을 더 공부하기로 했다."); },
          stats: { happiness: -8 },
          intense: 6,
          retake: true,
        },
      },
      {
        id: "work",
        get label() { return L("대학 대신 바로 일을 시작한다"); },
        effect: {
          get text() { return L("또래보다 일찍 사회에 나왔다."); },
          stats: { knowledge: -2, happiness: 2 },
          flags: { education: "done" },
          hire: { tier: "field" },
        },
      },
    ],
  },
  {
    id: "military",
    get title() { return L("입대 영장"); },
    minAge: 19,
    maxAge: 28,
    // Once deferred, the notice comes back for sure when school ends or a year or two has passed.
    perYear: (s) => (s.marks?.["army-delay"] !== undefined ? 2 : 0.5),
    when: (s) => {
      if (s.profile.gender !== "남" || s.flags.military) return false;
      const delayed = s.marks?.["army-delay"];
      if (delayed === undefined) return true;
      return s.flags.education === "university" ? s.mi >= s.flags.eduUntil : s.mi - delayed >= 18;
    },
    intro: (s) => (s.marks?.["army-delay"] !== undefined ? L("미뤄 둔 입영 통지서가 다시 날아왔다. 이번에는 가야 한다.") : L("입영 통지서가 날아왔다.")),
    choices: [
      {
        id: "enlist",
        get label() { return L("지금 입대한다"); },
        effect: {
          get text() { return L("머리를 깎고 훈련소에 들어갔다."); },
          stats: { health: 3, relationships: 3, happiness: -6 },
          enlist: true,
        },
      },
      {
        id: "delay",
        get label() { return L("학업이나 일을 이유로 미룬다"); },
        when: (s) => (s.flags.education === "university" || s.flags.employed) && s.marks?.["army-delay"] === undefined && ageOf(s) < 26,
        effect: {
          get text() { return L("입대를 미뤘다. 언젠가는 가야 한다."); },
          stats: { happiness: 2 },
          mark: "army-delay",
        },
      },
    ],
  },
  {
    id: "graduation",
    get title() { return L("졸업 후의 길"); },
    minAge: 21,
    maxAge: 35,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "university" && s.mi >= s.flags.eduUntil && !inService(s),
    intro: (s) => L`${s.flags.school ? `${s.flags.school} ` : ""}졸업장을 받았다. 무엇을 할지 정해야 한다.`,
    choices: [
      {
        id: "big-company",
        get label() { return L("대기업 공채에 도전한다"); },
        when: (s) => DEGREE_RANK[degreeOnLeaving(s)] >= DEGREE_RANK.bachelor,
        effect: {
          get text() { return L("자기소개서를 수십 장 썼다."); },
          flags: { education: "done" },
          intense: 6,
          risk: {
            chance: knowledgeOdds(0.4),
            success: {
              get text() { return L("최종 합격 문자를 받았다."); },
              stats: { happiness: 12 },
              hire: { tier: "large" },
            },
            failure: {
              get text() { return L("대기업은 떨어졌고, 눈을 낮춰 다시 지원했다."); },
              stats: { happiness: -4 },
              hire: { tier: "small" },
            },
          },
        },
      },
      {
        id: "doctor",
        get label() { return L("의사 국가고시를 보고 수련의 과정을 밟는다"); },
        when: (s) => isMedical(s.profile.major) && DEGREE_RANK[degreeOnLeaving(s)] >= DEGREE_RANK.bachelor,
        effect: {
          get text() { return L("국가고시에 합격해 의사 면허를 받았다. 인턴 생활이 시작되었다."); },
          stats: { knowledge: 6, health: -4, happiness: 4 },
          flags: { education: "done" },
          intense: 6,
          hire: { tier: "doctor" },
        },
      },
      {
        id: "trade",
        get label() { return L("전공을 살려 바로 취업한다"); },
        when: (s) => degreeOnLeaving(s) === "college",
        effect: {
          get text() { return L("전공 실습 때 다진 손으로 이력서를 냈다."); },
          flags: { education: "done" },
          risk: {
            chance: knowledgeOdds(0.6),
            success: { get text() { return L("전공을 살려 취업했다."); }, stats: { happiness: 8 }, hire: { tier: "mid" } },
            failure: { get text() { return L("원하던 곳은 아니었지만 일을 시작했다."); }, stats: { happiness: -3 }, hire: { tier: "small" } },
          },
        },
      },
      {
        id: "civil-service",
        get label() { return L("공무원 시험을 준비한다"); },
        effect: {
          get text() { return L("노량진 학원에 등록했다."); },
          stats: { happiness: -6 },
          flags: { education: "done" },
          busyMonths: 14,
          intense: 3,
          risk: {
            chance: knowledgeOdds(0.35),
            success: {
              get text() { return L("공무원 시험에 합격했다."); },
              stats: { happiness: 10 },
              hire: { tier: "civil" },
            },
            failure: {
              get text() { return L("시험에 떨어지고 아르바이트를 시작했다."); },
              stats: { happiness: -10 },
              flags: { employed: false, job: "" },
              income: 120,
            },
          },
        },
      },
      {
        id: "grad-school",
        get label() { return L("대학원에 진학한다"); },
        when: (s) => DEGREE_RANK[degreeOnLeaving(s)] >= DEGREE_RANK.bachelor,
        effect: {
          get text() { return L("연구실 생활이 시작되었다."); },
          stats: { knowledge: 10, happiness: -2 },
          flags: { education: "graduate" },
          eduYears: 2,
          income: 80,
          enroll: { level: "graduate" },
        },
      },
      {
        id: "startup",
        get label() { return L("친구들과 창업한다"); },
        effect: {
          get text() { return L("작은 사무실을 얻고 창업했다."); },
          intense: 12,
          flags: { education: "done" },
          wealth: -1500,
          get note() { return L("사무실 보증금과 초기 비용"); },
          risk: {
            chance: () => 0.25,
            success: {
              get text() { return L("서비스가 입소문을 타며 투자를 받았다."); },
              stats: { happiness: 15, knowledge: 8 },
              flags: { employed: true, get job() { return L("스타트업 대표"); } },
              income: 500,
            },
            failure: {
              get text() { return L("1년 만에 폐업하고 빚이 남았다."); },
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
    get title() { return L("학위 이후"); },
    minAge: 23,
    maxAge: 45,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "graduate" && s.mi >= s.flags.eduUntil && degreeOnLeaving(s) !== "phd",
    get intro() { return L("석사 학위 논문이 통과되었다."); },
    choices: [
      {
        id: "research",
        get label() { return L("연구소에 취업한다"); },
        effect: {
          get text() { return L("연구원으로 일하게 되었다."); },
          stats: { knowledge: 5, happiness: 6 },
          flags: { education: "done" },
          hire: { tier: "research" },
        },
      },
      {
        id: "abroad",
        get label() { return L("해외 박사 과정에 도전한다"); },
        effect: {
          get text() { return L("짐을 싸서 해외로 떠났다."); },
          stats: { knowledge: 12, relationships: -8, happiness: 2 },
          flags: { education: "graduate" },
          eduYears: 5,
          income: 150,
          enroll: { level: "abroad" },
        },
      },
      {
        id: "phd",
        get label() { return L("국내 박사 과정에 진학한다"); },
        effect: {
          get text() { return L("연구실에 남아 박사 과정을 시작했다."); },
          stats: { knowledge: 8, happiness: -3 },
          flags: { education: "graduate" },
          eduYears: 4,
          income: 120,
          enroll: { level: "graduate" },
        },
      },
      {
        id: "industry",
        get label() { return L("기업 연구직으로 간다"); },
        effect: {
          get text() { return L("기업 연구소에 들어갔다."); },
          stats: { happiness: 4 },
          flags: { education: "done" },
          hire: { tier: "large", get title() { return L("연구원"); } },
        },
      },
    ],
  },
  {
    id: "phd-done",
    get title() { return L("박사 학위 이후"); },
    minAge: 26,
    maxAge: 55,
    perYear: 1,
    once: true,
    when: (s) => s.flags.education === "graduate" && s.mi >= s.flags.eduUntil && degreeOnLeaving(s) === "phd",
    intro: (s) => L`${s.flags.school ? L`${s.flags.school}에서 ` : ""}박사 학위를 받았다. 긴 터널 끝에서 다음 길을 정해야 한다.`,
    theme: "career",
    choices: [
      {
        id: "professor",
        get label() { return L("교수 임용에 도전한다"); },
        effect: {
          get text() { return L("논문 목록을 정리해 여러 대학에 지원서를 냈다."); },
          flags: { education: "done" },
          intense: 6,
          risk: {
            chance: knowledgeOdds(0.25),
            success: { get text() { return L("교수 임용 최종 합격 통보를 받았다."); }, stats: { happiness: 15, knowledge: 4 }, hire: { tier: "professor" } },
            failure: { get text() { return L("임용의 문턱은 높았다. 우선 연구소에 자리를 잡고 다음 공고를 기다리기로 했다."); }, stats: { happiness: -6 }, hire: { tier: "research" } },
          },
        },
      },
      {
        id: "institute",
        get label() { return L("국책 연구소에 들어간다"); },
        effect: { get text() { return L("박사급 연구원으로 연구소에 들어갔다."); }, stats: { happiness: 6 }, flags: { education: "done" }, hire: { tier: "research", get title() { return L("선임연구원"); } } },
      },
      {
        id: "industry",
        get label() { return L("기업 연구소로 간다"); },
        effect: { get text() { return L("박사급 대우를 받고 기업 연구소에 들어갔다."); }, stats: { happiness: 5 }, flags: { education: "done" }, hire: { tier: "large", get title() { return L("책임연구원"); } } },
      },
    ],
  },
  // ── 일 ──────────────────────────────────────────
  {
    id: "job-search",
    get title() { return L("일자리 찾기"); },
    minAge: 20,
    maxAge: 50,
    perYear: 0.8,
    cooldown: 12,
    repeatable: true,
    when: (s) => !s.flags.employed && !s.flags.retired && s.flags.education === "done",
    intro: (s) => L`통장 잔고가 줄어들고 있다${s.wealth < 1000 ? L` (남은 자산 ${formatWealth(s.wealth)})` : ""}.${s.flags.children ? L` ${s.flags.children > 1 ? L`아이 ${s.flags.children}명을` : L("아이를")} 키우려면` : ""} 일을 구해야 한다.`,
    choices: [
      {
        id: "regular",
        get label() { return L("정규직에 계속 지원한다"); },
        effect: {
          get text() { return L("이력서를 다시 다듬었다."); },
          intense: 3,
          risk: {
            chance: knowledgeOdds(0.5),
            success: {
              get text() { return L("정규직 합격 소식을 받았다."); },
              stats: { happiness: 10 },
              hire: { tier: "auto" },
            },
            failure: {
              get text() { return L("번번이 떨어졌다."); },
              stats: { happiness: -8 },
            },
          },
        },
      },
      {
        id: "contract",
        get label() { return L("계약직이라도 먼저 시작한다"); },
        effect: {
          get text() { return L("계약직으로 일을 시작했다."); },
          stats: { happiness: 2 },
          hire: { tier: "contract" },
        },
      },
      {
        id: "skill-up",
        get label() { return L("기술을 배우며 준비한다"); },
        effect: {
          get text() { return L("국비 교육 과정에 들어갔다. 수강료는 내일배움카드로 해결했다."); },
          stats: { knowledge: 8, happiness: -2 },
          busyMonths: 6,
        },
      },
    ],
  },
  {
    id: "job-offer",
    get title() { return L("이직 제안"); },
    minAge: 27,
    maxAge: 55,
    perYear: 0.15,
    cooldown: 24,
    when: (s) => employee(s.flags),
    intro: (s) => L`${s.flags.company ? L`${s.flags.company}에서 일한 지 몇 해, ` : ""}예전 동료에게서 함께 일하자는 연락이 왔다. 지금 연봉은 ${formatWealth(s.income * 12)}이다.`,
    choices: [
      {
        id: "move",
        get label() { return L("더 좋은 조건으로 옮긴다"); },
        effect: {
          get text() { return L("새 회사로 옮겼다."); },
          intense: 3,
          switchJob: { payPct: 1.2 },
          risk: {
            chance: () => 0.7,
            success: { get text() { return L("일도 사람도 잘 맞았다."); }, stats: { happiness: 8 } },
            failure: { get text() { return L("연봉은 올랐지만 조직 문화가 맞지 않았다."); }, stats: { happiness: -10, health: -3 } },
          },
        },
      },
      {
        id: "negotiate",
        get label() { return L("제안을 근거로 지금 회사와 협상한다"); },
        effect: { get text() { return L("연봉을 조금 올렸다."); }, stats: { happiness: 3 }, incomePct: 1.06 },
      },
      {
        id: "stay",
        get label() { return L("지금 자리에 남는다"); },
        effect: { get text() { return L("익숙한 자리에 남았다."); }, stats: { relationships: 2 } },
      },
    ],
  },
  {
    id: "startup-itch",
    get title() { return L("창업의 유혹"); },
    minAge: 28,
    maxAge: 52,
    perYear: 0.06,
    cooldown: 60,
    when: (s) => employee(s.flags),
    get intro() { return L("오래 품어온 사업 아이디어가 머리를 떠나지 않는다."); },
    choices: [
      {
        id: "quit",
        get label() { return L("회사를 그만두고 창업한다"); },
        // The business opens now; whether it lasts plays out over the next year or two (moreEvents: venture-result).
        effect: {
          get text() { return L("사표를 내고 창업했다."); },
          stats: { happiness: 6 },
          intense: 12,
          wealth: -3000,
          get note() { return L("창업 자금"); },
          startBusiness: { get title() { return L("사업가"); }, income: 250 },
        },
      },
      {
        id: "side",
        get label() { return L("퇴근 후 사이드 프로젝트로 해본다"); },
        effect: { get text() { return L("주말마다 작은 프로젝트를 시작했다."); }, stats: { knowledge: 5, happiness: 3, health: -2 } },
      },
      {
        id: "drop",
        get label() { return L("현실을 택하고 접는다"); },
        effect: { get text() { return L("아이디어를 서랍에 넣었다."); }, stats: { happiness: -2 } },
      },
    ],
  },
  {
    id: "layoff",
    get title() { return L("희망퇴직"); },
    minAge: 40,
    maxAge: 60,
    perYear: 0.04,
    once: true,
    when: (s) => employee(s.flags) && s.flags.job !== L("공무원"),
    intro: (s) => L`${s.flags.company || L("회사")}가 구조조정을 발표하고 희망퇴직 신청을 받는다. 위로금은 연봉 1년 치 수준이다.`,
    choices: [
      {
        id: "accept",
        get label() { return L("위로금을 받고 나온다"); },
        effect: {
          get text() { return L("위로금을 받고 회사를 나왔다."); },
          stats: { happiness: -6 },
          wealth: 6000,
          get note() { return L("희망퇴직 위로금"); },
          flags: { employed: false, job: "" },
          income: 0,
        },
      },
      {
        id: "hold",
        get label() { return L("끝까지 버틴다"); },
        effect: {
          get text() { return L("버티기로 했다."); },
          risk: {
            chance: () => 0.6,
            success: { get text() { return L("구조조정이 끝나고 자리를 지켰다."); }, stats: { happiness: -4 } },
            failure: {
              get text() { return L("결국 권고사직을 받았다."); },
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
    get title() { return L("은퇴"); },
    minAge: 58,
    maxAge: 70,
    perYear: 0.6,
    once: true,
    when: (s) => s.flags.employed,
    intro: (s) => (ownsBusiness(s.flags) ? L("몸이 예전 같지 않다. 가게를 언제까지 할지 정해야 할 때가 왔다.") : L("정년이 다가왔다. 이후의 삶을 정해야 한다.")),
    choices: [
      {
        id: "retire",
        label: (s) => (ownsBusiness(s.flags) ? L("가게를 정리하고 은퇴한다") : L("은퇴하고 연금으로 산다")),
        effect: {
          text: (s) => (ownsBusiness(s.flags) ? L("오래 지킨 가게 문을 마지막으로 닫았다.") : L("긴 직장 생활을 마쳤다.")),
          stats: { happiness: 5, health: 2 },
          flags: { employed: false, retired: true, get job() { return L("은퇴"); } },
          income: 130,
        },
      },
      {
        id: "rehire",
        label: (s) => (ownsBusiness(s.flags) ? L("규모를 줄여 조금 더 한다") : L("재취업해 조금 더 일한다")),
        effect: {
          text: (s) => (ownsBusiness(s.flags) ? L("가게를 줄여 쉬엄쉬엄 이어 갔다.") : L("경력을 살려 작은 회사에 재취업했다.")),
          stats: { knowledge: 2, health: -2 },
          incomePct: 0.5,
        },
      },
      {
        id: "countryside",
        get label() { return L("귀촌한다"); },
        effect: {
          get text() { return L("시골에 작은 집을 얻었다."); },
          stats: { happiness: 8, health: 4, relationships: -4 },
          flags: { employed: false, retired: true, get job() { return L("은퇴"); } },
          wealth: -2000,
          get note() { return L("시골집 마련"); },
          income: 110,
        },
      },
    ],
  },
  // ── 관계 ──────────────────────────────────────────
  {
    id: "crush",
    get title() { return L("설레는 사람"); },
    minAge: 17,
    maxAge: 48,
    perYear: 0.35,
    cooldown: 12,
    when: (s) => s.flags.partner === "none" || s.flags.partner === "divorced" || s.flags.partner === "widowed",
    repeatable: true, // comes back until it is settled
    get intro() { return L("자꾸 눈길이 가는 사람이 생겼다."); },
    choices: [
      {
        id: "confess",
        get label() { return L("용기를 내어 마음을 전한다"); },
        effect: {
          get text() { return L("마음을 전했다."); },
          risk: {
            chance: (s) => Math.min(0.85, 0.35 + s.stats.relationships / 200),
            success: { get text() { return L("연애를 시작했다."); }, stats: { happiness: 12, relationships: 6 }, flags: { partner: "dating" } },
            failure: { get text() { return L("정중하게 거절당했다."); }, stats: { happiness: -8 } },
          },
        },
      },
      {
        id: "friend",
        get label() { return L("친구로 지낸다"); },
        effect: { get text() { return L("좋은 친구로 남았다."); }, stats: { relationships: 4 } },
      },
      {
        id: "focus",
        get label() { return L("지금은 내 일에 집중한다"); },
        effect: { get text() { return L("마음을 접고 일에 집중했다."); }, stats: { knowledge: 3, happiness: -2 } },
      },
    ],
  },
  {
    id: "marriage",
    get title() { return L("결혼 이야기"); },
    minAge: 24,
    maxAge: 55,
    perYear: 0.45,
    cooldown: 12,
    when: (s) => s.flags.partner === "dating",
    repeatable: true, // comes back until it is settled
    get intro() { return L("연인과 결혼 이야기가 오가기 시작했다."); },
    choices: [
      {
        id: "marry",
        get label() { return L("결혼한다"); },
        effect: {
          get text() { return L("결혼식을 올렸다."); },
          stats: { happiness: 12, relationships: 10 },
          flags: { partner: "married" },
          wealth: -2500,
          get note() { return L("예식과 신혼살림"); },
          intense: 3,
        },
      },
      {
        id: "wait",
        get label() { return L("조금 더 연애한다"); },
        effect: { get text() { return L("결혼은 조금 더 생각해보기로 했다."); }, stats: { relationships: 2 } },
      },
      {
        id: "breakup",
        get label() { return L("헤어진다"); },
        effect: { get text() { return L("긴 대화 끝에 헤어졌다."); }, stats: { happiness: -12, relationships: -5 }, flags: { partner: "none" } },
      },
    ],
  },
  {
    id: "baby",
    get title() { return L("아이"); },
    minAge: 25,
    maxAge: 44,
    perYear: 0.3,
    cooldown: 18,
    when: (s) => s.flags.partner === "married" && s.flags.children < 3 && !s.flags.noKids,
    repeatable: true, // comes back until it is settled
    intro: (s) => {
      const n = s.flags.children;
      const work = !s.flags.employed && !s.flags.retired ? L(" 아직 일자리를 찾는 중이라 마음이 복잡하다.") : "";
      if (n === 0) return L`배우자와 아이 이야기를 나누게 되었다.${work}`;
      return L`${n === 1 ? L("첫째를") : L`아이 ${n}명을`} 키우는 사이, 배우자와 ${n === 1 ? L("둘째") : `${["", "", "", L("셋째"), L("넷째"), L("다섯째")][n + 1] ?? L("막내")}`} 이야기가 나왔다.${work}`;
    },
    choices: [
      {
        id: "have",
        label: (s) => (s.flags.children === 0 ? L("아이를 갖는다") : s.flags.children === 1 ? L("둘째를 갖는다") : L`한 명 더, ${["", "", "", L("셋째"), L("넷째"), L("다섯째")][s.flags.children + 1] ?? L("막내")}를 갖는다`),
        effect: {
          text: "",
          stats: { happiness: 10, relationships: 8, health: -3 },
          addChild: true,
          wealth: -800,
          get note() { return L("출산과 산후조리"); },
          intense: 6,
        },
      },
      {
        id: "later",
        get label() { return L("아직은 아니다"); },
        effect: { get text() { return L("조금 더 준비하기로 했다."); }, stats: {} },
      },
      {
        id: "dink",
        label: (s) => (s.flags.children === 0 ? L("둘이서만 살기로 한다") : s.flags.children === 1 ? L("외동으로 키우기로 한다") : L("지금 아이들로 충분하다")),
        effect: { text: (s) => (s.flags.children === 0 ? L("둘만의 삶을 꾸리기로 했다.") : L("지금의 가족에 집중하기로 했다.")), stats: { happiness: 3 }, flags: { noKids: true } },
      },
    ],
  },
  {
    id: "marriage-crisis",
    get title() { return L("부부의 위기"); },
    minAge: 30,
    maxAge: 70,
    perYear: (s) => (s.stats.relationships < 40 ? 0.08 : 0.025),
    cooldown: 60,
    when: (s) => s.flags.partner === "married",
    get intro() { return L("배우자와 다툼이 잦아졌다. 대화가 줄었다."); },
    choices: [
      {
        id: "counsel",
        get label() { return L("부부 상담을 받는다"); },
        effect: { get text() { return L("상담을 받으며 서로를 다시 알아갔다."); }, stats: { relationships: 8, happiness: 4 }, wealth: -200, get note() { return L("상담비"); } },
      },
      {
        id: "divorce",
        get label() { return L("이혼한다"); },
        effect: {
          get text() { return L("이혼 서류에 도장을 찍었다."); },
          stats: { happiness: -10, relationships: -8 },
          flags: { partner: "divorced" },
          wealthPct: -0.4,
          get note() { return L("재산 분할"); },
        },
      },
      {
        id: "endure",
        get label() { return L("참고 지낸다"); },
        effect: { get text() { return L("아무 일 없다는 듯 지냈다."); }, stats: { happiness: -6, health: -2 } },
      },
    ],
  },
  {
    id: "parent-care",
    get title() { return L("부모님의 노후"); },
    minAge: 42,
    maxAge: 65,
    perYear: 0.12,
    once: true,
    get intro() { return L("부모님의 건강이 급격히 나빠졌다."); },
    choices: [
      {
        id: "live-together",
        get label() { return L("직접 모신다"); },
        effect: { get text() { return L("부모님을 모시고 살게 되었다."); }, stats: { relationships: 8, happiness: -5, health: -3 }, wealth: -1500 },
      },
      {
        id: "facility",
        get label() { return L("요양 시설을 알아본다"); },
        effect: { get text() { return L("좋은 요양원을 찾아 자주 찾아뵈었다."); }, stats: { relationships: -2 }, wealth: -3000 },
      },
      {
        id: "share",
        get label() { return L("형제자매와 나눠 맡는다"); },
        effect: { get text() { return L("형제자매와 돌아가며 돌보기로 했다."); }, stats: { relationships: 3 }, wealth: -800 },
      },
    ],
  },
  // ── 돈 ──────────────────────────────────────────
  {
    id: "house",
    get title() { return L("내 집 마련"); },
    minAge: 29,
    maxAge: 62,
    perYear: 0.15,
    cooldown: 36,
    when: (s) => !s.flags.homeOwner && s.wealth > 8000,
    repeatable: true, // comes back until it is settled
    intro: (s) => L`전세 계약 만료가 다가온다. 모아둔 돈은 ${formatWealth(s.wealth)}. 집값 이야기가 끊이지 않는다.`,
    choices: [
      {
        id: "buy",
        label: (s) => (s.wealth < 30000 ? L("대출을 끼고 집을 산다") : L("집을 산다")),
        effect: {
          text: "",
          buyHome: "best",
          stats: { happiness: 6 },
          risk: {
            chance: () => 0.6,
            success: { get text() { return L("몇 년 사이 집값이 올랐다."); }, homeValuePct: 0.3 },
            failure: { text: (s) => (s.flags.mortgage ? L("집값이 떨어지고 이자 부담이 커졌다.") : L("사자마자 집값이 떨어졌다.")), homeValuePct: -0.12, stats: { happiness: -6 } },
          },
        },
      },
      {
        id: "rent",
        get label() { return L("전세로 계속 산다"); },
        effect: { get text() { return L("전세를 연장했다."); }, stats: {} },
      },
      {
        id: "move-out",
        get label() { return L("집값이 싼 곳으로 옮긴다"); },
        effect: {
          get text() { return L("외곽으로 이사했다."); },
          buyHome: "cheap",
          stats: { happiness: 2, relationships: -3 },
        },
      },
    ],
  },
  {
    id: "investment",
    get title() { return L("투자 열풍"); },
    minAge: 25,
    maxAge: 75,
    perYear: 0.12,
    cooldown: 36,
    when: (s) => s.wealth > 1000,
    get intro() { return L("주변 사람들이 모두 주식과 코인 이야기를 한다."); },
    choices: [
      {
        id: "all-in",
        get label() { return L("크게 투자한다"); },
        effect: {
          get text() { return L("모아둔 돈의 상당 부분을 투자했다."); },
          risk: {
            chance: () => 0.4,
            success: { get text() { return L("수익률이 크게 났다."); }, wealthPct: 0.6, stats: { happiness: 8 } },
            failure: { get text() { return L("반 토막이 났다."); }, wealthPct: -0.35, stats: { happiness: -10, health: -2 } },
          },
        },
      },
      {
        id: "little",
        get label() { return L("조금만 넣어본다"); },
        effect: {
          get text() { return L("여윳돈만 조금 투자했다."); },
          risk: {
            chance: () => 0.55,
            success: { get text() { return L("소소하게 벌었다."); }, wealthPct: 0.06 },
            failure: { get text() { return L("조금 잃었다."); }, wealthPct: -0.04 },
          },
        },
      },
      {
        id: "skip",
        get label() { return L("관심을 끈다"); },
        effect: { get text() { return L("적금이나 꾸준히 넣기로 했다."); }, stats: {} },
      },
    ],
  },
  // ── 건강 ──────────────────────────────────────────
  {
    id: "health-warning",
    get title() { return L("건강검진 결과"); },
    minAge: 38,
    maxAge: 95,
    perYear: (s) => 0.05 + (s.stats.health < 50 ? 0.15 : 0),
    cooldown: 24,
    get intro() { return L("건강검진에서 재검 판정이 나왔다."); },
    choices: [
      {
        id: "treat",
        get label() { return L("바로 정밀검사와 치료를 받는다"); },
        effect: { get text() { return L("일찍 발견해 치료를 받았다."); }, stats: { health: 12, happiness: -2 }, wealth: -500, get note() { return L("정밀검사와 치료비"); } },
      },
      {
        id: "lifestyle",
        get label() { return L("운동과 식단부터 바꾼다"); },
        effect: { get text() { return L("매일 아침 걷기 시작했다."); }, stats: { health: 7, happiness: 2 } },
      },
      {
        id: "ignore",
        get label() { return L("바빠서 미룬다"); },
        effect: {
          get text() { return L("일이 바빠 병원 가는 걸 미뤘다."); },
          risk: {
            chance: () => 0.5,
            success: { get text() { return L("다행히 큰 문제는 없었다."); }, stats: {} },
            failure: { get text() { return L("나중에 병이 커져서 발견되었다."); }, stats: { health: -20, happiness: -8 }, wealth: -1500, get note() { return L("수술과 입원비"); } },
          },
        },
      },
    ],
  },
  {
    id: "golden-years",
    get title() { return L("노년의 하루"); },
    minAge: 62,
    maxAge: 100,
    perYear: 0.2,
    cooldown: 48,
    get intro() { return L("시간이 많아졌다. 무엇으로 하루를 채울까."); },
    choices: [
      {
        id: "volunteer",
        get label() { return L("봉사활동을 시작한다"); },
        effect: { get text() { return L("동네 복지관에서 봉사를 시작했다."); }, stats: { happiness: 6, relationships: 6 } },
      },
      {
        id: "grandkids",
        get label() { return L("손주를 돌본다"); },
        when: (s) => s.flags.children > 0,
        effect: { get text() { return L("손주들과 시간을 보냈다."); }, stats: { happiness: 8, relationships: 8, health: -2 } },
      },
      {
        id: "travel",
        get label() { return L("여행을 다닌다"); },
        effect: { get text() { return L("가보고 싶던 곳들을 다녔다."); }, stats: { happiness: 9, health: 2 }, wealth: -600 },
      },
      {
        id: "learn",
        get label() { return L("새로운 것을 배운다"); },
        effect: { get text() { return L("평생교육원에 등록했다."); }, stats: { knowledge: 6, happiness: 4 } },
      },
    ],
  },
  // ── 선택 없이 일어나는 일 ───────────────────────────
  {
    id: "promotion",
    get title() { return L("승진"); },
    minAge: 28,
    maxAge: 60,
    perYear: (s) => 0.12 + (s.stats.knowledge - 50) / 500,
    cooldown: 24,
    repeatable: true,
    when: (s) => employee(s.flags),
    intro: "",
    effect: { get text() { return L("책임도 월급도 늘었다."); }, stats: { happiness: 5 }, incomePct: 1.12, promote: true },
  },
  {
    id: "illness",
    get title() { return L("병치레"); },
    minAge: 0,
    maxAge: 120,
    perYear: (s) => 0.02 + Math.max(0, 50 - s.stats.health) / 400,
    cooldown: 12,
    intro: "",
    effect: { get text() { return L("크게 앓아누웠다."); }, stats: { health: -10, happiness: -4 }, wealth: -200, get note() { return L("병원비"); } },
  },
  {
    id: "old-friend",
    get title() { return L("오랜 친구"); },
    minAge: 20,
    maxAge: 100,
    perYear: 0.12,
    cooldown: 24,
    intro: "",
    effect: { get text() { return L("오랜 친구와 다시 연락이 닿았다."); }, stats: { relationships: 5, happiness: 3 } },
  },
  {
    id: "drift-apart",
    get title() { return L("멀어진 연인"); },
    minAge: 18,
    maxAge: 60,
    perYear: 0.1,
    cooldown: 12,
    when: (s) => s.flags.partner === "dating",
    intro: "",
    effect: { get text() { return L("연인과 조금씩 멀어지다 헤어졌다."); }, stats: { happiness: -8 }, flags: { partner: "none" } },
  },
  {
    id: "spouse-loss",
    get title() { return L("배우자와의 이별"); },
    minAge: 65,
    maxAge: 120,
    perYear: (s) => Math.max(0, (ageOf(s) - 60) * 0.004),
    once: true,
    when: (s) => s.flags.partner === "married",
    intro: "",
    effect: { get text() { return L("평생을 함께한 배우자가 먼저 세상을 떠났다."); }, stats: { happiness: -20, relationships: -10, health: -5 }, flags: { partner: "widowed" } },
  },
  {
    id: "home-parent",
    get title() { return L("아이와 일자리"); },
    minAge: 20,
    maxAge: 50,
    perYear: 0.9,
    cooldown: 14,
    repeatable: true,
    when: (s) => !s.flags.employed && !s.flags.retired && s.flags.education === "done" && (s.flags.kidsBorn ?? []).some((b) => s.mi - b < 12),
    get intro() { return L("아이가 태어났지만 아직 일자리가 없다. 육아와 구직을 어떻게 할지 정해야 한다."); },
    theme: "family",
    choices: [
      { id: "care", get label() { return L("1년은 육아에 전념한다"); }, effect: { get text() { return L("아이 곁에서 첫해를 보냈다. 통장은 가벼워졌지만 아이와 가까워졌다."); }, stats: { relationships: 8, happiness: 3 }, busyMonths: 12 } },
      {
        id: "daycare",
        get label() { return L("어린이집에 맡기고 구직에 나선다"); },
        effect: {
          get text() { return L("아이를 어린이집에 맡기고 면접을 다녔다."); },
          stats: { happiness: -2 },
          wealth: -150,
          get note() { return L("어린이집 비용"); },
          risk: { chance: (s) => Math.min(0.8, 0.35 + s.stats.knowledge / 200), success: { get text() { return L("일자리를 구했다."); }, stats: { happiness: 6 }, hire: { tier: "auto" } }, failure: { get text() { return L("아직 합격 소식은 없었다."); }, stats: { happiness: -4 } } },
        },
      },
      { id: "remote", get label() { return L("집에서 할 수 있는 일을 찾는다"); }, effect: { get text() { return L("아이가 잠든 밤에 재택 부업을 시작했다."); }, stats: { health: -2, knowledge: 2 }, income: 120, flags: { employed: true, get job() { return L("재택 프리랜서"); } } } },
    ],
  },
  {
    // Written by the AI for this life (title, scene, options, effects); never fires without AI.
    id: "personal",
    get title() { return L("나만의 갈림길"); },
    minAge: 15,
    maxAge: 95,
    perYear: 0.3,
    cooldown: 20,
    repeatable: true, // each one is written fresh
    when: (s) => !!s.ai,
    intro: "",
    choices: [],
  },
];

export const EVENTS: EventDef[] = [...CORE_EVENTS, ...LIFE_EVENTS, ...MORE_EVENTS];

const POOLS: Partial<Record<Region, EventDef[]>> = {};

/** The events that can happen in a life in the current region, in pool order. */
export function eventsHere(): EventDef[] {
  const r = region();
  return (POOLS[r] ??= EVENTS.filter((e) => !e.region || e.region === r));
}

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
