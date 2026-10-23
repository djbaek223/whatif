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
