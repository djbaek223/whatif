import type { MetadataRoute } from "next";
import { cachedList } from "@/lib/boardCache";
import { articlesIn, pairOf } from "@/content/guide";
import { boardConfigured, type Memoir } from "@/lib/memoirs";
import type { Region } from "@/lib/region";
import { SITE_URL } from "@/lib/site";

const site = SITE_URL;
const languages = { ko: `${site}/`, en: `${site}/en`, "x-default": `${site}/` };
const boards = { ko: `${site}/board`, en: `${site}/en/board` };
const guides = { ko: `${site}/guide`, en: `${site}/en/guide` };

/** One guide article, with its counterpart in the other language's guide when it has one. */
function article(lang: "ko" | "en", slug: string, date: string, pair?: string): MetadataRoute.Sitemap[number] {
  const url = `${site}${lang === "en" ? "/en" : ""}/guide/${slug}`;
  const other = pair ? `${site}${lang === "en" ? "" : "/en"}/guide/${pair}` : undefined;
  const languages = other ? (lang === "en" ? { ko: other, en: url } : { ko: url, en: other }) : undefined;
  return { url, lastModified: date, changeFrequency: "monthly", priority: lang === "en" ? 0.6 : 0.7, ...(languages ? { alternates: { languages } } : {}) };
}

/** The newest posts on one board, for search engines; none when the board isn't set up or can't be read. */
async function recent(region: Region): Promise<Memoir[]> {
  if (!boardConfigured()) return [];
  const out: Memoir[] = [];
  try {
    for (let before = 0; before < 100; before += 10) {
      const page = await cachedList(region, before, 10);
      out.push(...page.items);
      if (!page.more) break;
    }
  } catch {}
  return out;
}

// Public pages: the start screens, the guide and its articles, the help pages, the memoir boards, their halls of fame and their newest posts. Play state lives in the browser.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [kr, us] = await Promise.all([recent("kr"), recent("us")]);
  const post = (path: string, m: Memoir) => ({ url: `${site}${path}/${m.id}`, lastModified: m.createdAt, changeFrequency: "monthly" as const, priority: 0.5 });
  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${site}/en`, changeFrequency: "weekly", priority: 0.9, alternates: { languages } },
    { url: boards.ko, changeFrequency: "daily", priority: 0.8, alternates: { languages: boards } },
    { url: boards.en, changeFrequency: "daily", priority: 0.7, alternates: { languages: boards } },
    { url: `${site}/board/hall`, changeFrequency: "daily", priority: 0.7, alternates: { languages: { ko: `${site}/board/hall`, en: `${site}/en/board/hall` } } },
    { url: `${site}/en/board/hall`, changeFrequency: "daily", priority: 0.6, alternates: { languages: { ko: `${site}/board/hall`, en: `${site}/en/board/hall` } } },
    { url: `${site}/guide`, changeFrequency: "weekly", priority: 0.8, alternates: { languages: guides } },
    { url: `${site}/en/guide`, changeFrequency: "weekly", priority: 0.7, alternates: { languages: guides } },
    ...articlesIn("ko").map((a) => article("ko", a.slug, a.date, pairOf(a, "ko"))),
    ...articlesIn("en").map((a) => article("en", a.slug, a.date, pairOf(a, "en"))),
    ...(["how-to-play", "faq", "contact"] as const).flatMap((page) => [
      { url: `${site}/${page}`, changeFrequency: "monthly" as const, priority: 0.5, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
      { url: `${site}/en/${page}`, changeFrequency: "monthly" as const, priority: 0.4, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
    ]),
    ...(["about", "terms", "privacy"] as const).flatMap((page) => [
      { url: `${site}/${page}`, changeFrequency: "yearly" as const, priority: 0.4, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
      { url: `${site}/en/${page}`, changeFrequency: "yearly" as const, priority: 0.3, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
    ]),
    ...kr.map((m) => post("/board", m)),
    ...us.map((m) => post("/en/board", m)),
  ];
}
