"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMi } from "@/lib/engine";
import { MILESTONE_ICON, milestonesOf, type Milestone } from "@/lib/playUi";
import type { LifeState } from "@/lib/types";
import { Button } from "./ui";
import { L } from "@/lib/i18n";
import { ageText } from "@/lib/format";

/**
 * 지나온 길: the turns this life took (school, work, marriage, children, home, retirement, rare moments), oldest
 * first with now marked. Picking one closes the sheet and scrolls the timeline to that month.
 */
export function MilestoneDialog({ open, life, onClose, onPick }: { open: boolean; life: LifeState; onClose: () => void; onPick: (m: Milestone) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [all, setAll] = useState(false);
  const items = useMemo(() => (open ? milestonesOf(life) : []), [open, life]);
  const shown = all ? items : items.filter((m) => m.major);
  const hidden = items.length - items.filter((m) => m.major).length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="milestones-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-stone-950/40 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="milestones-title" className="text-lg font-bold">
              {L("지나온 길")}
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300">{L("누르면 그 시점의 이야기로 이동해요.")}</p>
          </div>
          {hidden > 0 && (
            <div role="group" aria-label={L("보기")} className="flex shrink-0 rounded-full border border-stone-200 p-0.5 text-xs dark:border-stone-700">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={all === v}
                  onClick={() => setAll(v)}
                  className={`min-h-9 rounded-full px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${all === v ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "text-stone-600 dark:text-stone-300"}`}
                >
                  {v ? L("전체") : L("주요 사건")}
                </button>
              ))}
            </div>
          )}
        </div>
        <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[19px] before:w-0.5 before:bg-indigo-100 dark:before:bg-indigo-950">
          {shown.map((m, i) => {
            const now = m.kind === "now";
            return (
              <li key={`${m.mi}-${i}`}>
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  aria-current={now ? "step" : undefined}
                  className="relative flex min-h-11 w-full items-start gap-3 rounded-lg px-1.5 py-1.5 text-left hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-stone-800"
                >
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${now ? "bg-indigo-600 text-white dark:bg-indigo-500" : m.kind === "rare" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-white ring-2 ring-indigo-200 dark:bg-stone-900 dark:ring-indigo-900"}`}
                  >
                    {MILESTONE_ICON[m.kind]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-stone-600 tabular-nums dark:text-stone-400">
                      {ageText(m.age)} · {formatMi(m.mi)}
                    </span>
                    <span className={`block text-sm ${now ? "font-bold" : "font-medium"}`}>{m.text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          {L("닫기")}
        </Button>
      </div>
    </dialog>
  );
}
