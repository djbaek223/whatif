/* eslint-disable @next/next/no-html-link-for-pages -- links into the game are full page loads on purpose: the reading pages load the ad script, the game screens must not keep it. */
// The 가이드 (reading pages): a list of articles and one page per article, drawn on the server so search engines and
// AdSense see the whole text. Articles live in src/content/guide. Every page here loads the AdSense script (ContentAds);
// links back into the game are plain <a> links, so the script never follows a visitor into the game screens.
import Link from "next/link";
import { Fragment } from "react";
import { ARTICLES, CATEGORIES, articleBySlug, categoryOf, type Article, type Block } from "@/content/guide";
import { SITE_URL } from "@/lib/site";
import { ContentAds } from "./ContentAds";
import { SiteFooter } from "./InfoPages";

export const guidePath = (slug?: string) => (slug ? `/guide/${slug}` : "/guide");

/** Pages that also carry reading content (and the ad script), so a client-side Link between them is fine. */
const CONTENT = /^\/(guide|about|how-to-play|faq|contact)(\/|$)/;

function SmartLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  if (CONTENT.test(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

const LINK = "font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-600 dark:text-indigo-300 dark:decoration-indigo-700";

/** **bold** and [text](/path) inside a paragraph or list item. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(p);
        if (bold) return <strong key={i} className="font-semibold text-stone-900 dark:text-stone-100">{bold[1]}</strong>;
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (link)
          return (
            <SmartLink key={i} href={link[2]} className={LINK}>
              {link[1]}
            </SmartLink>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  if (typeof b === "string") return <p className="leading-[1.85] text-stone-700 dark:text-stone-300"><Rich text={b} /></p>;
  if ("h2" in b) return <h2 className="pt-4 text-xl font-bold text-stone-900 dark:text-stone-100">{b.h2}</h2>;
  if ("h3" in b) return <h3 className="pt-1 text-base font-semibold text-stone-900 dark:text-stone-100">{b.h3}</h3>;
  if ("ul" in b)
    return (
      <ul className="list-disc space-y-2 pl-5 leading-[1.8] text-stone-700 marker:text-stone-400 dark:text-stone-300">
        {b.ul.map((t) => <li key={t}><Rich text={t} /></li>)}
      </ul>
    );
  if ("ol" in b)
    return (
      <ol className="list-decimal space-y-2 pl-5 leading-[1.8] text-stone-700 marker:text-stone-500 dark:text-stone-300">
        {b.ol.map((t) => <li key={t}><Rich text={t} /></li>)}
      </ol>
    );
  if ("note" in b)
    return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"><Rich text={b.note} /></p>;
  return (
    <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-stone-600 dark:border-indigo-800 dark:text-stone-400">
      <Rich text={b.quote} />
      {b.by && <footer className="mt-1 text-sm not-italic">— {b.by}</footer>}
    </blockquote>
  );
}

/** Roughly how long the article takes to read, at about 500 Korean characters a minute. */
export function readMinutes(a: Article): number {
  const text = a.body.map((b) => (typeof b === "string" ? b : JSON.stringify(b))).join("");
  return Math.max(3, Math.round(text.replace(/\s/g, "").length / 500));
}

const dateText = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
};

/** The frame of every reading page: top bar, the page, the footer, and the ad script. */
export function ContentShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main lang="ko" className={`mx-auto w-full flex-1 px-4 py-8 sm:py-12 ${wide ? "max-w-3xl" : "max-w-2xl"}`}>
      <nav className="mb-8 flex items-center justify-between gap-3 text-sm">
        <a href="/" className="font-semibold tracking-widest text-indigo-600 dark:text-indigo-400">
          WHAT IF
        </a>
        <div className="flex items-center gap-4">
          <Link href={guidePath()} className="font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white">
            가이드
          </Link>
          <a href="/" className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">
            나도 살아보기
          </a>
        </div>
      </nav>
      {children}
      <SiteFooter lang="ko" />
      <ContentAds />
    </main>
  );
}

