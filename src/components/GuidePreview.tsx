/* eslint-disable @next/next/no-html-link-for-pages -- links into the game are full page loads on purpose: the reading pages load the ad script, the game screens must not keep it. */
// The guide's links on the start screen (server-drawn, passed into Game), so the game's first page also leads to reading pages.
// Plain <a> links: the guide pages load the ad script, the start screen does not.
import { articleBySlug, type Article } from "@/content/guide";

const guidePath = (slug: string) => `/guide/${slug}`;

/** A few guide articles for the home screen, so the game's start page also links into the reading pages. */
export function GuidePreview() {
  const picks = ["imf-crisis", "regret-psychology", "military-timing", "korea-1980s", "mbti-and-choices", "buying-home"].map(articleBySlug).filter((x): x is Article => !!x);
  return (
    <section aria-labelledby="guide-preview" className="mt-10 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="guide-preview" className="text-lg font-bold">가이드: 그때 그 시절, 그 갈림길</h2>
        <a href="/guide" className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          전체 보기
        </a>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((a) => (
          <li key={a.slug}>
            <a href={guidePath(a.slug)} className="block h-full rounded-2xl border border-stone-200 bg-white p-4 hover:border-indigo-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-700">
              <span className="block font-semibold text-balance">{a.title}</span>
              <span className="mt-1 line-clamp-2 block text-sm text-stone-600 dark:text-stone-400">{a.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
