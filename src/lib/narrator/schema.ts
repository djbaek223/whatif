import { z } from "zod";

const PRESETS = ["original", "study", "career", "risk", "love", "move", "family", "health", "rest"] as const;

export const OpeningSchema = z.object({
  persona: z.string().describe("이 사람에 대한 2~3문장 요약. 성향과 가치관 중심."),
  stats: z
    .object({
      health: z.number().int(),
      happiness: z.number().int(),
      knowledge: z.number().int(),
      relationships: z.number().int(),
    })
    .describe("변곡점 시점의 능력치, 각각 0~100"),
  era: z.string().describe("변곡점 시점의 시대 배경. 2~3문단, 감각적인 디테일 포함."),
  situation: z.string().describe("그 시점의 '나'가 처한 상황과 고민을 2인칭으로 쓴 한 문단. 마지막은 결정을 묻는 문장."),
  initial: z.object({
    education: z.enum(["school", "highschool", "university", "graduate", "done"]),
    employed: z.boolean().describe("실제로 일하고 있으면 true. 구직 중, 취업 준비, 휴학, 무직이면 false"),
    jobTitle: z.string().describe("직함이나 직업만 (예: 사원, 간호사, 9급 공무원). 일하지 않거나 구직 중이면 빈 문자열"),
    company: z.string().describe("다니는 회사·기관의 실제 이름 (예: 삼성전자, 서울아산병원). 일하지 않으면 빈 문자열"),
    school: z.string().describe("재학 중이거나 마지막으로 다닌 학교 이름. 프로필의 학교를 우선. 없으면 빈 문자열"),
    monthlyIncome: z.number().int().describe("만원 단위 월수입"),
    partner: z.enum(["none", "dating", "married", "divorced", "widowed"]),
    children: z.number().int(),
    wealth: z.number().int().describe("만원 단위 순자산"),
  }),
  choices: z
    .array(
      z.object({
        label: z.string().describe("선택지 문장, 30자 이내"),
        preset: z.enum(PRESETS).describe("이 선택이 삶에 주는 영향의 유형"),
        jobTitle: z.string().describe("career/risk 선택이면 새 직업 이름, 아니면 빈 문자열"),
        place: z.string().describe("이 선택으로 가게 되는 구체적인 회사나 학교의 실제 이름 (예: 카카오, 부산대학교). 해당 없으면 빈 문자열"),
        original: z.boolean().describe("실제로 했던 선택이면 true. 정확히 하나만 true"),
        education: z
          .enum(["same", "highschool", "university", "graduate", "done"])
          .describe("이 선택 직후의 학업 상태. 바뀌지 않으면 same. 예: 대학 진학 → university, 재수 → highschool, 취업 → done"),
      }),
    )
    .describe("정확히 3개. 실제 했던 선택 하나와, 다른 길 2개. 그 밖의 길은 사용자가 직접 씁니다"),
});
export type OpeningResult = z.infer<typeof OpeningSchema>;

export const SceneSchema = z.object({
  scene: z.string().describe("이 순간을 2인칭으로 그리는 2~4문장. 시대와 이 사람의 상황을 반영."),
  labels: z.array(
    z.object({
      id: z.string(),
      label: z.string().describe("이 사람에게 맞춘 선택지 문장, 30자 이내. 현재 상태와 맞아야 함"),
      place: z.string().describe("이 선택지의 회사·학교 이름을 이 사람에게 더 맞는 같은 급의 실제 이름으로 바꾸고 싶을 때만 그 이름. 아니면 빈 문자열"),
    }),
  ),
});
export type SceneResult = z.infer<typeof SceneSchema> & { episodes?: EpisodeResult[] };

const CHANGES = ["none", "hire", "switchJob", "quitJob", "startBusiness", "closeBusiness", "enrollUniversity", "enrollGraduate", "buyHome", "addChild", "startDating", "marry", "retire"] as const;
const THEMES = ["career", "study", "family", "love", "risk", "money", "health", "leisure"] as const;

