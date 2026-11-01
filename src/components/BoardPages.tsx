// The memoir board as pages of its own (/board, /board/<id>, and /en/... for the American board), drawn on the server
// so they can be found in search and shared by link. The board window inside the game (Board.tsx) reads the same posts.
import Link from "next/link";
import { cachedList, cachedPost, cachedTop } from "@/lib/boardCache";
import { RANK_CATS, boardConfigured, type Memoir, type Period, type RankCat } from "@/lib/memoirs";
import { countryFor, type Lang } from "@/lib/region";
import { LikeButton, ReportButton } from "./Board";
import { RecordGrid, RecordLine, money, tr } from "./BoardRecords";

export const PER_PAGE = 10;
export const boardPath = (lang: Lang) => (lang === "en" ? "/en/board" : "/board");
const homePath = (lang: Lang) => (lang === "en" ? "/en" : "/");

const dateText = (lang: Lang, iso: string) => {
  const d = new Date(iso);
  return lang === "en" ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};
const byline = (lang: Lang, m: Memoir) =>
  [m.penName || tr(lang, "익명"), lang === "en" ? `died at ${m.deathAge}` : `${m.deathAge}세`, dateText(lang, m.createdAt), m.likes ? `❤ ${m.likes}` : ""].filter(Boolean).join(" · ");

function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <main lang={lang} className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <nav className="mb-6 flex items-center justify-between gap-3 text-sm">
        <Link href={homePath(lang)} className="font-semibold tracking-widest text-indigo-600 dark:text-indigo-400">
          WHAT IF
        </Link>
        <Link href={homePath(lang)} className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">
          {tr(lang, "나도 살아보기")}
        </Link>
      </nav>
      {children}
    </main>
  );
}

