// The memoir board as pages of its own (/board, /board/<id>, and /en/... for the American board), drawn on the server
// so they can be found in search and shared by link. The board window inside the game (Board.tsx) reads the same posts.
import Link from "next/link";
import { cachedList, cachedPost } from "@/lib/boardCache";
import { boardConfigured, type Memoir } from "@/lib/memoirs";
import { countryFor, type Lang } from "@/lib/region";
import { ReportButton } from "./Board";
import { RecordGrid, RecordLine, tr } from "./BoardRecords";

export const PER_PAGE = 10;
export const boardPath = (lang: Lang) => (lang === "en" ? "/en/board" : "/board");
const homePath = (lang: Lang) => (lang === "en" ? "/en" : "/");

const dateText = (lang: Lang, iso: string) => {
  const d = new Date(iso);
  return lang === "en" ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};
const byline = (lang: Lang, m: Memoir) => [m.penName || tr(lang, "익명"), lang === "en" ? `died at ${m.deathAge}` : `${m.deathAge}세`, dateText(lang, m.createdAt)].join(" · ");

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

export function BoardIntro({ lang }: { lang: Lang }) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="text-3xl font-bold">{tr(lang, "회고록 게시판")}</h1>
      <p className="text-stone-600 dark:text-stone-400">{tr(lang, "다른 선택을 하고 끝까지 살아 본 사람들의 회고록과 인생 기록이에요.")}</p>
    </header>
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
      <ReportButton id={post.id} lang={lang} />
    </article>
  );
}

export { Shell as BoardShell };