const CATEGORIES = ["daily", "relation", "work", "money", "health", "era", "chance"] as const;

export const MomentSchema = z.object({
  title: z.string().describe("이 순간의 제목, 15자 이내"),
  type: z.enum(CATEGORIES).describe("이 순간의 종류: daily 일상, relation 관계, work 일, money 돈, health 건강, era 시대, chance 우연"),
  keywords: z.array(z.string()).describe("이 순간의 핵심 키워드 2~3개, 각각 한두 단어 (예: 동업, 대학 동기)"),
  tone: z.string().describe("이 장면의 톤 하나: 유쾌함, 뭉클함, 긴장감, 담담함 중에서"),
  scene: z.string().describe("이 사람의 현재 상태, 성향, 지난 선택에서 자연스럽게 생긴 갈림길을 2인칭으로 그리는 2~4문장"),
  options: z
    .array(
      z.object({
        label: z.string().describe("선택지 문장, 30자 이내"),
        theme: z.enum(THEMES).describe("이 선택이 주로 무엇에 관한 것인지"),
        change: z.enum(CHANGES).describe("이 선택으로 바뀌는 큰 상태. allowed_changes 안에서만 고르고, 없으면 none"),
        place: z.string().describe("hire/switchJob/enroll이면 구체적인 실제 회사·학교 이름, startBusiness면 차리는 가게·사업 이름 (예: 연남동 작은 카페), 아니면 빈 문자열"),
        jobTitle: z.string().describe("startBusiness면 새 직업 이름 (예: 카페 사장, 프리랜서 디자이너), 아니면 빈 문자열"),
        salary: z.number().int().describe("hire/switchJob이면 연봉(만원, 2026년 기준), 아니면 0"),
        money: z.number().int().describe("이 선택으로 드는 돈(음수)이나 들어오는 돈(양수), 만원. 없으면 0"),
        stats: z
          .object({ health: z.number().int(), happiness: z.number().int(), knowledge: z.number().int(), relationships: z.number().int() })
          .describe("능력치 변화, 각각 -10~10"),
        chance: z.number().describe("성공 확률 0~1. 결과가 확실하면 1"),
        outcome: z.string().describe("이 선택을 했을 때(성공했을 때) 일어난 일, 과거형 1~2문장"),
        failure: z.string().describe("chance가 1보다 작을 때 실패하면 일어난 일, 과거형 1문장. 아니면 빈 문자열"),
      }),
    )
    .describe("2~4개. 이 사람다운 선택과 반대되는 선택을 함께"),
  followUp: z.string().describe("이 일이 몇 달~1년 뒤 다시 이어질 수 있다면 그 실마리 한 줄 (예: 동업을 제안한 대학 동기 민수가 다시 연락해 올 수 있다). 없으면 빈 문자열"),
});

/** A moment the pool scheduled: it changes nothing big, so its options carry no change, workplace or pay. */
export const SlotMomentSchema = MomentSchema.extend({
  options: z
    .array(MomentSchema.shape.options.element.omit({ change: true, place: true, jobTitle: true, salary: true }))
    .describe("2~4개. 이 사람다운 선택과 반대되는 선택을 함께"),
});

type MomentOption = z.infer<typeof MomentSchema>["options"][number];
type BigFields = "change" | "place" | "jobTitle" | "salary";
export type MomentResult = Omit<z.infer<typeof MomentSchema>, "options"> & {
  options: (Omit<MomentOption, BigFields> & Partial<Pick<MomentOption, BigFields>>)[];
  episodes?: EpisodeResult[];
};

