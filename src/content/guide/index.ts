import { ERA } from "./era";
import { PLAY } from "./play";
import { TURNING } from "./turning";
import type { Article, GuideCategory } from "./types";
import { WHATIF } from "./whatif";

export type { Article, Block, GuideCategory } from "./types";

export const CATEGORIES: { id: GuideCategory; title: string; lead: string }[] = [
  { id: "era", title: "시대별 한국 생활상", lead: "1970년대부터 2010년대까지, 그 시절 사람들이 마주한 학교와 일자리, 일상의 풍경." },
  { id: "turning", title: "인생의 변곡점", lead: "입시, 군대, 취업, 이직, 결혼, 집. 많은 사람이 실제로 마주하는 갈림길의 득과 실." },
  { id: "whatif", title: "만약 그때", lead: "후회와 '만약'을 다룬 심리학, 그리고 실제 시대 위에 세운 가상의 시나리오." },
  { id: "play", title: "What If 즐기기", lead: "변곡점 고르는 법, 성격이 반영되는 방식, 엔진과 AI의 역할, 회고록까지." },
];

export const ARTICLES: Article[] = [...ERA, ...TURNING, ...WHATIF, ...PLAY];

export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
export const categoryOf = (id: GuideCategory) => CATEGORIES.find((c) => c.id === id)!;
