import type { MetadataRoute } from "next";
import { cachedList } from "@/lib/boardCache";
import { boardConfigured, type Memoir } from "@/lib/memoirs";
import type { Region } from "@/lib/region";

const site = "https://whatif.damoai.net";
const languages = { ko: `${site}/`, en: `${site}/en`, "x-default": `${site}/` };
const boards = { ko: `${site}/board`, en: `${site}/en/board` };

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

// Public pages: the start screens, the memoir boards, their halls of fame and their newest posts. Play state lives in the browser.
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
    ...(["about", "privacy"] as const).flatMap((page) => [
      { url: `${site}/${page}`, changeFrequency: "yearly" as const, priority: 0.4, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
      { url: `${site}/en/${page}`, changeFrequency: "yearly" as const, priority: 0.3, alternates: { languages: { ko: `${site}/${page}`, en: `${site}/en/${page}` } } },
    ]),
    ...kr.map((m) => post("/board", m)),
    ...us.map((m) => post("/en/board", m)),
  ];
}
