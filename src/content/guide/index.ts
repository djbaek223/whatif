import type { Lang } from "@/lib/region";
import { ERA } from "./era";
import { EN_ERA } from "./en/era";
import { EN_PLAY } from "./en/play";
import { EN_TURNING } from "./en/turning";
import { EN_WHATIF } from "./en/whatif";
import { PLAY } from "./play";
import { TURNING } from "./turning";
import type { Article, GuideCategory } from "./types";
import { WHATIF } from "./whatif";

export type { Article, Block, GuideCategory } from "./types";

export type Category = { id: GuideCategory; title: string; lead: string };

// The Korean guide is about Korean lives; the English guide is written for an American life (the US region), with the
// same four sections and the same number of articles, each paired with its Korean counterpart.
const CATEGORIES_BY_LANG: Record<Lang, Category[]> = {
  ko: [
    { id: "era", title: "시대별 한국 생활상", lead: "1970년대부터 2010년대까지, 그 시절 사람들이 마주한 학교와 일자리, 일상의 풍경." },
    { id: "turning", title: "인생의 변곡점", lead: "입시, 군대, 취업, 이직, 결혼, 집. 많은 사람이 실제로 마주하는 갈림길의 득과 실." },
    { id: "whatif", title: "만약 그때", lead: "후회와 '만약'을 다룬 심리학, 그리고 실제 시대 위에 세운 가상의 시나리오." },
    { id: "play", title: "What If 즐기기", lead: "변곡점 고르는 법, 성격이 반영되는 방식, 엔진과 AI의 역할, 회고록까지." },
  ],
  en: [
    { id: "era", title: "American life, decade by decade", lead: "From the 1970s to the 2010s: the schools, the jobs, the prices and the everyday scenes people lived through." },
    { id: "turning", title: "Life's turning points", lead: "College, the military, a first job, a job change, marriage, a house. What you give and get at the forks most people meet." },
    { id: "whatif", title: "What if", lead: "The psychology of regret and 'what if', and imagined scenarios set in real years." },
    { id: "play", title: "Playing What If", lead: "Choosing a turning point, how personality counts, what the engine and the AI each do, and the memoir." },
  ],
};

const ARTICLES_BY_LANG: Record<Lang, Article[]> = {
  ko: [...ERA, ...TURNING, ...WHATIF, ...PLAY],
  en: [...EN_ERA, ...EN_TURNING, ...EN_WHATIF, ...EN_PLAY],
};

/** The Korean guide, as most pages use it. */
export const CATEGORIES = CATEGORIES_BY_LANG.ko;
export const ARTICLES = ARTICLES_BY_LANG.ko;

export const categoriesIn = (lang: Lang) => CATEGORIES_BY_LANG[lang];
export const articlesIn = (lang: Lang) => ARTICLES_BY_LANG[lang];
export const articleBySlug = (slug: string, lang: Lang = "ko") => ARTICLES_BY_LANG[lang].find((a) => a.slug === slug);
export const categoryOf = (id: GuideCategory, lang: Lang = "ko") => CATEGORIES_BY_LANG[lang].find((c) => c.id === id)!;

/** Where an article lives in the other language's guide: English articles name their Korean counterpart in `pair`. */
export function pairOf(a: Article, lang: Lang): string | undefined {
  if (lang === "en") return a.pair;
  return ARTICLES_BY_LANG.en.find((x) => x.pair === a.slug)?.slug;
}
