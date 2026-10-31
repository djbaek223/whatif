"use client";

import { useEffect, useState } from "react";
import { newsList } from "@/lib/news";
import { Spinner } from "./ui";
import { L } from "@/lib/i18n";
import { isEn } from "@/lib/region";
import { ymText } from "@/lib/format";

/** The few real headlines just before a month, oldest first, to show while the opening is written. */
function headlinesBefore(date: string, limit = 5) {
  const [y, m] = date.split("-").map(Number);
  const end = y * 12 + (m - 1);
  return newsList().filter((n) => n.cat !== "가상" && n.mi <= end && n.mi > end - 24)
    .slice(-limit)
    .map((n) => ({ when: ymText(`${Math.floor(n.mi / 12)}-${(n.mi % 12) + 1}`), text: n.text }));
}

export function OpeningWait({ date, ai }: { date: string; ai: boolean }) {
  const [items] = useState(() => headlinesBefore(date));
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 3000);
    return () => clearInterval(t);
  }, [items.length]);
  const item = items[i];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center" role="status">
      <Spinner className="h-10 w-10 border-stone-300 border-t-indigo-500 dark:border-stone-700 dark:border-t-indigo-400" />
      <h1 className="text-lg font-semibold">{L("그날로 돌아가는 중...")}</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">{isEn() ? `Picturing the air of ${ymText(date)}.` : `${ymText(date)}의 공기를 떠올리고 있어요.`}</p>
      {item && (
        <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{L("그때 세상은 ·")} {item.when}</p>
          <p key={i} className="mt-1 text-[15px] leading-relaxed motion-safe:animate-[fadein_400ms_ease-out]">
            {item.text}
          </p>
          {items.length > 1 && (
            <div className="mt-2 flex gap-1.5" aria-hidden>
              {items.map((_, j) => (
                <span key={j} className={`h-1.5 w-1.5 rounded-full ${j === i ? "bg-indigo-500" : "bg-stone-200 dark:bg-stone-700"}`} />
              ))}
            </div>
          )}
        </div>
      )}
      {ai && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-[13px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{L("응답이 늦어지면 기본 문장으로 바로 시작해요.")}</p>}
    </div>
  );
}

export function EndingWait() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center" role="status">
      <Spinner className="h-8 w-8 border-stone-300 border-t-indigo-500 dark:border-stone-700 dark:border-t-indigo-400" />
      <h1 className="font-semibold">{L("회고록을 쓰는 중...")}</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">{L("지나온 선택들을 하나씩 돌아보고 있어요.")}</p>
    </div>
  );
}

/** After this long the wait is called out as slow, and the player is told the story carries on without it. */
export const SCENE_LATE_MS = 9000;

/**
 * Shown in the choice sheet while the narrator writes a scene. The request is one call that reports no progress,
 * so the bar is indeterminate and there are no made-up steps; the skeleton below has the shape of what arrives
 * (a few lines of scene, then the options). Screen readers get one status line from the sheet; this is all visual.
 */
export function SceneWait({ elapsed }: { elapsed: number }) {
  const late = elapsed >= SCENE_LATE_MS;
  return (
    <div aria-hidden className="mt-2 space-y-3">
      <div className="overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900/70 dark:bg-indigo-950/40">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-stone-900">
            <svg viewBox="0 0 32 32" className="h-7 w-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path className="pen-stroke" pathLength={1} d="M4 24c3-5 5-5 7-2s4 3 6-1 4-4 6-1" strokeWidth={2} />
              <g className="pen-nib">
                <path d="M21 5l5 5-9 9h-5v-5z" strokeWidth={1.8} className="fill-white dark:fill-stone-900" />
                <path d="M19 7l5 5" strokeWidth={1.8} />
              </g>
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{late ? L("조금 더 걸리고 있어요") : L("다음 장면이 펼쳐지고 있어요")}</p>
            <p key={late ? "late" : "wait"} className="text-xs text-indigo-800/80 motion-safe:animate-[fadein_400ms_ease-out] dark:text-indigo-200/80">
              {late ? L("늦어지면 기본 이야기로 바로 이어가요") : L("지금까지의 삶을 바탕으로 이 순간을 쓰고 있어요")}
            </p>
          </div>
        </div>
        <div className="indeterminate mt-3 h-1 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
          <span className="block h-full w-1/3 rounded-full bg-indigo-500 dark:bg-indigo-400" />
        </div>
      </div>
      <div className="space-y-2 px-0.5">
        <div className="shimmer h-3 rounded-full" />
        <div className="shimmer h-3 w-11/12 rounded-full" />
        <div className="shimmer h-3 w-3/5 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-14 rounded-xl" />
      </div>
    </div>
  );
}