export function BoardIntro({ lang, tab }: { lang: Lang; tab: "latest" | "hall" }) {
  const tabs = [
    ["latest", tr(lang, "최신 글"), boardPath(lang)],
    ["hall", tr(lang, "명예의 전당"), `${boardPath(lang)}/hall`],
  ] as const;
  return (
    <header className="mb-6 space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{tr(lang, "회고록 게시판")}</h1>
        <p className="text-stone-600 dark:text-stone-400">{tr(lang, "다른 선택을 하고 끝까지 살아 본 사람들의 회고록과 인생 기록이에요.")}</p>
      </div>
      <nav className="flex gap-1 border-b border-stone-200 dark:border-stone-800">
        {tabs.map(([id, label, href]) => (
          <Link
            key={id}
            href={href}
            aria-current={tab === id ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === id ? "border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100" : "border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/** Category names in both languages (kept here, not in the shared dictionary, where "기부" already means "donation"). */
export const CAT_LABELS: Record<RankCat, Record<Lang, string>> = {
  wealth: { ko: "자산", en: "Wealth" },
  happiness: { ko: "행복", en: "Happiness" },
  giving: { ko: "기부", en: "Giving" },
  longevity: { ko: "장수", en: "Longevity" },
  badges: { ko: "배지", en: "Badges" },
};

/** A category's number as the hall of fame shows it. */
export function rankText(lang: Lang, cat: RankCat, value: number): string {
  switch (cat) {
    case "wealth":
    case "giving":
      return money(lang, value);
    case "happiness":
      return lang === "en" ? `avg ${value}` : `평균 ${value}`;
    case "longevity":
      return lang === "en" ? `age ${value}` : `${value}세`;
    case "badges":
      return lang === "en" ? `${value} badges` : `${value}개`;
  }
}

/** The hall of fame: the top ten of one category, this week or of all time. */
export async function HallOfFame({ lang, cat, period }: { lang: Lang; cat: RankCat; period: Period }) {
  const base = `${boardPath(lang)}/hall`;
  const href = (c: RankCat, p: Period) => `${base}?cat=${c}${p === "all" ? "&period=all" : ""}`;
  const pill = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-semibold ${on ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"}`;
  let rows: Awaited<ReturnType<typeof cachedTop>> | null = null;
  if (boardConfigured()) rows = await cachedTop(countryFor(lang), cat, period).catch(() => null);
  return (
    <section className="space-y-4">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {RANK_CATS.map((c) => (
          <Link key={c} href={href(c, period)} aria-current={c === cat ? "page" : undefined} className={`shrink-0 ${pill(c === cat)}`}>
            {CAT_LABELS[c][lang]}
          </Link>
        ))}
      </div>
      <div className="flex gap-3 text-sm">
        {(["week", "all"] as const).map((p) => (
          <Link key={p} href={href(cat, p)} aria-current={p === period ? "page" : undefined} className={p === period ? "font-semibold text-indigo-700 underline underline-offset-4 dark:text-indigo-300" : "text-stone-500 hover:text-stone-800 dark:text-stone-400"}>
            {p === "week" ? tr(lang, "이번 주") : tr(lang, "전체")}
          </Link>
        ))}
      </div>
      {!boardConfigured() ? (
        <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{tr(lang, "게시판이 아직 준비되지 않았어요.")}</p>
      ) : !rows ? (
        <p className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{tr(lang, "게시판을 불러오지 못했어요.")}</p>
      ) : !rows.length ? (
        <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{period === "week" ? tr(lang, "이번 주에는 아직 순위에 오른 인생이 없어요.") : tr(lang, "아직 순위에 오른 인생이 없어요.")}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map(({ rank, value, post }) => (
            <li key={post.id}>
              <Link href={`${boardPath(lang)}/${post.id}`} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 hover:border-indigo-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-500">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${rank <= 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"}`}>
                  {rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{post.title}</span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{byline(lang, post)}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{rankText(lang, cat, value)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-stone-500 dark:text-stone-400">{tr(lang, "인생 기록이 있는 글만 순위에 올라요. 이번 주 순위는 월요일에 새로 시작해요.")}</p>
    </section>
  );
}

/** One page of the board, newest first. `page` counts from 1. */
export async function BoardList({ lang, page }: { lang: Lang; page: number }) {
  if (!boardConfigured()) return <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{tr(lang, "게시판이 아직 준비되지 않았어요.")}</p>;
  let data: { items: Memoir[]; more: boolean };
  try {
    data = await cachedList(countryFor(lang), (page - 1) * PER_PAGE, PER_PAGE);
  } catch {
    return <p className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{tr(lang, "게시판을 불러오지 못했어요.")}</p>;
  }
  if (!data.items.length)
    return <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">{tr(lang, "아직 올라온 회고록이 없어요. 인생을 끝까지 살고 첫 회고록을 올려 보세요.")}</p>;
  const base = boardPath(lang);
  return (
    <>
      <ul className="space-y-3">
        {data.items.map((m) => (
          <li key={m.id}>
            <Link href={`${base}/${m.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 hover:border-indigo-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-500">
              <span className="block font-semibold text-balance">{m.title}</span>
              {m.epitaph && <span className="mt-0.5 block truncate text-sm italic text-stone-600 dark:text-stone-400">&ldquo;{m.epitaph}&rdquo;</span>}
              <RecordLine records={m.records} lang={lang} />
              <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">{byline(lang, m)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-between text-sm font-medium">
        {page > 1 ? <Link href={page === 2 ? base : `${base}?page=${page - 1}`} className="text-indigo-700 dark:text-indigo-300">← {tr(lang, "새 글")}</Link> : <span />}
        {data.more && <Link href={`${base}?page=${page + 1}`} className="text-indigo-700 dark:text-indigo-300">{tr(lang, "지난 글")} →</Link>}
      </div>
    </>
  );
}

export async function BoardPost({ lang, id }: { lang: Lang; id: string }) {
  const post = boardConfigured() ? await cachedPost(id).catch(() => null) : null;
  if (!post || post.region !== countryFor(lang))
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-stone-600 dark:text-stone-400">{tr(lang, "지워졌거나 없는 글이에요.")}</p>
        <Link href={boardPath(lang)} className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          {tr(lang, "게시판으로")}
        </Link>
      </div>
    );
  return (
    <article className="space-y-5">
      <Link href={boardPath(lang)} className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
        ← {tr(lang, "회고록 게시판")}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-balance">{post.title}</h1>
        <p className="text-xs text-stone-500 dark:text-stone-400">{byline(lang, post)}</p>
        {post.epitaph && <p className="pt-1 italic text-stone-600 dark:text-stone-400">&ldquo;{post.epitaph}&rdquo;</p>}
      </header>
      {post.records && <RecordGrid records={post.records} deathAge={post.deathAge} lang={lang} />}
      {post.memoir.split(/\n\s*\n/).map((para, i) => (
        <p key={i} className="leading-[1.8] whitespace-pre-line">
          {para}
        </p>
      ))}
      {post.status && (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {tr(lang, "마지막 모습")} · {post.status}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <LikeButton id={post.id} initial={post.likes ?? 0} lang={lang} />
        <ReportButton id={post.id} lang={lang} />
      </div>
    </article>
  );
}

export { Shell as BoardShell };
