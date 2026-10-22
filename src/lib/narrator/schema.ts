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
    employed: z.boolean(),
    jobTitle: z.string().describe("직업이 없으면 빈 문자열"),
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
        original: z.boolean().describe("실제로 했던 선택이면 true. 정확히 하나만 true"),
        education: z
          .enum(["same", "highschool", "university", "graduate", "done"])
          .describe("이 선택 직후의 학업 상태. 바뀌지 않으면 same. 예: 대학 진학 → university, 재수 → highschool, 취업 → done"),
      }),
    )
    .describe("3~4개. 실제 했던 선택 하나와, 다른 길 2~3개"),
});
export type OpeningResult = z.infer<typeof OpeningSchema>;

export const SceneSchema = z.object({
  scene: z.string().describe("이 순간을 2인칭으로 그리는 2~4문장. 시대와 이 사람의 상황을 반영."),
  labels: z.array(z.object({ id: z.string(), label: z.string().describe("이 사람에게 맞춘 선택지 문장, 30자 이내") })),
});
export type SceneResult = z.infer<typeof SceneSchema>;

export const ClassifySchema = z.object({
  choiceId: z.string().describe("사용자의 글과 가장 가까운 선택지 id"),
});
export type ClassifyResult = z.infer<typeof ClassifySchema>;

export const EndingSchema = z.object({
  title: z.string().describe("이 인생의 제목, 20자 이내"),
  memoir: z.string().describe("1인칭 회고록. 4~6문단. 문단 사이는 빈 줄."),
  epitaph: z.string().describe("묘비명 한 줄"),
  comparison: z.string().describe("실제 삶과 이 다른 가지의 삶을 비교하는 2~3문장. 실제 삶 정보가 없으면 변곡점의 선택 중심으로."),
});
export type EndingResult = z.infer<typeof EndingSchema>;

export type NarrateRequest =
  | { kind: "opening"; profile: unknown; turningPoint: unknown; eraHints: string[]; age: number }
  | { kind: "scene"; summary: string; persona: string; title: string; intro: string; options: { id: string; label: string }[]; eraHints: string[] }
  | { kind: "classify"; text: string; options: { id: string; label: string }[] }
  | { kind: "ending"; summary: string; persona: string; profile: unknown; turningPoint: unknown; deathAge: number };
