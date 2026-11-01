"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { L } from "@/lib/i18n";
import { countryFor, type Lang } from "@/lib/region";
import type { PublishedMemoir } from "./Board";
import { BadgeRow, RecordLine } from "./BoardRecords";

/**
 * The start screen's look at the memoir board: the three newest posts on the board of the shown language, and a way
 * into the whole board. Hidden while the board isn't set up; once posts collect likes it can switch to the most liked.
 */
export function BoardPreview({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<PublishedMemoir[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/memoirs?region=${countryFor(lang)}&size=3`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; items?: PublishedMemoir[] }) => live && setItems(d.ok ? (d.items ?? []) : null))
      .catch(() => live && setItems(null));
    return () => {
      live = false;
    };
  }, [lang]);
  if (!items) return null;
  const base = lang === "en" ? "/en/board" : "/board";
  return (
    <section aria-labelledby="board-preview" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="board-preview" className="text-base font-bold">
          {L("다른 사람들의 인생")}
        </h2>
        <Link href={base} className="text-sm font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
          {L("회고록 게시판 보기")} →
        </Link>
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`${base}/${m.id}`} className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-indigo-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-500">
                <span className="block font-semibold">{m.title}</span>
                {m.epitaph && <span className="mt-0.5 block truncate text-sm italic text-stone-600 dark:text-stone-400">&ldquo;{m.epitaph}&rdquo;</span>}
                <RecordLine records={m.records} lang={lang} />
                <span className="mt-1 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span>
                    {m.penName || L("익명")} · {L`${m.deathAge}세`}
                  </span>
                  {m.records && <BadgeRow ids={m.records.badges} lang={lang} max={5} />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {L("아직 올라온 회고록이 없어요. 인생을 끝까지 살고 첫 회고록을 올려 보세요.")}
        </p>
      )}
    </section>
  );
}