const EpisodeSchema = z.object({
  title: z.string().describe("10자 이내 제목"),
  type: z.enum(["daily", "relation", "work", "money", "health", "chance"]),
  text: z.string().describe("선택 없이 지나가는 일, 과거형 1~2문장"),
  stats: z.object({ health: z.number().int(), happiness: z.number().int(), knowledge: z.number().int(), relationships: z.number().int() }).describe("각각 -4~4, 대부분 0"),
  money: z.number().int().describe("만원. 대부분 0"),
  keywords: z.array(z.string()).describe("핵심 키워드 1~2개"),
});
export type EpisodeResult = z.infer<typeof EpisodeSchema>;

/** Adds the everyday moments for the coming months to a scene or moment reply, so they come with a call that is made anyway. */
export const withEpisodes = <S extends z.ZodObject>(schema: S) =>
  schema.extend({ episodes: z.array(EpisodeSchema).describe("앞으로 몇 달 사이 이 사람에게 있을 법한 작은 일상 장면 3개. 서로 다른 type") });

export const ClassifySchema = z.object({
  choiceId: z.string().describe("사용자의 글과 가장 가까운 선택지 id"),
  change: z.enum(CHANGES).describe("사용자의 글이 말하는 큰 상태 변화. allowed_changes 안에서만 고르고, 큰 변화가 없으면 none"),
  jobTitle: z.string().describe("change가 startBusiness면 새 직업 이름 (예: 카페 사장), 아니면 빈 문자열"),
  place: z.string().describe("사용자가 말한 회사·가게·학교 이름 (예: '삼성전자', '서울대', '미국 대학원'). change와 상관없이 글에 있으면 적고, 없으면 빈 문자열"),
});
export type ClassifyResult = z.infer<typeof ClassifySchema>;

export const EndingSchema = z.object({
  title: z.string().describe("이 인생의 제목, 20자 이내"),
  memoir: z.string().describe("1인칭 회고록. 4~6문단. 문단 사이는 빈 줄."),
  epitaph: z.string().describe("묘비명 한 줄"),
  comparison: z.string().describe("실제 삶과 이 다른 가지의 삶을 비교하는 2~3문장. 실제 삶 정보가 없으면 변곡점의 선택 중심으로."),
});
export type EndingResult = z.infer<typeof EndingSchema>;

/** What the engine fixed about a moment the narrator writes: its kind and weight, with the pool's version as a reference. */
export interface MomentSlot {
  title: string;
  intro: string;
  category: string;
  keywords: string[];
  small: boolean; // a small two-way dilemma
  rare: boolean; // the engine rolled a rare moment (1% a year or less)
}

export type NarrateRequest =
  | { kind: "opening"; profile: unknown; turningPoint: unknown; eraHints: string[]; age: number; hints?: { kind: string; roadNotTaken: string | null; examples: string[] } }
  | {
      kind: "scene";
      summary: string;
      facts: string;
      persona: string;
      title: string;
      intro: string;
      options: { id: string; label: string; detail?: string }[];
      eraHints: string[];
      seeds?: string[];
      episodes?: boolean; // also write everyday moments ahead
    }
  | {
      kind: "moment";
      summary: string;
      facts: string;
      persona: string;
      allowed: string[];
      recent: string[];
      seeds: string[];
      eraHints: string[];
      slot?: MomentSlot; // the pool event the engine scheduled; missing for a free "personal" moment
      thread?: string; // a follow-up that is due
      episodes?: boolean;
    }
  | { kind: "classify"; text: string; options: { id: string; label: string }[]; allowed?: string[] }
  | { kind: "ending"; summary: string; persona: string; profile: unknown; turningPoint: unknown; deathAge: number };

// How long the player waits for the narrator before falling back to templates. The opening and ending
// write the most (about 8-10s normally), so they get more room than a scene or a classification.
// The server uses the same budget, so it stops (and skips a retry) once the player has stopped waiting.
export const NARRATE_TIMEOUT_MS: Record<NarrateRequest["kind"], number> = {
  opening: 25_000,
  ending: 25_000,
  scene: 15_000,
  moment: 20_000, // writes a whole choice with outcomes, so a little longer than a scene
  classify: 10_000,
};
