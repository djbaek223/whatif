"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SHARE, MILESTONE_ICON, summaryOf, shareText, type ShareParts } from "@/lib/playUi";
import type { LifeState } from "@/lib/types";
import { masked } from "./Board";
import { Button, StatBars } from "./ui";
import { L } from "@/lib/i18n";
import { ageText } from "@/lib/format";

/**
 * Life Summary: the life looked back on as a story, not a score. Who, from when to when, the work and the family
 * it went through, what was left, the gauges, and the turns that mattered most.
 */
export function LifeSummaryCard({ life }: { life: LifeState }) {
  const s = useMemo(() => summaryOf(life), [life]);
  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 id="summary-title" className="text-xs font-semibold text-stone-600 dark:text-stone-400">
        {L("이 삶을 돌아보며")}
      </h2>
      <p className="mt-1 text-lg font-bold">
        {s.name} <span className="font-normal text-stone-600 tabular-nums dark:text-stone-400">· {s.bornYear}–{s.lastYear}</span>
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-400">{L`변곡점 뒤로 ${s.years}년, ${s.age}세까지 살았어요.`}</p>

      <dl className="mt-4 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-stone-600 dark:text-stone-400">{L("마지막 모습")}</dt>
        <dd className="font-medium">
          {s.status}
          {s.degree && <span className="block text-xs font-normal text-stone-600 dark:text-stone-400">{L`학력 · ${s.degree}`}</span>}
        </dd>
        <dt className="text-stone-600 dark:text-stone-400">{L("남긴 자산")}</dt>
        <dd className="font-medium tabular-nums">{s.wealth}</dd>
        {s.work.length > 0 && (
          <>
            <dt className="text-stone-600 dark:text-stone-400">{L("일")}</dt>
            <dd>
              <ul className="space-y-0.5">
                {s.work.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {s.family.length > 0 && (
          <>
            <dt className="text-stone-600 dark:text-stone-400">{L("가족")}</dt>
            <dd>
              <ul className="space-y-0.5">
                {s.family.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>

      <div className="mt-4">
        <StatBars stats={life.stats} />
      </div>

      {s.milestones.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold text-stone-600 dark:text-stone-400">{L("가장 중요했던 순간들")}</h3>
          <ol className="mt-2 space-y-1.5">
            {s.milestones.map((m, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 font-semibold tabular-nums text-stone-600 dark:text-stone-400">{ageText(m.age)}</span>
                <span>
                  <span aria-hidden className="mr-1">
                    {MILESTONE_ICON[m.kind]}
                  </span>
                  {m.text}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

const PARTS: { key: keyof ShareParts; label: () => string }[] = [
  { key: "name", label: () => L("별명") },
  { key: "years", label: () => L("생애 연도와 나이") },
  { key: "line", label: () => L("한 줄 요약") },
  { key: "milestones", label: () => L("대표 순간 4개") },
  { key: "stats", label: () => L("능력치") },
  { key: "wealth", label: () => L("남긴 자산") },
];

/**
 * 내 인생 공유하기: a card made only of what the player ticks. The nickname and wealth start unticked, school and
 * real names are masked as on the memoir board, and the whole list of choices is never included.
 */
export function ShareDialog({ open, life, line, onClose }: { open: boolean; life: LifeState; line: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [parts, setParts] = useState<ShareParts>(DEFAULT_SHARE);
  const [done, setDone] = useState<"" | "copied" | "shared" | "failed">("");
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  const url = typeof window === "undefined" ? "https://whatif.damoai.net" : window.location.origin;
  const text = masked(shareText(life, line, parts, url), parts.name ? { ...life, profile: { ...life.profile, name: "" } } : life);

  const share = async () => {
    setDone("");
    try {
      if (navigator.share) {
        await navigator.share({ title: "What If", text });
        setDone("shared");
      } else {
        await navigator.clipboard.writeText(text);
        setDone("copied");
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setDone("failed");
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-[var(--foreground)] shadow-xl backdrop:bg-stone-950/40 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="space-y-4 p-5">
        <div>
          <h2 id="share-title" className="text-lg font-bold">
            {L("내 인생 공유하기")}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300">{L("카드에 넣을 것만 골라 주세요. 학교와 실명은 ○○로 가려져요.")}</p>
        </div>
        <fieldset className="grid grid-cols-2 gap-x-3">
          <legend className="sr-only">{L("공유할 항목")}</legend>
          {PARTS.map((p) => (
            <label key={p.key} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={parts[p.key]}
                onChange={(e) => {
                  setParts({ ...parts, [p.key]: e.target.checked });
                  setDone("");
                }}
              />
              {p.label()}
            </label>
          ))}
        </fieldset>
        <figure aria-label={L("공유 카드 미리보기")} className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-inner">
          <p className="text-[11px] font-semibold tracking-widest text-indigo-200">WHAT IF</p>
          <pre className="mt-2 font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
        </figure>
        <p role="status" className="min-h-5 text-sm text-stone-600 dark:text-stone-300">
          {done === "copied" ? L("복사했어요. 원하는 곳에 붙여 넣어 주세요.") : done === "shared" ? L("공유했어요.") : done === "failed" ? L("공유하지 못했어요. 다시 시도해 주세요.") : ""}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {L("닫기")}
          </Button>
          <Button type="button" className="flex-1" onClick={share}>
            {L("공유하기")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

