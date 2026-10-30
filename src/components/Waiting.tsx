"use client";

import { useEffect, useState } from "react";
import { NEWS } from "@/lib/news";
import { Spinner } from "./ui";

/** The few real headlines just before a month, oldest first, to show while the opening is written. */
function headlinesBefore(date: string, limit = 5) {
  const [y, m] = date.split("-").map(Number);
  const end = y * 12 + (m - 1);
  return NEWS.filter((n) => n.cat !== "가상" && n.mi <= end && n.mi > end - 24)
    .slice(-limit)
    .map((n) => ({ when: `${Math.floor(n.mi / 12)}년 ${(n.mi % 12) + 1}월`, text: n.text }));
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
      <h1 className="text-lg font-semibold">그날로 돌아가는 중...</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">{date.replace("-", "년 ").replace(/년 0?/, "년 ")}월의 공기를 떠올리고 있어요.</p>
      {item && (
        <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">그때 세상은 · {item.when}</p>
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
      {ai && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-[13px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">응답이 늦어지면 기본 문장으로 바로 시작해요.</p>}
    </div>
  );
}

export function EndingWait() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center" role="status">
      <Spinner className="h-8 w-8 border-stone-300 border-t-indigo-500 dark:border-stone-700 dark:border-t-indigo-400" />
      <h1 className="font-semibold">회고록을 쓰는 중...</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">지나온 선택들을 하나씩 돌아보고 있어요.</p>
    </div>
  );
}

const SCENE_STEPS = [
  { at: 0, label: "순간 떠올리기", line: "그때의 공기와 사람들을 떠올리고 있어요" },
  { at: 2500, label: "장면 쓰기", line: "장면을 한 줄씩 쓰고 있어요" },
  { at: 5500, label: "선택지 다듬기", line: "고를 수 있는 길을 다듬고 있어요" },
];
/** After this long the wait is called out as slow, and the player is told the story carries on without it. */
export const SCENE_LATE_MS = 9000;

/**
 * Shown in the choice panel while the narrator writes a scene. The steps follow elapsed time (the request
 * doesn't report progress), so the bar eases toward the end and never claims to be done.
 * Screen readers get one status line from the panel instead of each step change; this is all visual.
 */
export function SceneWait({ elapsed }: { elapsed: number }) {
  const step = SCENE_STEPS.findLastIndex((s) => elapsed >= s.at);
  const late = elapsed >= SCENE_LATE_MS;
  const progress = Math.min(0.92, 1 - Math.exp(-elapsed / 5000));

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
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{late ? "조금 더 걸리고 있어요" : "장면을 그리는 중"}</p>
            <p key={late ? "late" : step} className="truncate text-xs text-indigo-800/80 motion-safe:animate-[fadein_400ms_ease-out] dark:text-indigo-200/80">
              {late ? "늦어지면 기본 이야기로 바로 이어가요" : SCENE_STEPS[step].line}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/60">
          <div
            className="h-full origin-left rounded-full bg-indigo-500 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-linear dark:bg-indigo-400"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <ol className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium">
          {SCENE_STEPS.map((s, i) => (
            <li key={s.label} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className={`h-px w-3 shrink-0 ${i <= step ? "bg-indigo-400" : "bg-indigo-200 dark:bg-indigo-800"}`} />}
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  i < step ? "bg-indigo-500 text-white dark:bg-indigo-400 dark:text-indigo-950" : i === step ? "bg-white text-indigo-700 ring-2 ring-indigo-500 dark:bg-stone-900 dark:text-indigo-300 dark:ring-indigo-400" : "bg-indigo-100 text-stone-500 dark:bg-indigo-900 dark:text-stone-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`truncate ${i === step ? "text-indigo-900 dark:text-indigo-100" : i < step ? "text-indigo-700/80 dark:text-indigo-300/80" : "text-stone-500 dark:text-stone-400"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-2 px-0.5">
        <div className="shimmer h-3 rounded-full" />
        <div className="shimmer h-3 w-11/12 rounded-full" />
        <div className="shimmer h-3 w-3/5 rounded-full" />
      </div>
    </div>
  );
}
