"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { L } from "@/lib/i18n";
import { countryFor, type Lang } from "@/lib/region";
import type { PublishedMemoir } from "./Board";
import { BadgeRow, RecordLine } from "./BoardRecords";

/**
 * The start screen's look at the memoir board: the three newest posts on the board of the shown language (the three
 * most liked once three posts have three likes or more), and ways into the board and its hall of fame. Hidden while
 * the board isn't set up.
 */
export function BoardPreview({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<PublishedMemoir[] | null>(null);
  const [popular, setPopular] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/memoirs?region=${countryFor(lang)}&home=1`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; items?: PublishedMemoir[]; popular?: boolean }) => {
        if (!live) return;
        setItems(d.ok ? (d.items ?? []) : null);
        setPopular(!!d.popular);
      })
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
        <h2 id="board-preview" className="text-base font-extrabold sm:text-lg">
          {popular ? L("공감을 많이 받은 인생") : L("먼저 살아본 인생들")}
        </h2>
        <span className="flex shrink-0 gap-3 whitespace-nowrap text-sm font-semibold">
          <Link href={`${base}/hall`} className="text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
            {L("명예의 전당")}
          </Link>
          <Link href={base} className="text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
            {L("게시판")} →
          </Link>
        </span>
      </div>
      {items.length ? (
        // A row of tapes: swiped sideways on a phone, three across on a wide screen.
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {items.map((m) => (
            <li key={m.id} className="w-[78%] max-w-72 flex-none snap-start sm:w-auto sm:max-w-none">
              <Link
                href={`${base}/${m.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white hover:border-indigo-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-500"
              >
                <span className="flex items-center justify-between gap-2 bg-[#16122b] px-3.5 py-2 text-xs text-[#e4defc]">
                  <span className="truncate font-mono">
                    <span aria-hidden>▶ </span>
                    {m.penName || L("익명")}
                  </span>
                  <span className="flex-none tabular-nums">
                    {L`${m.deathAge}세`}
                    {!!m.likes && <> · ❤ {m.likes}</>}
                  </span>
                </span>
                <span className="flex flex-1 flex-col px-3.5 py-3">
                  <span className="block font-bold leading-snug">{m.title}</span>
                  {m.epitaph && <span className="mt-1 block truncate text-sm italic text-stone-600 dark:text-stone-400">&ldquo;{m.epitaph}&rdquo;</span>}
                  <RecordLine records={m.records} lang={lang} />
                  {m.records && (
                    <span className="mt-auto block pt-2">
                      <BadgeRow ids={m.records.badges} lang={lang} max={5} />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {L("아직 올라온 회고록이 없어요. 인생을 끝까지 살고 첫 회고록을 올려 보세요.")}
        </p>
      )}
    </section>
  );
}