function ArticleCard({ a }: { a: Article }) {
  return (
    <li>
      <Link href={guidePath(a.slug)} className="group block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-700">
        <h3 className="font-semibold text-balance text-stone-900 group-hover:text-indigo-700 dark:text-stone-100 dark:group-hover:text-indigo-300">{a.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{a.description}</p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{readMinutes(a)}분 읽기</p>
      </Link>
    </li>
  );
}

export function GuideIndex() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">What If 가이드</p>
        <h1 className="text-3xl font-bold text-balance">그때 그 시절, 그리고 그 갈림길</h1>
        <p className="leading-relaxed text-stone-600 dark:text-stone-400">
          What If는 과거의 한 순간으로 돌아가 다른 선택을 하고 그 인생을 끝까지 살아 보는 인생 시뮬레이터예요. 가이드에는 그 인생이 흘러가는 배경이 되는 시대 이야기, 많은 사람이 실제로 마주하는 갈림길의 득과 실, 후회와 ‘만약’에 관한 칼럼, 그리고 게임을 더 깊게 즐기는 방법을 모았어요. 모든 글은 기록된 사실과 연구를 바탕으로 직접 썼어요.
        </p>
      </header>
      <nav aria-label="가이드 분류" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-300 dark:hover:text-indigo-300">
            {c.title}
          </a>
        ))}
      </nav>
      {CATEGORIES.map((c) => (
        <section key={c.id} id={c.id} className="scroll-mt-6 space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{c.title}</h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">{c.lead}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ARTICLES.filter((a) => a.category === c.id).map((a) => (
              <ArticleCard key={a.slug} a={a} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function jsonLd(a: Article) {
  const url = `${SITE_URL}${guidePath(a.slug)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.date,
      dateModified: a.date,
      inLanguage: "ko",
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "What If", url: SITE_URL },
      publisher: { "@type": "Organization", name: "What If", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "What If", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "가이드", item: `${SITE_URL}/guide` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];
}

export function GuideArticle({ a }: { a: Article }) {
  const cat = categoryOf(a.category);
  const same = ARTICLES.filter((x) => x.category === a.category);
  const at = same.findIndex((x) => x.slug === a.slug);
  const prev = same[at - 1];
  const next = same[at + 1];
  const related = a.related.map(articleBySlug).filter((x): x is Article => !!x);
  return (
    <article className="space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(a)).replace(/</g, "\\u003c") }} />
      <nav aria-label="위치" className="text-sm text-stone-500 dark:text-stone-400">
        <Link href={guidePath()} className="hover:text-stone-800 dark:hover:text-stone-200">가이드</Link>
        <span aria-hidden> › </span>
        <Link href={`${guidePath()}#${cat.id}`} className="hover:text-stone-800 dark:hover:text-stone-200">{cat.title}</Link>
      </nav>
      <header className="space-y-3 border-b border-stone-200 pb-5 dark:border-stone-800">
        <h1 className="text-[1.75rem] leading-tight font-bold text-balance sm:text-3xl">{a.title}</h1>
        <p className="leading-relaxed text-stone-600 dark:text-stone-400">{a.description}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          What If 편집 · <time dateTime={a.date}>{dateText(a.date)}</time> · {readMinutes(a)}분 읽기
        </p>
      </header>
      <div className="space-y-4">
        {a.body.map((b, i) => (
          <BlockView key={i} b={b} />
        ))}
      </div>
      <aside className="rounded-2xl bg-indigo-50 p-5 dark:bg-indigo-950/40">
        <p className="font-semibold text-indigo-950 dark:text-indigo-100">그 순간으로 돌아가 다시 골라 볼까요?</p>
        <p className="mt-1 text-sm text-indigo-900/80 dark:text-indigo-200/80">What If에서 돌아가고 싶은 순간을 고르면, 다른 선택을 한 인생을 끝까지 살아 볼 수 있어요. 무료이고 로그인이 없어요.</p>
        <a href="/" className="mt-3 inline-block rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          What If 시작하기
        </a>
      </aside>
      {related.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-bold">함께 읽으면 좋은 글</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <ArticleCard key={r.slug} a={r} />
            ))}
          </ul>
        </section>
      )}
      {(prev || next) && (
        <nav aria-label="같은 분류의 다른 글" className="grid gap-3 border-t border-stone-200 pt-5 text-sm sm:grid-cols-2 dark:border-stone-800">
          {prev ? (
            <Link href={guidePath(prev.slug)} className="rounded-xl p-2 hover:bg-stone-100 dark:hover:bg-stone-800/60">
              <span className="block text-xs text-stone-500 dark:text-stone-400">← 이전 글</span>
              <span className="font-medium">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={guidePath(next.slug)} className="rounded-xl p-2 text-right hover:bg-stone-100 dark:hover:bg-stone-800/60">
              <span className="block text-xs text-stone-500 dark:text-stone-400">다음 글 →</span>
              <span className="font-medium">{next.title}</span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
